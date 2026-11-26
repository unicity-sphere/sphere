import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startNetworkFeed, startPollingFeed } from '@/modules/network-status/feeds';
import { GatewayError, type GatewayClient, type NetworkStatusPayload } from '@/modules/network-status/gatewayClient';
import { RoundStore } from '@/modules/network-status/roundStore';
import type { RoundSummary } from '@/modules/network-status/types';

function block(shardId: string, index: number): RoundSummary {
  return {
    shardId,
    index,
    createdAt: 1_000_000 + index * 900,
    totalCommitments: 0,
    rootHash: `h${index}`,
    empty: true,
    seal: { rootRound: index * 3, certifiedAt: 1000 + index, signers: ['a', 'b', 'c', 'd'] },
  };
}

/** A gateway whose shards advance when told to; records every get_block it answers. */
class FakeGateway implements GatewayClient {
  readonly baseUrl = 'https://gateway.test';
  heights = new Map<string, number>([['0', 100], ['1', 100]]);
  calls: string[] = [];
  failing = new Set<string>();
  status: NetworkStatusPayload | null = null;
  statusCalls: number[] = [];

  async getShards() {
    return [...this.heights.keys()];
  }

  async getBlock(shardId: string, which: number | 'latest') {
    this.calls.push(`${shardId}:${which}`);
    if (this.failing.has(shardId)) throw new GatewayError('timeout', 'timed out');
    const height = this.heights.get(shardId)!;
    const index = which === 'latest' ? height : which;
    return index > height ? null : block(shardId, index);
  }

  async getBlockDetail(): Promise<never> {
    throw new Error('feeds never read block detail');
  }

  async getBlockRecords(): Promise<never> {
    throw new Error('feeds never read block records');
  }

  async getInclusionProof(): Promise<never> {
    throw new Error('feeds never read inclusion proofs');
  }

  async getNetworkStatus(recent: number) {
    this.statusCalls.push(recent);
    return this.status;
  }
}

