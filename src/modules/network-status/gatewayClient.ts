import { decodeSeal } from './certificate';
import type { AggregatorRecord, BlockDetail, RoundSummary, SealInfo } from './types';

/** The gateway answers a missing block with HTTP 200 and this JSON-RPC `error.data`. */
const BLOCK_NOT_FOUND = 'block not found';
const REQUEST_TIMEOUT_MS = 6_000;

export type GatewayErrorKind = 'network' | 'timeout' | 'http' | 'rpc' | 'malformed';

export class GatewayError extends Error {
  readonly kind: GatewayErrorKind;

  constructor(kind: GatewayErrorKind, message: string) {
    super(message);
    this.name = 'GatewayError';
    this.kind = kind;
  }
}

export type EndpointShardStatus = 'unknown' | 'ok' | 'stale' | 'unreachable';

/** `GET /network/status` v1 (unicitynetwork/aggregator-subscription#99), parsed. */
export interface NetworkStatusPayload {
  readonly generatedAt: number;
  readonly pollIntervalMs: number;
  readonly staleAfterMs: number;
  readonly shards: readonly {
    readonly shardId: string;
    readonly status: EndpointShardStatus;
    readonly rounds: readonly RoundSummary[];
  }[];
}

export interface GatewayClient {
  readonly baseUrl: string;
  getShards(signal?: AbortSignal): Promise<string[]>;
  /** `null` when the shard has no such block. */
  getBlock(shardId: string, block: number | 'latest', signal?: AbortSignal): Promise<RoundSummary | null>;
  /** `null` when this gateway does not serve the endpoint (404). */
  getNetworkStatus(recent: number, signal?: AbortSignal): Promise<NetworkStatusPayload | null>;
  /** The whole block, for the inspector; `null` when the shard has no such block. */
  getBlockDetail(shardId: string, index: number, signal?: AbortSignal): Promise<BlockDetail | null>;
  getBlockRecords(shardId: string, index: number, signal?: AbortSignal): Promise<AggregatorRecord[]>;
  /** `get_inclusion_proof.v2`: hex CBOR `[blockNumber, InclusionProof | non-inclusion]`, answered against the latest root. */
  getInclusionProof(stateId: string, signal?: AbortSignal): Promise<string>;
}

export function createGatewayClient(baseUrl: string, fetchImpl: typeof fetch = (...a) => fetch(...a)): GatewayClient {
  const root = baseUrl.replace(/\/+$/, '');
  let rpcId = 0;

  /**
   * One request, status and JSON body included, under ONE timeout: the timeout
   * and the caller's abort stay armed until the body has been read, so a gateway
   * that sends headers and then stalls cannot hang a poll loop.
   */
  async function request(path: string, init: RequestInit, signal?: AbortSignal): Promise<Answer> {
    const { signal: combined, dispose } = withTimeout(signal, REQUEST_TIMEOUT_MS);
    const failure = (error: unknown): unknown => {
      if (signal?.aborted) return error;
      if (combined.aborted) return new GatewayError('timeout', `${path} timed out`);
      return error instanceof GatewayError ? error : new GatewayError('network', `${path}: ${(error as Error).message}`);
    };
    try {
      let response: Response;
      try {
        response = await fetchImpl(`${root}${path}`, { ...init, signal: combined, cache: 'no-store' });
      } catch (error) {
        throw failure(error);
      }
      if (!response.ok) {
        response.body?.cancel().catch(() => undefined);
        return { status: response.status, body: undefined };
      }
      try {
        return { status: response.status, body: await untilAborted(response.json(), combined) };
      } catch (error) {
        if (combined.aborted) throw failure(error);
        throw new GatewayError('malformed', `${path}: response is not JSON`);
      }
    } finally {
      dispose();
    }
  }

  /** One JSON-RPC call; `null` when the gateway answered `block not found`. */
  async function rpc(method: string, params: Record<string, unknown>, signal?: AbortSignal): Promise<{ result: unknown } | null> {
    const answer = await request(
      '/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }),
      },
      signal,
    );
    if (answer.status !== 200) throw new GatewayError('http', `${method}: HTTP ${answer.status}`);
    const body = answer.body as { result?: unknown; error?: { message?: string; data?: unknown } } | null;
    if (body?.error) {
      if (body.error.data === BLOCK_NOT_FOUND) return null;
      throw new GatewayError('rpc', `${method}: ${body.error.message ?? 'error'}`);
    }
    return { result: body?.result };
  }

  return {
    baseUrl: root,

    async getShards(signal) {
      const answer = await request('/config/shards', { method: 'GET' }, signal);
      if (answer.status !== 200) throw new GatewayError('http', `/config/shards: HTTP ${answer.status}`);
      return parseShards(answer.body);
    },

    async getBlock(shardId, block, signal) {
      const answer = await rpc('get_block', { blockNumber: String(block), shardId }, signal);
      return answer && parseBlockResult(answer.result, shardId);
    },

    async getBlockDetail(shardId, index, signal) {
      const answer = await rpc('get_block', { blockNumber: String(index), shardId }, signal);
      if (!answer) return null;
      const block = parseBlockDetail(answer.result, shardId);
      // Shown and verified under the requested number, so it must BE that block.
      if (block.index !== index) throw new GatewayError('malformed', `get_block: asked for block ${index}, got ${block.index}`);
      return block;
    },

    async getBlockRecords(shardId, index, signal) {
      const answer = await rpc('get_block_records', { blockNumber: String(index), shardId }, signal);
      if (!answer) throw new GatewayError('rpc', 'get_block_records: block not found');
      return parseBlockRecords(answer.result);
    },

    async getInclusionProof(stateId, signal) {
      const answer = await rpc('get_inclusion_proof.v2', { stateId }, signal);
      const hex = answer?.result;
      if (typeof hex !== 'string' || hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
        throw new GatewayError('malformed', 'get_inclusion_proof.v2: not a hex proof');
      }
      return hex;
    },

    async getNetworkStatus(recent, signal) {
      const answer = await request(`/network/status?recent=${Math.max(0, Math.floor(recent))}`, { method: 'GET' }, signal);
      if (answer.status === 404) return null;
      if (answer.status !== 200) throw new GatewayError('http', `/network/status: HTTP ${answer.status}`);
      return parseNetworkStatus(answer.body);
    },
  };
}

