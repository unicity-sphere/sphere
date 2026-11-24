import { GatewayError, type GatewayClient, type NetworkStatusPayload } from './gatewayClient';
import type { RoundStore } from './roundStore';
import type { FeedSource, RoundSummary } from './types';

/**
 * Feeds fill a RoundStore from a gateway. The UI never talks to the gateway:
 * it reads the store, so swapping the source changes nothing above this file.
 *
 * - `polling`: what every gateway supports today. One `get_block "latest"` per
 *   shard per interval, each shard on its own loop so a slow shard never holds
 *   the others back, plus a bounded fetch of the indices it skipped.
 * - `status-endpoint`: the gateway's cached `GET /network/status`
 *   (aggregator-subscription#99). One request per interval for every shard,
 *   served from the gateway's memory, so viewers add no load upstream.
 *
 * `startNetworkFeed` probes the endpoint once and falls back to polling when
 * the gateway does not serve it, or stops serving it (a rollback answers 404),
 * or keeps failing. Polling never depended on the endpoint, so a broken
 * endpoint must not read as a broken network.
 */

export interface Feed {
  stop(): void;
}

export interface FeedOptions {
  readonly intervalMs?: number;
  /** Blocks fetched per shard behind the latest when a shard is first seen. */
  readonly initialBackfill?: number;
  /** Most skipped blocks fetched per shard per poll. */
  readonly maxBackfillPerTick?: number;
  readonly onSource?: (source: FeedSource) => void;
  /** Injectable for tests. */
  readonly setTimer?: (fn: () => void, ms: number) => unknown;
  readonly clearTimer?: (handle: unknown) => void;
}

const SHARD_LIST_RETRY_MS = 3_000;
const BACKFILL_CONCURRENCY = 4;
/** Most skipped blocks queued per shard; older ones are dropped (shown as unknown). */
const MAX_BACKLOG = 60;
const ENDPOINT_FIRST_RECENT = 120;
const ENDPOINT_MAX_RECENT = 300;
/** Consecutive endpoint failures before the page falls back to polling. */
const ENDPOINT_FAILURES_BEFORE_FALLBACK = 5;
/**
 * Blocks a shard's latest number must fall back by to count as a network reset.
 * A smaller dip (a leader failover answering a block behind) is not one.
 */
export const RESET_REGRESSION_BLOCKS = 100;

function isReset(latestIndex: number, known: number | null): boolean {
  return known !== null && latestIndex < known - RESET_REGRESSION_BLOCKS;
}

export function startNetworkFeed(client: GatewayClient, store: RoundStore, options: FeedOptions = {}): Feed {
  let inner: Feed | null = null;
  let stopped = false;
  const controller = new AbortController();

  void (async () => {
    let probe: NetworkStatusPayload | null = null;
    try {
      probe = await client.getNetworkStatus(ENDPOINT_FIRST_RECENT, controller.signal);
    } catch {
      probe = null; // unreachable or erroring endpoint: polling still works
    }
    if (stopped) return;
    const poll = () => {
      options.onSource?.('polling');
      inner = startPollingFeed(client, store, options);
    };
    if (probe) {
      applyStatusPayload(store, probe);
      options.onSource?.('status-endpoint');
      inner = startStatusEndpointFeed(client, store, {
        ...options,
        skipFirst: probe,
        onGiveUp: () => {
          inner?.stop();
          if (!stopped) poll();
        },
      });
    } else {
      poll();
    }
  })();

  return {
    stop() {
      stopped = true;
      controller.abort();
      inner?.stop();
    },
  };
}