describe('startPollingFeed', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fills a few rounds behind the latest on first sight, then fetches exactly the skipped ones', async () => {
    const gateway = new FakeGateway();
    const store = new RoundStore();
    const feed = startPollingFeed(gateway, store, { intervalMs: 1000, initialBackfill: 3 });
    await vi.advanceTimersByTimeAsync(0);
    expect(store.getSnapshot().shards.map((s) => s.latestIndex)).toEqual([100, 100]);
    expect(gateway.calls.filter((c) => c.startsWith('0:'))).toEqual(['0:latest', '0:99', '0:98', '0:97']);

    gateway.calls = [];
    gateway.heights.set('0', 102); // two rounds while we waited: 101 must be fetched too
    await vi.advanceTimersByTimeAsync(1000);
    expect(gateway.calls.filter((c) => c.startsWith('0:'))).toEqual(['0:latest', '0:101']);
    expect(store.latestIndex('0')).toBe(102);
    feed.stop();
  });

  it('caps the catch-up after a long absence instead of storming the gateway', async () => {
    const gateway = new FakeGateway();
    const store = new RoundStore();
    const feed = startPollingFeed(gateway, store, { intervalMs: 1000, initialBackfill: 0, maxBackfillPerTick: 5 });
    await vi.advanceTimersByTimeAsync(0);
    gateway.calls = [];
    gateway.heights.set('0', 200);
    await vi.advanceTimersByTimeAsync(1000);
    expect(gateway.calls.filter((c) => c.startsWith('0:'))).toEqual(['0:latest', '0:199', '0:198', '0:197', '0:196', '0:195']);
    feed.stop();
  });

  it('keeps polling healthy shards while one shard fails, and reports the failing one', async () => {
    const gateway = new FakeGateway();
    gateway.failing.add('1');
    const store = new RoundStore();
    const feed = startPollingFeed(gateway, store, { intervalMs: 1000, initialBackfill: 0 });
    await vi.advanceTimersByTimeAsync(0);
    gateway.heights.set('0', 101);
    await vi.advanceTimersByTimeAsync(3000);
    const snap = store.getSnapshot();
    expect(snap.shards[0]).toMatchObject({ status: 'ok', latestIndex: 101 });
    expect(snap.shards[1]).toMatchObject({ status: 'unreachable', lastError: 'timed out' });
    feed.stop();
  });

  it('keeps polling the latest block on schedule while a history fetch hangs', async () => {
    const gateway = new FakeGateway();
    const hang = new Promise<never>(() => undefined);
    const realGetBlock = gateway.getBlock.bind(gateway);
    gateway.getBlock = async (shardId, which) => {
      if (which !== 'latest') {
        gateway.calls.push(`${shardId}:${which}`);
        return hang; // the history fetch never answers
      }
      return realGetBlock(shardId, which);
    };
    const store = new RoundStore();
    const feed = startPollingFeed(gateway, store, { intervalMs: 1000, initialBackfill: 24 });
    await vi.advanceTimersByTimeAsync(0);
    for (let n = 1; n <= 20; n++) {
      gateway.heights.set('0', 100 + n);
      await vi.advanceTimersByTimeAsync(1000);
    }
    expect(gateway.calls.filter((c) => c === '0:latest').length).toBeGreaterThanOrEqual(20);
    expect(store.getSnapshot().shards[0]).toMatchObject({ status: 'ok', latestIndex: 120 });
    feed.stop();
  });

  it('starts over on a network reset, but not on a dip of a block or two', async () => {
    const gateway = new FakeGateway();
    gateway.heights.set('0', 1000);
    const store = new RoundStore();
    const feed = startPollingFeed(gateway, store, { intervalMs: 1000, initialBackfill: 0 });
    await vi.advanceTimersByTimeAsync(0);
    gateway.heights.set('0', 999); // a failover answering one block behind
    await vi.advanceTimersByTimeAsync(1000);
    expect(store.latestIndex('0')).toBe(1000);
    gateway.heights.set('0', 5); // the network was reset
    await vi.advanceTimersByTimeAsync(1000);
    expect(store.latestIndex('0')).toBe(5);
    feed.stop();
  });

  it('throws away a history answer from the old chain that lands after a network reset', async () => {
    const gateway = new FakeGateway();
    gateway.heights.set('0', 1000);
    let release: (() => void) | null = null;
    const realGetBlock = gateway.getBlock.bind(gateway);
    gateway.getBlock = async (shardId, which) => {
      if (shardId === '0' && which === 999) {
        await new Promise<void>((r) => (release = r)); // old-chain history, held until after the reset
      }
      return realGetBlock(shardId, which);
    };
    const store = new RoundStore();
    const feed = startPollingFeed(gateway, store, { intervalMs: 1000, initialBackfill: 1 });
    await vi.advanceTimersByTimeAsync(0);
    gateway.heights.set('0', 5); // the network is reset
    await vi.advanceTimersByTimeAsync(1000);
    expect(store.latestIndex('0')).toBe(5);
    gateway.heights.set('0', 1000); // the stale answer for block 999 now arrives
    release!();
    await vi.advanceTimersByTimeAsync(0);
    gateway.heights.set('0', 5);
    expect(store.latestIndex('0')).toBe(5);
    feed.stop();
  });

  it('makes no request after stop()', async () => {
    const gateway = new FakeGateway();
    const store = new RoundStore();
    const feed = startPollingFeed(gateway, store, { intervalMs: 1000, initialBackfill: 0 });
    await vi.advanceTimersByTimeAsync(0);
    feed.stop();
    gateway.calls = [];
    await vi.advanceTimersByTimeAsync(5000);
    expect(gateway.calls).toEqual([]);
  });
});