interface Answer {
  readonly status: number;
  /** The parsed JSON body of a 2xx answer; never read for any other status. */
  readonly body: unknown;
}

function untilAborted<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

/** `/config/shards`: v2 `bftShardPrefixes` or legacy numeric `shardIds`, both kept as strings. */
export function parseShards(body: unknown): string[] {
  const value = body as { bftShardPrefixes?: unknown; shardIds?: unknown };
  const list = Array.isArray(value?.bftShardPrefixes) ? value.bftShardPrefixes : Array.isArray(value?.shardIds) ? value.shardIds : null;
  if (!list || list.length === 0) throw new GatewayError('malformed', '/config/shards: no shards listed');
  return list.map((id) => {
    if (typeof id !== 'string' && typeof id !== 'number') throw new GatewayError('malformed', '/config/shards: bad shard id');
    return String(id);
  });
}

export function parseBlockResult(result: unknown, shardId: string): RoundSummary {
  const value = result as { block?: Record<string, unknown>; totalCommitments?: unknown } | undefined;
  const block = value?.block;
  if (!block) throw new GatewayError('malformed', 'get_block: no block in result');
  const index = toCount(block.index);
  const createdAt = toCount(block.createdAt);
  const rootHash = block.rootHash;
  if (index === null || createdAt === null || typeof rootHash !== 'string') {
    throw new GatewayError('malformed', 'get_block: block is missing index, createdAt or rootHash');
  }
  return {
    shardId,
    index,
    createdAt,
    totalCommitments: toCount(value?.totalCommitments) ?? 0,
    rootHash,
    empty: rootHash === block.previousBlockHash,
    seal: typeof block.unicityCertificate === 'string' ? decodeSeal(block.unicityCertificate) : null,
  };
}

export function parseBlockDetail(result: unknown, shardId: string): BlockDetail {
  const summary = parseBlockResult(result, shardId);
  const block = (result as { block: Record<string, unknown> }).block;
  if (typeof block.previousBlockHash !== 'string') throw new GatewayError('malformed', 'get_block: block is missing previousBlockHash');
  return {
    shardId,
    index: summary.index,
    createdAt: summary.createdAt,
    rootHash: summary.rootHash,
    previousBlockHash: block.previousBlockHash,
    totalCommitments: summary.totalCommitments,
    empty: summary.empty,
    certificateHex: typeof block.unicityCertificate === 'string' && block.unicityCertificate !== '' ? block.unicityCertificate : null,
  };
}

