import { decodeSeal } from './certificate';
import type { RoundSummary, SealInfo } from './types';

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

  return {
    baseUrl: root,

    async getShards(signal) {
      const answer = await request('/config/shards', { method: 'GET' }, signal);
      if (answer.status !== 200) throw new GatewayError('http', `/config/shards: HTTP ${answer.status}`);
      return parseShards(answer.body);
    },

    async getBlock(shardId, block, signal) {
      const answer = await request(
        '/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: ++rpcId,
            method: 'get_block',
            params: { blockNumber: String(block), shardId },
          }),
        },
        signal,
      );
      if (answer.status !== 200) throw new GatewayError('http', `get_block: HTTP ${answer.status}`);
      const body = answer.body as { result?: unknown; error?: { message?: string; data?: unknown } } | null;
      if (body?.error) {
        if (body.error.data === BLOCK_NOT_FOUND) return null;
        throw new GatewayError('rpc', `get_block: ${body.error.message ?? 'error'}`);
      }
      return parseBlockResult(body?.result, shardId);
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