export function startPollingFeed(client: GatewayClient, store: RoundStore, options: FeedOptions = {}): Feed {
  const intervalMs = options.intervalMs ?? 1_000;
  const initialBackfill = options.initialBackfill ?? 24;
  const maxBackfillPerTick = options.maxBackfillPerTick ?? 20;
  const setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = options.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));

  const controller = new AbortController();
  const { signal } = controller;
  const timers = new Set<unknown>();
  let stopped = false;

  const later = (fn: () => void, ms: number) => {
    const handle = setTimer(() => {
      timers.delete(handle);
      if (!stopped) fn();
    }, ms);
    timers.add(handle);
  };

  // Skipped blocks are fetched by a per-shard background queue, newest first, so a
  // slow or failing history fetch never delays the live poll that health is judged on.
  // Each queue belongs to one chain generation; a reset makes it worthless.
  const backlog = new Map<string, { generation: number; indices: number[] }>();
  const draining = new Set<string>();

  const enqueue = (shardId: string, indices: readonly number[], generation: number) => {
    const existing = backlog.get(shardId);
    const queue = existing && existing.generation === generation ? existing.indices : [];
    for (const i of indices) if (!queue.includes(i)) queue.push(i);
    queue.sort((a, b) => b - a);
    if (queue.length > MAX_BACKLOG) queue.length = MAX_BACKLOG;
    backlog.set(shardId, { generation, indices: queue });
    void drain(shardId);
  };

  async function drain(shardId: string): Promise<void> {
    if (draining.has(shardId)) return;
    draining.add(shardId);
    try {
      for (let queue = backlog.get(shardId); !stopped && queue && queue.indices.length > 0; queue = backlog.get(shardId)) {
        if (queue.generation !== store.generation) {
          backlog.delete(shardId);
          break;
        }
        const batch = queue.indices.splice(0, BACKFILL_CONCURRENCY);
        const blocks = await Promise.all(batch.map((i) => client.getBlock(shardId, i, signal).catch(() => null)));
        if (stopped) return;
        store.ingest(
          blocks.filter((b): b is RoundSummary => b !== null),
          queue.generation,
        );
      }
    } finally {
      draining.delete(shardId);
    }
  }

  async function pollShard(shardId: string): Promise<void> {
    const started = Date.now();
    try {
      const generation = store.generation;
      const latest = await client.getBlock(shardId, 'latest', signal);
      if (stopped) return;
      store.recordSuccess(shardId);
      if (latest) {
        let known = store.latestIndex(shardId);
        let current = generation;
        if (generation !== store.generation) {
          // Another shard saw a reset while this answer was in flight: it may be the old chain's.
          known = null;
        } else if (isReset(latest.index, known)) {
          store.resetNetwork();
          backlog.clear();
          current = store.generation;
          known = null;
        }
        store.ingest([latest], current);
        const limit = known === null ? initialBackfill : maxBackfillPerTick;
        const from = Math.max(known === null ? latest.index - limit : known + 1, latest.index - limit, 0);
        const missing: number[] = [];
        for (let i = latest.index - 1; i >= from; i--) missing.push(i);
        if (missing.length > 0 && current === store.generation) enqueue(shardId, missing, current);
      }
    } catch (error) {
      if (stopped) return;
      store.recordFailure(shardId, describe(error));
    }
    later(() => void pollShard(shardId), Math.max(0, intervalMs - (Date.now() - started)));
  }

  async function begin(): Promise<void> {
    try {
      const shardIds = await client.getShards(signal);
      if (stopped) return;
      store.setFeedError(null);
      store.setShards(shardIds);
      for (const id of shardIds) void pollShard(id);
    } catch (error) {
      if (stopped) return;
      store.setFeedError(describe(error));
      later(() => void begin(), SHARD_LIST_RETRY_MS);
    }
  }

  void begin();
  return {
    stop() {
      stopped = true;
      controller.abort();
      for (const handle of timers) clearTimer(handle);
      timers.clear();
    },
  };
}

export function startStatusEndpointFeed(
  client: GatewayClient,
  store: RoundStore,
  options: FeedOptions & { skipFirst?: NetworkStatusPayload; onGiveUp?: () => void } = {},
): Feed {
  const setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = options.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  const controller = new AbortController();
  let stopped = false;
  let handle: unknown = null;
  let intervalMs = Math.max(options.skipFirst?.pollIntervalMs ?? options.intervalMs ?? 1_000, 500);
  let lastSuccess = options.skipFirst ? Date.now() : null;
  let failures = 0;

  async function tick(): Promise<void> {
    // Ask for enough rounds to cover the time since the last answer.
    const recent =
      lastSuccess === null ? ENDPOINT_FIRST_RECENT : Math.min(ENDPOINT_MAX_RECENT, Math.max(10, Math.ceil((Date.now() - lastSuccess) / 800) + 5));
    try {
      const payload = await client.getNetworkStatus(recent, controller.signal);
      if (stopped) return;
      if (!payload) {
        // No longer served (e.g. the gateway was rolled back): say nothing about the shards.
        if (options.onGiveUp) return options.onGiveUp();
        throw new GatewayError('http', '/network/status is no longer served');
      }
      applyStatusPayload(store, payload);
      lastSuccess = Date.now();
      failures = 0;
      intervalMs = Math.max(payload.pollIntervalMs, 500);
    } catch (error) {
      if (stopped) return;
      failures++;
      if (options.onGiveUp && failures >= ENDPOINT_FAILURES_BEFORE_FALLBACK) return options.onGiveUp();
      const message = describe(error);
      store.setFeedError(message);
      for (const shard of store.getSnapshot().shards) store.recordFailure(shard.shardId, message);
    }
    handle = setTimer(() => {
      if (!stopped) void tick();
    }, intervalMs);
  }

  if (options.skipFirst) {
    handle = setTimer(() => {
      if (!stopped) void tick();
    }, intervalMs);
  } else {
    void tick();
  }

  return {
    stop() {
      stopped = true;
      controller.abort();
      if (handle !== null) clearTimer(handle);
    },
  };
}

function applyStatusPayload(store: RoundStore, payload: NetworkStatusPayload): void {
  const ids = payload.shards.map((s) => s.shardId);
  const current = store.getSnapshot().shards.map((s) => s.shardId);
  if (ids.length !== current.length || ids.some((id, i) => id !== current[i])) store.setShards(ids);
  store.setFeedError(null);
  for (const shard of payload.shards) {
    // 'unknown': the gateway has no answer from this shard yet, which says nothing either way.
    if (shard.status === 'unreachable') store.recordFailure(shard.shardId, 'the gateway cannot reach this shard');
    else if (shard.status !== 'unknown') store.recordSuccess(shard.shardId);
    const newest = shard.rounds[0];
    if (newest && isReset(newest.index, store.latestIndex(shard.shardId))) store.resetNetwork();
    store.ingest(shard.rounds);
  }
}

function describe(error: unknown): string {
  if (error instanceof GatewayError) {
    switch (error.kind) {
      case 'timeout':
        return 'timed out';
      case 'network':
        return 'unreachable';
      default:
        return error.message;
    }
  }
  return error instanceof Error ? error.message : String(error);
}
