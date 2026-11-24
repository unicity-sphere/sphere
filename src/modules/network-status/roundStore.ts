import { ClockEstimator } from './clock';
import type { RoundSummary } from './types';

/**
 * The page's single source of truth: every shard block seen, the poll health of
 * every shard, and everything derived from them.
 *
 * Two rules keep the numbers honest:
 * - Health is judged on THIS client's clock only (when a poll answered, when an
 *   index last advanced). Block timestamps come from other machines' clocks and
 *   are only ever compared with each other.
 * - "Missed" is a proof, not a guess: a shard missed a certified round only when
 *   two of its blocks with consecutive indices sit on either side of it. A gap
 *   in what this client happened to fetch is shown as unknown, never as missed.
 */

export type ShardStatus = 'unknown' | 'ok' | 'stale' | 'unreachable';
export type Verdict = 'connecting' | 'live' | 'degraded' | 'down';

export interface ShardView {
  readonly shardId: string;
  readonly displayId: number;
  readonly status: ShardStatus;
  readonly latestIndex: number | null;
  readonly lastAdvanceAt: number | null;
  readonly lastError: string | null;
}

/** One certified root round: the blocks it sealed, one per shard. */
export interface Column {
  readonly rootRound: number;
  /** Earliest `createdAt` among its blocks (aggregator clock, ms). */
  readonly createdAt: number;
  /** Seal time, root-chain clock, unix seconds. */
  readonly certifiedAt: number;
  readonly signers: readonly string[];
  readonly cells: ReadonlyMap<string, RoundSummary>;
  /** Shards proven to have no block in this round. */
  readonly missed: ReadonlySet<string>;
  readonly totalCommitments: number;
}

export interface RootView {
  readonly id: string;
  /** The last 6 characters of the node id. */
  readonly shortId: string;
  /** Certified rounds this session whose seal carried this root's signature. */
  readonly signed: number;
  /** Certified rounds this session since this root was first seen. */
  readonly seen: number;
  /** Whether it signed the newest certified round; `null` before any round. */
  readonly signedLatest: boolean | null;
}

export interface SessionPoint {
  readonly rootRound: number;
  readonly createdAt: number;
  readonly commitments: number;
  /** Time since the previous certified round; `null` where a round is missing. */
  readonly roundTimeMs: number | null;
}

export interface Metrics {
  /** Wall-clock time per round over the window, per shard, median across shards. */
  readonly roundTimeMs: number | null;
  readonly commitmentsPerSecond: number | null;
  /** Share of shard blocks in the window that carry commitments. */
  readonly nonEmptyShare: number | null;
  readonly shardsOk: number;
  readonly shardsTotal: number;
  readonly rootsSignedLatest: number | null;
  readonly rootsKnown: number;
  /** Time since any shard's index last advanced, on this client's clock. */
  readonly lastRoundAgeMs: number | null;
  readonly latestRootRound: number | null;
}

export interface NetworkSnapshot {
  readonly version: number;
  readonly computedAt: number;
  readonly shards: readonly ShardView[];
  readonly columns: readonly Column[];
  readonly roots: readonly RootView[];
  /** ⌊2n/3⌋ + 1 of the n roots seen: what a BFT seal needs. */
  readonly quorum: number | null;
  readonly metrics: Metrics;
  readonly verdict: Verdict;
  readonly reasons: readonly string[];
  readonly session: readonly SessionPoint[];
  readonly roundsSinceOpen: number;
  /** Why the feed cannot read the gateway right now, if it cannot. */
  readonly feedError: string | null;
}

export interface RoundStoreOptions {
  readonly now?: () => number;
  readonly staleAfterMs?: number;
  readonly windowMs?: number;
  readonly maxRoundsPerShard?: number;
  readonly maxColumns?: number;
  readonly maxSessionPoints?: number;
}

interface ShardState {
  readonly rounds: Map<number, RoundSummary>;
  maxIndex: number | null;
  lastSuccessAt: number | null;
  lastAdvanceAt: number | null;
  failures: number;
  lastError: string | null;
}

interface SessionAccumulator {
  createdAt: number;
  commitments: number;
  readonly signers: readonly string[];
}

/** Failed polls before a shard that never answered counts as unreachable. */
const FAILURES_BEFORE_UNREACHABLE = 3;
/** Longest wait for every shard before "since you opened" picks its baseline anyway. */
const BASELINE_WINDOW_MS = 3_000;

export class RoundStore {
  private readonly now: () => number;
  private readonly staleAfterMs: number;
  private readonly windowMs: number;
  private readonly maxRoundsPerShard: number;
  private readonly maxColumns: number;
  private readonly maxSessionPoints: number;

