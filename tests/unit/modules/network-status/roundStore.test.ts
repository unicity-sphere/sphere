import { describe, it, expect, beforeEach } from 'vitest';
import { RoundStore, displayShardId } from '@/modules/network-status/roundStore';
import type { RoundSummary } from '@/modules/network-status/types';

const ROOTS = ['root-a', 'root-b', 'root-c', 'root-d'];
const SHARDS = ['00', '01', '10', '11'];

/** Round `n` of the synthetic network: every shard certified in root round 100 + 3n, ~900 ms apart. */
function round(shardId: string, n: number, overrides: Partial<RoundSummary> & { signers?: string[] } = {}): RoundSummary {
  const { signers = ROOTS, ...rest } = overrides;
  return {
    shardId,
    index: 1000 + n,
    createdAt: 1_000_000 + n * 900,
    totalCommitments: 0,
    rootHash: `h${n}`,
    empty: true,
    seal: { rootRound: 100 + 3 * n, certifiedAt: 1000 + Math.floor(n * 0.9), signers },
    ...rest,
  };
}

function allShards(n: number, overrides?: Parameters<typeof round>[2]): RoundSummary[] {
  return SHARDS.map((s) => round(s, n, overrides));
}

describe('RoundStore', () => {
  let now: number;
  let store: RoundStore;

  beforeEach(() => {
    now = 5_000;
    store = new RoundStore({ now: () => now, staleAfterMs: 15_000 });
    store.setShards(SHARDS);
  });

  it('starts as connecting, with every shard unknown', () => {
    const snap = store.getSnapshot();
    expect(snap.verdict).toBe('connecting');
    expect(snap.shards.map((s) => s.status)).toEqual(['unknown', 'unknown', 'unknown', 'unknown']);
  });

  it('groups the shards of one root round into one column, oldest first', () => {
    for (const s of SHARDS) store.recordSuccess(s);
    store.ingest([...allShards(1), ...allShards(0)]);
    const snap = store.getSnapshot();
    expect(snap.columns.map((c) => c.rootRound)).toEqual([100, 103]);
    expect([...snap.columns[1].cells.keys()].sort()).toEqual(SHARDS);
    expect(snap.columns[1].signers).toEqual(ROOTS);
    expect(snap.verdict).toBe('live');
  });

  it('counts a block once, however many times it is ingested', () => {
    store.ingest(allShards(0, { totalCommitments: 5, empty: false }));
    store.ingest(allShards(0, { totalCommitments: 5, empty: false }));
    const snap = store.getSnapshot();
    expect(snap.columns[0].totalCommitments).toBe(20);
    expect(snap.session[0].commitments).toBe(20);
  });

  it('marks a shard missed only where its own consecutive blocks prove it skipped the round', () => {
    store.ingest([
      ...allShards(0),
      ...['00', '01', '10'].map((s) => round(s, 1)),
      ...['00', '01', '10'].map((s) => round(s, 2)),
      round('11', 2, { index: 1001 }), // shard 11's very next block after round 0 is in round 2
    ]);
    const column = store.getSnapshot().columns.find((c) => c.rootRound === 103)!;
    expect(column.missed.has('11')).toBe(true);
    expect(column.cells.has('11')).toBe(false);
  });

  it('does not call a shard missed when the blocks around the gap were simply not fetched', () => {
    store.ingest([
      ...allShards(0),
      ...['00', '01', '10'].map((s) => round(s, 1)),
      ...allShards(2), // shard 11: index 1000 then 1002, so 1001 is unknown, not missed
    ]);
    const column = store.getSnapshot().columns.find((c) => c.rootRound === 103)!;
    expect(column.missed.size).toBe(0);
  });

  it('reports a root that left the seal, and goes degraded while the quorum still holds', () => {
    for (const s of SHARDS) store.recordSuccess(s);
    store.ingest(allShards(0));
    store.ingest(allShards(1, { signers: ['root-a', 'root-b', 'root-c'] }));
    const snap = store.getSnapshot();
    expect(snap.quorum).toBe(3);
    expect(snap.metrics.rootsSignedLatest).toBe(3);
    expect(snap.metrics.rootsKnown).toBe(4);
    expect(snap.roots.find((r) => r.id === 'root-d')).toMatchObject({ signedLatest: false, signed: 1, seen: 2 });
    expect(snap.verdict).toBe('degraded');
    expect(snap.reasons.join(' ')).toMatch(/1 of 4 roots did not sign/);
  });

  it('credits a root by round order, not by the order blocks happened to arrive', () => {
    store.ingest(allShards(1, { signers: ['root-a', 'root-b', 'root-c'] })); // the latest arrives first
    store.ingest(allShards(0)); // the backfilled older round is the only one root-d signed
    const d = store.getSnapshot().roots.find((r) => r.id === 'root-d')!;
    expect(d).toMatchObject({ signed: 1, seen: 2, signedLatest: false });
  });

  it('calls a shard that answers but has shown no block unknown, not stale', () => {
    for (const s of SHARDS) store.recordSuccess(s);
    const snap = store.getSnapshot();
    expect(snap.shards.map((s) => s.status)).toEqual(['unknown', 'unknown', 'unknown', 'unknown']);
    expect(snap.verdict).toBe('connecting');
  });

  it('forgets the old chain entirely on a network reset, root rounds and session included', () => {
    store.ingest([...allShards(0, { totalCommitments: 2, empty: false }), ...allShards(1), ...allShards(2)]);
    store.resetNetwork();
    // The new chain restarts both block numbers and root-round numbering.
    store.ingest(SHARDS.map((s) => round(s, 0, { index: 1, seal: { rootRound: 100, certifiedAt: 5000, signers: ROOTS } })));
    const snap = store.getSnapshot();
    expect(snap.columns.map((c) => c.rootRound)).toEqual([100]);
    expect(snap.columns[0].totalCommitments).toBe(0);
    expect(snap.session.map((p) => p.commitments)).toEqual([0]);
    expect(store.latestIndex('00')).toBe(1);
    expect(snap.roundsSinceOpen).toBe(0);
  });

  it('drops an answer that was requested before a network reset', () => {
    store.ingest(allShards(0));
    const before = store.generation;
    store.resetNetwork();
    store.ingest([round('00', 9)], before); // an old-chain block arriving late
    expect(store.latestIndex('00')).toBeNull();
  });

  it('turns a shard stale when its index stops advancing, judged on the client clock only', () => {
    for (const s of SHARDS) store.recordSuccess(s);
    store.ingest(allShards(0));
    now += 10_000;
    for (const s of SHARDS) store.recordSuccess(s);
    store.ingest(['00', '01', '10'].map((s) => round(s, 1)));
    now += 10_000; // shard 11 last advanced 20 s ago; the others 10 s ago
    for (const s of SHARDS) store.recordSuccess(s);
    store.tick();
    const snap = store.getSnapshot();
    expect(snap.shards.map((s) => s.status)).toEqual(['ok', 'ok', 'ok', 'stale']);
    expect(snap.verdict).toBe('degraded');
  });

  it('turns a shard unreachable when its polls keep failing past the stale window', () => {
    for (const s of SHARDS) store.recordSuccess(s);
    store.ingest(allShards(0));
    now += 16_000;
    for (const s of ['00', '01', '10']) {
      store.recordSuccess(s);
    }
    store.ingest(['00', '01', '10'].map((s) => round(s, 1)));
    store.recordFailure('11', 'timeout');
    const snap = store.getSnapshot();
    expect(snap.shards.find((s) => s.shardId === '11')).toMatchObject({ status: 'unreachable', lastError: 'timeout' });
  });

  it('does not count time the page was hidden against the shards', () => {
    for (const s of SHARDS) store.recordSuccess(s);
    store.ingest(allShards(0));
    store.pause();
    now += 60_000;
    expect(store.getSnapshot().verdict).toBe('live');
    store.resume();
    store.tick();
    expect(store.getSnapshot().shards.map((s) => s.status)).toEqual(['ok', 'ok', 'ok', 'ok']);
    now += 16_000; // looking again, and nothing advances: now it is real
    store.tick();
    expect(store.getSnapshot().verdict).toBe('down');
  });

  it('is down when no shard is healthy', () => {
    for (const s of SHARDS) store.recordSuccess(s);
    store.ingest(allShards(0));
    now += 20_000;
    store.tick();
    expect(store.getSnapshot().verdict).toBe('down');
  });

  it('measures round time as wall-clock time over rounds, per shard, robust to fetch gaps', () => {
    store.ingest([...allShards(0), ...allShards(1), ...allShards(4)]);
    expect(store.getSnapshot().metrics.roundTimeMs).toBe(900);
  });

  it('measures throughput and activity over the window, and counts rounds since the page opened', () => {
    store.ingest(allShards(0)); // baseline: the first batch
    store.ingest(allShards(1, { totalCommitments: 3, empty: false }));
    store.ingest(allShards(2));
    const snap = store.getSnapshot();
    // 12 commitments over the 1.8 s the window covers.
    expect(snap.metrics.commitmentsPerSecond).toBeCloseTo(12 / 1.8, 5);
    expect(snap.metrics.nonEmptyShare).toBeCloseTo(4 / 12, 5);
    expect(snap.roundsSinceOpen).toBe(2);
    expect(snap.metrics.latestRootRound).toBe(106);
  });

  it('starts "since you opened" at the newest round any shard has, not at the first shard to answer', () => {
    store.ingest([round('00', 0)]); // a lagging shard answers first
    store.ingest(['01', '10', '11'].map((s) => round(s, 5))); // the rest are 5 rounds ahead
    store.ingest(allShards(6));
    expect(store.getSnapshot().roundsSinceOpen).toBe(1);
  });

  it('fixes the "since you opened" baseline after 3 s even if a shard never delivers', () => {
    store.ingest(['00', '01', '10'].map((s) => round(s, 0)));
    now += 3_000;
    store.ingest(['00', '01', '10'].map((s) => round(s, 1)));
    store.ingest(['00', '01', '10'].map((s) => round(s, 2)));
    expect(store.getSnapshot().roundsSinceOpen).toBe(1);
  });

  it('lets the 60 s window empty when blocks stop, instead of freezing its last numbers', () => {
    store.ingest(allShards(0, { totalCommitments: 10, empty: false }));
    store.ingest(allShards(1, { totalCommitments: 10, empty: false }));
    expect(store.getSnapshot().metrics.commitmentsPerSecond).toBeGreaterThan(0);
    expect(store.getSnapshot().metrics.roundTimeMs).toBe(900);
    now += 120_000;
    store.tick();
    const { metrics } = store.getSnapshot();
    expect(metrics.commitmentsPerSecond).toBeNull();
    expect(metrics.nonEmptyShare).toBeNull();
    expect(metrics.roundTimeMs).toBeNull();
  });

  it('recovers its metrics window from a block with a far-future timestamp', () => {
    store.ingest(allShards(0));
    now += 900;
    store.ingest(allShards(1, { createdAt: 1_000_000 + 3_600_000 })); // one wild block, an hour ahead
    for (let n = 2; n < 100; n++) {
      now += 900;
      store.ingest(allShards(n));
    }
    expect(store.getSnapshot().metrics.roundTimeMs).not.toBeNull();
  });

  it('reports round time per certified round, leaving a gap where a round is missing', () => {
    store.ingest([...allShards(0), ...allShards(1), ...allShards(3)]);
    expect(store.getSnapshot().session.map((p) => p.roundTimeMs)).toEqual([null, 900, null]);
  });

  it('keeps a root that stopped signing listed, and the network degraded, after the session history is pruned', () => {
    const small = new RoundStore({ now: () => now, maxSessionPoints: 5 });
    small.setShards(SHARDS);
    for (const s of SHARDS) small.recordSuccess(s);
    small.ingest(allShards(0)); // root-d signs only this round
    for (let n = 1; n <= 12; n++) small.ingest(allShards(n, { signers: ['root-a', 'root-b', 'root-c'] }));
    const snap = small.getSnapshot();
    expect(snap.session).toHaveLength(5);
    expect(snap.roots.find((r) => r.id === 'root-d')).toMatchObject({ signed: 1, seen: 13, signedLatest: false });
    expect(snap.roots.find((r) => r.id === 'root-a')).toMatchObject({ signed: 13, seen: 13 });
    expect(snap.verdict).toBe('degraded');
  });

  it('keeps memory bounded', () => {
    const small = new RoundStore({ now: () => now, maxRoundsPerShard: 10, maxColumns: 5 });
    small.setShards(['00']);
    for (let n = 0; n < 50; n++) small.ingest([round('00', n)]);
    const snap = small.getSnapshot();
    expect(snap.columns).toHaveLength(5);
    expect(snap.columns[4].rootRound).toBe(100 + 3 * 49);
  });

  it('returns the same snapshot object until something changes', () => {
    const a = store.getSnapshot();
    expect(store.getSnapshot()).toBe(a);
    store.tick();
    expect(store.getSnapshot()).not.toBe(a);
  });

  it('notifies subscribers and stops after unsubscribe', () => {
    let calls = 0;
    const off = store.subscribe(() => calls++);
    store.ingest(allShards(0));
    off();
    store.ingest(allShards(1));
    expect(calls).toBe(1);
  });
});

describe('displayShardId', () => {
  it('reads binary prefixes as 0-based numbers', () => {
    expect(['000', '011', '111'].map((id) => displayShardId(id, ['000', '011', '111']))).toEqual([0, 3, 7]);
  });

  it('strips the marker bit from legacy numeric ids', () => {
    expect(displayShardId('2', ['2', '3'])).toBe(0);
    expect(displayShardId('3', ['2', '3'])).toBe(1);
  });
});