describe('startNetworkFeed', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('falls back to polling when the gateway does not serve /network/status', async () => {
    const gateway = new FakeGateway();
    const store = new RoundStore();
    const sources: string[] = [];
    const feed = startNetworkFeed(gateway, store, { initialBackfill: 0, onSource: (s) => sources.push(s) });
    await vi.advanceTimersByTimeAsync(0);
    expect(sources).toEqual(['polling']);
    expect(gateway.calls).toContain('0:latest');
    feed.stop();
  });

  it('uses the status endpoint when it is served, and never polls shards one by one', async () => {
    const gateway = new FakeGateway();
    gateway.status = {
      generatedAt: 1,
      pollIntervalMs: 1000,
      staleAfterMs: 15000,
      shards: [
        { shardId: '0', status: 'ok', rounds: [block('0', 100), block('0', 99)] },
        { shardId: '1', status: 'unreachable', rounds: [] },
      ],
    };
    const store = new RoundStore();
    const sources: string[] = [];
    const feed = startNetworkFeed(gateway, store, { onSource: (s) => sources.push(s) });
    await vi.advanceTimersByTimeAsync(0);
    expect(sources).toEqual(['status-endpoint']);
    expect(store.latestIndex('0')).toBe(100);

    await vi.advanceTimersByTimeAsync(1000);
    expect(gateway.statusCalls[0]).toBe(120);
    expect(gateway.statusCalls[1]).toBeGreaterThanOrEqual(10);
    expect(gateway.calls).toEqual([]);
    expect(store.getSnapshot().shards[1].lastError).toBe('the gateway cannot reach this shard');
    feed.stop();
  });

  it('leaves a shard the gateway reports unknown unjudged, so a warming-up gateway is not an outage', async () => {
    const gateway = new FakeGateway();
    gateway.status = {
      generatedAt: 1,
      pollIntervalMs: 1000,
      staleAfterMs: 15000,
      shards: [
        { shardId: '0', status: 'unknown', rounds: [] },
        { shardId: '1', status: 'unknown', rounds: [] },
      ],
    };
    const store = new RoundStore();
    const feed = startNetworkFeed(gateway, store);
    await vi.advanceTimersByTimeAsync(0);
    const snap = store.getSnapshot();
    expect(snap.shards.map((s) => s.status)).toEqual(['unknown', 'unknown']);
    expect(snap.verdict).toBe('connecting');
    feed.stop();
  });

  it('switches to polling, without reporting any shard down, when the endpoint stops being served', async () => {
    const gateway = new FakeGateway();
    gateway.status = {
      generatedAt: 1,
      pollIntervalMs: 1000,
      staleAfterMs: 15000,
      shards: [
        { shardId: '0', status: 'ok', rounds: [block('0', 100)] },
        { shardId: '1', status: 'ok', rounds: [block('1', 100)] },
      ],
    };
    const store = new RoundStore();
    const sources: string[] = [];
    const feed = startNetworkFeed(gateway, store, { initialBackfill: 0, onSource: (s) => sources.push(s) });
    await vi.advanceTimersByTimeAsync(0);
    gateway.status = null; // rolled back: 404 from now on
    await vi.advanceTimersByTimeAsync(1000);
    expect(sources).toEqual(['status-endpoint', 'polling']);
    expect(gateway.calls).toContain('0:latest');
    expect(store.getSnapshot().shards.map((s) => s.lastError)).toEqual([null, null]);
    feed.stop();
  });

  it('switches to polling after the endpoint keeps failing', async () => {
    const gateway = new FakeGateway();
    gateway.status = {
      generatedAt: 1,
      pollIntervalMs: 1000,
      staleAfterMs: 15000,
      shards: [{ shardId: '0', status: 'ok', rounds: [block('0', 100)] }, { shardId: '1', status: 'ok', rounds: [block('1', 100)] }],
    };
    const store = new RoundStore();
    const sources: string[] = [];
    const feed = startNetworkFeed(gateway, store, { initialBackfill: 0, onSource: (s) => sources.push(s) });
    await vi.advanceTimersByTimeAsync(0);
    gateway.getNetworkStatus = async () => {
      throw new GatewayError('http', '/network/status: HTTP 502');
    };
    await vi.advanceTimersByTimeAsync(4000);
    expect(sources).toEqual(['status-endpoint']);
    await vi.advanceTimersByTimeAsync(1000);
    expect(sources).toEqual(['status-endpoint', 'polling']);
    feed.stop();
  });
});