  private shardIds: string[] = [];
  private readonly shards = new Map<string, ShardState>();
  private readonly session = new Map<number, SessionAccumulator>();
  /**
   * Per-root signing survives the session's pruning: the first round each root was
   * seen signing, and the seen/signed counts of rounds already pruned from `session`.
   */
  private readonly firstSigned = new Map<string, number>();
  private readonly prunedSeen = new Map<string, number>();
  private readonly prunedSigned = new Map<string, number>();
  /**
   * "Since you opened" counts root rounds above this. It is fixed once every
   * shard has delivered a sealed block (or 3 s after the first one), as the
   * newest root round seen by then — so a lagging first shard cannot make
   * rounds certified before the page opened count as new.
   */
  private baselineRootRound: number | null = null;
  private firstIngestAt: number | null = null;
  private maxRootRound: number | null = null;
  /** The aggregator's clock, estimated from block sightings (see ClockEstimator). */
  private aggregatorClock = new ClockEstimator();
  private readonly shardsWithSeal = new Set<string>();
  private roundsSinceOpen = 0;
  private feedError: string | null = null;
  private pausedAt: number | null = null;
  private chainGeneration = 0;

  private version = 0;
  private cached: NetworkSnapshot | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(options: RoundStoreOptions = {}) {
    this.now = options.now ?? Date.now;
    this.staleAfterMs = options.staleAfterMs ?? 15_000;
    this.windowMs = options.windowMs ?? 60_000;
    this.maxRoundsPerShard = options.maxRoundsPerShard ?? 400;
    this.maxColumns = options.maxColumns ?? 320;
    this.maxSessionPoints = options.maxSessionPoints ?? 4_000;
  }

  setShards(shardIds: readonly string[]): void {
    this.shardIds = [...shardIds];
    for (const id of shardIds) {
      if (!this.shards.has(id)) {
        this.shards.set(id, { rounds: new Map(), maxIndex: null, lastSuccessAt: null, lastAdvanceAt: null, failures: 0, lastError: null });
      }
    }
    for (const id of [...this.shards.keys()]) if (!shardIds.includes(id)) this.shards.delete(id);
    this.changed();
  }

  latestIndex(shardId: string): number | null {
    return this.shards.get(shardId)?.maxIndex ?? null;
  }

  /**
   * Bumped by every network reset. A feed reads it when it sends a request and
   * passes it back with the answer, so an answer from the old chain that arrives
   * after a reset is dropped instead of mixed into the new one.
   */
  get generation(): number {
    return this.chainGeneration;
  }

  ingest(rounds: readonly RoundSummary[], generation: number = this.chainGeneration): void {
    if (rounds.length === 0 || generation !== this.chainGeneration) return;
    const at = this.now();
    const fresh: RoundSummary[] = [];
    for (const round of rounds) {
      const shard = this.shards.get(round.shardId);
      if (!shard || shard.rounds.has(round.index)) continue;
      // Older than the buffer keeps: already counted once, and pruned since.
      if (shard.maxIndex !== null && round.index <= shard.maxIndex - this.maxRoundsPerShard) continue;
      shard.rounds.set(round.index, round);
      fresh.push(round);
      this.aggregatorClock.observe(round.seal?.rootRound ?? -round.index, round.createdAt, at);
      if (shard.maxIndex === null || round.index > shard.maxIndex) {
        shard.maxIndex = round.index;
        shard.lastAdvanceAt = at;
      }
      if (shard.rounds.size > this.maxRoundsPerShard) {
        const sorted = [...shard.rounds.keys()].sort((a, b) => a - b);
        for (const index of sorted.slice(0, shard.rounds.size - this.maxRoundsPerShard)) shard.rounds.delete(index);
      }
    }
    if (fresh.length === 0) return;

    if (this.baselineRootRound === null) {
      this.firstIngestAt ??= at;
      for (const round of fresh) {
        if (!round.seal) continue;
        this.shardsWithSeal.add(round.shardId);
        this.maxRootRound = Math.max(this.maxRootRound ?? 0, round.seal.rootRound);
      }
      const everyShard = this.shardIds.every((id) => this.shardsWithSeal.has(id));
      if (this.maxRootRound !== null && (everyShard || at - this.firstIngestAt >= BASELINE_WINDOW_MS)) {
        this.baselineRootRound = this.maxRootRound;
      }
    }
    for (const round of fresh) this.accumulate(round);
    this.changed();
  }