/** Every record, or a `malformed` error: a record the page cannot read is never silently left out. */
export function parseBlockRecords(result: unknown): AggregatorRecord[] {
  const list = (result as { aggregatorRecords?: unknown } | null)?.aggregatorRecords;
  if (!Array.isArray(list)) throw new GatewayError('malformed', 'get_block_records: no aggregatorRecords');
  return list.map((raw, i) => {
    const record = raw as Record<string, unknown> | null;
    const data = record?.certificationData as Record<string, unknown> | undefined;
    const owner = data?.ownerPredicate as Record<string, unknown> | undefined;
    const fail = (field: string): never => {
      throw new GatewayError('malformed', `get_block_records: record ${i} has no readable ${field}`);
    };
    const hex = (value: unknown, field: string): string => (typeof value === 'string' && /^[0-9a-fA-F]*$/.test(value) && value.length % 2 === 0 ? value : fail(field));
    const count = (value: unknown, field: string): number => toCount(value) ?? fail(field);
    const expiresAt = data?.expiresAt === null || data?.expiresAt === undefined ? null : count(data.expiresAt, 'expiresAt');
    return {
      stateId: hex(record?.stateId, 'stateId'),
      transactionHash: hex(data?.transactionHash, 'transactionHash'),
      sourceStateHash: hex(data?.sourceStateHash, 'sourceStateHash'),
      ownerPredicate: {
        engine: count(owner?.engine, 'ownerPredicate.engine'),
        code: typeof owner?.code === 'string' ? owner.code : fail('ownerPredicate.code'),
        params: typeof owner?.params === 'string' ? owner.params : fail('ownerPredicate.params'),
      },
      witness: hex(data?.witness, 'witness'),
      expiresAt,
      referenceTime: count(record?.referenceTime, 'referenceTime'),
      aggregateRequestCount: record?.aggregateRequestCount === undefined ? 1 : count(record.aggregateRequestCount, 'aggregateRequestCount'),
      leafIndex: count(record?.leafIndex, 'leafIndex'),
      createdAt: count(record?.createdAt, 'createdAt'),
      blockNumber: count(record?.blockNumber, 'blockNumber'),
    };
  });
}

export function parseNetworkStatus(body: unknown): NetworkStatusPayload {
  const value = body as Record<string, unknown> | null;
  if (!value || value.version !== 1 || !Array.isArray(value.shards)) {
    throw new GatewayError('malformed', '/network/status: not a v1 payload');
  }
  return {
    generatedAt: toCount(value.generatedAt) ?? 0,
    pollIntervalMs: toCount(value.pollIntervalMs) ?? 1000,
    staleAfterMs: toCount(value.staleAfterMs) ?? 15_000,
    shards: value.shards.map((raw) => {
      const shard = raw as Record<string, unknown>;
      const shardId = String(shard.shardId ?? '');
      const status = (['ok', 'stale', 'unreachable', 'unknown'] as const).find((s) => s === shard.status) ?? 'unknown';
      const rounds = Array.isArray(shard.rounds) ? shard.rounds.flatMap((r) => parseStatusRound(r, shardId)) : [];
      return { shardId, status, rounds };
    }),
  };
}

function parseStatusRound(raw: unknown, shardId: string): RoundSummary[] {
  const round = raw as Record<string, unknown>;
  const index = toCount(round.index);
  const createdAt = toCount(round.createdAt);
  if (index === null || createdAt === null || typeof round.rootHash !== 'string') return [];
  const rootRound = toCount(round.rootRound);
  const certifiedAt = toCount(round.certifiedAt);
  const signers = Array.isArray(round.signers) && round.signers.every((s) => typeof s === 'string') ? [...(round.signers as string[])].sort() : null;
  const seal: SealInfo | null = rootRound !== null && certifiedAt !== null && signers ? { rootRound, certifiedAt, signers } : null;
  return [
    {
      shardId,
      index,
      createdAt,
      totalCommitments: toCount(round.totalCommitments) ?? 0,
      rootHash: round.rootHash,
      empty: round.empty === true,
      seal,
    },
  ];
}

/** A non-negative safe integer from a JSON number or decimal string, else `null`. */
function toCount(value: unknown): number | null {
  const n = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  return typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 ? n : null;
}

function withTimeout(signal: AbortSignal | undefined, ms: number): { signal: AbortSignal; dispose: () => void } {
  const controller = new AbortController();
  const onAbort = () => controller.abort(signal?.reason);
  if (signal?.aborted) controller.abort(signal.reason);
  else signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), ms);
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    },
  };
}