  /** A poll of this shard answered (whether or not it brought a new block). */
  recordSuccess(shardId: string): void {
    const shard = this.shards.get(shardId);
    if (!shard) return;
    shard.lastSuccessAt = this.now();
    shard.failures = 0;
    shard.lastError = null;
    this.changed();
  }

  recordFailure(shardId: string, error: string): void {
    const shard = this.shards.get(shardId);
    if (!shard) return;
    shard.failures++;
    shard.lastError = error;
    this.changed();
  }

  setFeedError(error: string | null): void {
    if (error === this.feedError) return;
    this.feedError = error;
    this.changed();
  }

  /**
   * The page stopped reading (hidden tab). Health is judged on time this client
   * spent LOOKING: without this, returning to the tab would show every shard
   * stalled until the first poll answers — an outage that never happened.
   */
  pause(): void {
    if (this.pausedAt !== null) return;
    this.pausedAt = this.now();
    this.changed();
  }

  resume(): void {
    if (this.pausedAt === null) return;
    const away = this.now() - this.pausedAt;
    this.pausedAt = null;
    for (const shard of this.shards.values()) {
      if (shard.lastSuccessAt !== null) shard.lastSuccessAt += away;
      if (shard.lastAdvanceAt !== null) shard.lastAdvanceAt += away;
    }
    if (this.firstIngestAt !== null) this.firstIngestAt += away;
    this.aggregatorClock.shift(away);
    this.changed();
  }

  /** Re-derive the time-dependent fields (ages, staleness). */
  tick(): void {
    this.changed();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot = (): NetworkSnapshot => {
    if (this.cached?.version !== this.version) this.cached = this.compute();
    return this.cached;
  };

  private changed(): void {
    this.version++;
    for (const listener of this.listeners) listener();
  }

  private accumulate(round: RoundSummary): void {
    const seal = round.seal;
    if (!seal) return;
    let point = this.session.get(seal.rootRound);
    if (!point) {
      point = { createdAt: round.createdAt, commitments: 0, signers: seal.signers };
      this.session.set(seal.rootRound, point);
      for (const id of seal.signers) {
        const first = this.firstSigned.get(id);
        if (first === undefined || seal.rootRound < first) this.firstSigned.set(id, seal.rootRound);
      }
      if (this.baselineRootRound !== null && seal.rootRound > this.baselineRootRound) this.roundsSinceOpen++;
      if (this.session.size > this.maxSessionPoints) this.pruneOldestSessionPoint();
    }
    point.createdAt = Math.min(point.createdAt, round.createdAt);
    point.commitments += round.totalCommitments;
  }

  private compute(): NetworkSnapshot {
    const now = this.pausedAt ?? this.now();
    const shardViews = this.shardIds.map((id) => this.shardView(id, now));
    const columns = this.columns();
    const latest = columns.at(-1) ?? null;

    const roots = this.rootViews(latest);
    const quorum = roots.length > 0 ? Math.floor((2 * roots.length) / 3) + 1 : null;

    const metrics = this.metrics(shardViews, roots, latest, now);
    const { verdict, reasons } = judge(shardViews, metrics);

    return {
      version: this.version,
      computedAt: now,
      shards: shardViews,
      columns,
      roots,
      quorum,
      metrics,
      verdict,
      reasons,
      session: this.sessionPoints(),
      roundsSinceOpen: this.roundsSinceOpen,
      feedError: this.feedError,
    };
  }

  /** Folds the oldest session point into the per-root running totals, then drops it. */
  private pruneOldestSessionPoint(): void {
    const oldest = Math.min(...this.session.keys());
    const point = this.session.get(oldest)!;
    for (const [id, first] of this.firstSigned) {
      if (first <= oldest) this.prunedSeen.set(id, (this.prunedSeen.get(id) ?? 0) + 1);
    }
    for (const id of point.signers) this.prunedSigned.set(id, (this.prunedSigned.get(id) ?? 0) + 1);
    this.session.delete(oldest);
  }

  /**
   * Per-root signing in ROUND order: from the first round a root is seen signing,
   * every later certified round counts as seen. Counting in arrival order instead
   * would let a backfilled older round credit a root for rounds it was never in.
   * Rounds pruned from the session still count, through the running totals, so a
   * root that stopped signing an hour ago is still listed as not signing.
   */
  private rootViews(latest: Column | null): RootView[] {
    const rounds = [...this.session.keys()];
    return [...this.firstSigned.keys()].sort().map((id) => {
      const first = this.firstSigned.get(id)!;
      let seen = this.prunedSeen.get(id) ?? 0;
      let signed = this.prunedSigned.get(id) ?? 0;
      for (const rootRound of rounds) {
        if (rootRound >= first) seen++;
        if (this.session.get(rootRound)!.signers.includes(id)) signed++;
      }
      return { id, shortId: id.slice(-6), signed, seen, signedLatest: latest ? latest.signers.includes(id) : null };
    });
  }

  /**
   * The network was reset (a shard's block numbers went far backwards). Root-round
   * numbering restarts with it, so every block and every session tally belongs to
   * the old chain: forget them all and start over. Poll health is kept.
   */
  resetNetwork(): void {
    for (const shard of this.shards.values()) {
      shard.rounds.clear();
      shard.maxIndex = null;
      shard.lastAdvanceAt = null;
    }
    this.session.clear();
    this.firstSigned.clear();
    this.prunedSeen.clear();
    this.prunedSigned.clear();
    this.baselineRootRound = null;
    this.firstIngestAt = null;
    this.maxRootRound = null;
    this.shardsWithSeal.clear();
    this.aggregatorClock = new ClockEstimator();
    this.roundsSinceOpen = 0;
    this.chainGeneration++;
    this.changed();
  }

  private shardView(id: string, now: number): ShardView {
    const shard = this.shards.get(id)!;
    let status: ShardStatus;
    if (shard.lastSuccessAt === null) {
      status = shard.failures >= FAILURES_BEFORE_UNREACHABLE ? 'unreachable' : 'unknown';
    } else if (shard.failures > 0 && now - shard.lastSuccessAt > this.staleAfterMs) {
      status = 'unreachable';
    } else if (shard.lastAdvanceAt === null) {
      status = 'unknown'; // it answers, but has shown no block yet
    } else if (now - shard.lastAdvanceAt > this.staleAfterMs) {
      status = 'stale';
    } else {
      status = 'ok';
    }
    return {
      shardId: id,
      displayId: displayShardId(id, this.shardIds),
      status,
      latestIndex: shard.maxIndex,
      lastAdvanceAt: shard.lastAdvanceAt,
      lastError: shard.lastError,
    };
  }

  private columns(): Column[] {
    const byRound = new Map<number, { createdAt: number; certifiedAt: number; signers: readonly string[]; cells: Map<string, RoundSummary>; totalCommitments: number }>();
    for (const [shardId, shard] of this.shards) {
      for (const round of shard.rounds.values()) {
        if (!round.seal) continue;
        let column = byRound.get(round.seal.rootRound);
        if (!column) {
          column = { createdAt: round.createdAt, certifiedAt: round.seal.certifiedAt, signers: round.seal.signers, cells: new Map(), totalCommitments: 0 };
          byRound.set(round.seal.rootRound, column);
        }
        column.cells.set(shardId, round);
        column.createdAt = Math.min(column.createdAt, round.createdAt);
        column.totalCommitments += round.totalCommitments;
      }
    }
    const rootRounds = [...byRound.keys()].sort((a, b) => a - b).slice(-this.maxColumns);
    const missed = this.missedByRound(rootRounds);
    return rootRounds.map((rootRound) => ({ rootRound, ...byRound.get(rootRound)!, missed: missed.get(rootRound) ?? new Set<string>() }));
  }

  /** rootRound → shards whose consecutive blocks prove they have no block in it. */
  private missedByRound(rootRounds: readonly number[]): Map<number, Set<string>> {
    const out = new Map<number, Set<string>>();
    for (const [shardId, shard] of this.shards) {
      const sealed = [...shard.rounds.values()].filter((r) => r.seal).sort((a, b) => a.index - b.index);
      let cursor = 0;
      for (let i = 1; i < sealed.length; i++) {
        const before = sealed[i - 1];
        const after = sealed[i];
        if (after.index !== before.index + 1) continue;
        const lo = before.seal!.rootRound;
        const hi = after.seal!.rootRound;
        while (cursor < rootRounds.length && rootRounds[cursor] <= lo) cursor++;
        for (let j = cursor; j < rootRounds.length && rootRounds[j] < hi; j++) {
          let set = out.get(rootRounds[j]);
          if (!set) out.set(rootRounds[j], (set = new Set()));
          set.add(shardId);
        }
      }
    }
    return out;
  }

  private metrics(shards: readonly ShardView[], roots: readonly RootView[], latest: Column | null, now: number): Metrics {
    const all: RoundSummary[] = [];
    for (const shard of this.shards.values()) all.push(...shard.rounds.values());
    // "Now" on the aggregator's clock, estimated from recent block sightings. It keeps
    // moving when blocks stop, so the window empties instead of freezing the last
    // minute's numbers, and a block with a wild timestamp is forgotten within seconds.
    const offset = this.aggregatorClock.offset(now);
    const reference = offset === null ? -Infinity : now + offset;
    const inWindow = all.filter((r) => r.createdAt > reference - this.windowMs);

    const perShard: number[] = [];
    for (const id of this.shardIds) {
      const rounds = inWindow.filter((r) => r.shardId === id).sort((a, b) => a.index - b.index);
      if (rounds.length < 2) continue;
      const first = rounds[0];
      const last = rounds[rounds.length - 1];
      perShard.push((last.createdAt - first.createdAt) / (last.index - first.index));
    }

    let commitmentsPerSecond: number | null = null;
    let nonEmptyShare: number | null = null;
    if (inWindow.length > 0) {
      const earliest = inWindow.reduce((min, r) => Math.min(min, r.createdAt), Infinity);
      const spanSeconds = Math.max((reference - earliest) / 1000, 1);
      const commitments = inWindow.reduce((sum, r) => sum + r.totalCommitments, 0);
      commitmentsPerSecond = commitments / spanSeconds;
      nonEmptyShare = inWindow.filter((r) => r.totalCommitments > 0).length / inWindow.length;
    }

    const advances = shards.map((s) => s.lastAdvanceAt).filter((t): t is number => t !== null);
    return {
      roundTimeMs: perShard.length > 0 ? median(perShard) : null,
      commitmentsPerSecond,
      nonEmptyShare,
      shardsOk: shards.filter((s) => s.status === 'ok').length,
      shardsTotal: shards.length,
      rootsSignedLatest: latest ? latest.signers.length : null,
      rootsKnown: roots.length,
      lastRoundAgeMs: advances.length > 0 ? now - Math.max(...advances) : null,
      latestRootRound: latest?.rootRound ?? null,
    };
  }

  private sessionPoints(): SessionPoint[] {
    const rounds = [...this.session.keys()].sort((a, b) => a - b);
    const step = modalStep(rounds);
    return rounds.map((rootRound, i) => {
      const point = this.session.get(rootRound)!;
      const previous = i > 0 ? rounds[i - 1] : null;
      const roundTimeMs =
        previous !== null && step !== null && rootRound - previous === step ? point.createdAt - this.session.get(previous)!.createdAt : null;
      return { rootRound, createdAt: point.createdAt, commitments: point.commitments, roundTimeMs };
    });
  }
}

function judge(shards: readonly ShardView[], metrics: Metrics): { verdict: Verdict; reasons: string[] } {
  if (shards.length === 0 || shards.every((s) => s.status === 'unknown')) return { verdict: 'connecting', reasons: [] };
  const reasons: string[] = [];
  const unhealthy = shards.filter((s) => s.status === 'stale' || s.status === 'unreachable');
  for (const shard of unhealthy) {
    reasons.push(`Shard ${shard.displayId} ${shard.status === 'stale' ? 'has stopped advancing' : 'is unreachable'}`);
  }
  if (unhealthy.length === shards.length) return { verdict: 'down', reasons };
  const { rootsSignedLatest, rootsKnown } = metrics;
  if (rootsSignedLatest !== null && rootsKnown > 0 && rootsSignedLatest < rootsKnown) {
    reasons.push(`${rootsKnown - rootsSignedLatest} of ${rootsKnown} roots did not sign the latest round`);
  }
  return { verdict: reasons.length > 0 ? 'degraded' : 'live', reasons };
}

/** The most common gap between consecutive certified root rounds (ties: the smallest). */
function modalStep(rounds: readonly number[]): number | null {
  const counts = new Map<number, number>();
  for (let i = 1; i < rounds.length; i++) {
    const step = rounds[i] - rounds[i - 1];
    counts.set(step, (counts.get(step) ?? 0) + 1);
  }
  let best: number | null = null;
  for (const [step, count] of counts) {
    if (best === null || count > counts.get(best)! || (count === counts.get(best)! && step < best)) best = step;
  }
  return best;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * The 0-based shard number people see. v2 gateways list zero-padded binary
 * prefixes (`"000"`…`"111"`); legacy ones list numbers with a leading marker bit.
 */
export function displayShardId(id: string, all: readonly string[]): number {
  const binary = all.length > 0 && all.every((s) => /^[01]+$/.test(s) && s.length === all[0].length);
  if (binary) return parseInt(id, 2);
  const n = Number(id);
  if (!Number.isSafeInteger(n) || n < 1) return 0;
  return n - 2 ** Math.floor(Math.log2(n));
}
