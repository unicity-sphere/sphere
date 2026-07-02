/**
 * `BridgeStore` (06 §A2.5, §W2/§W3) — persisted recovery material, storage only,
 * no protocol logic. Two things must survive a crash/reload:
 *  - **pending locks** (bridge-in): `{nonce, salt, recipient, amount, lockTxid}` so
 *    a mint resumes after the Tron lock is on-chain but the app died before mint.
 *  - **burned blobs** (bridge-back): the burned-token CBOR + reason — losing it
 *    makes the release unrecoverable (ZK_BACK3 §13). Also tracks the pending return.
 *
 * Keyed per wallet address so switching identities never crosses recovery state.
 */

const KEY_PREFIX = 'sphere_bridge_';

/** A bridge-in lock awaiting its mint (recovery-critical). */
export interface PendingLock {
  readonly id: string;
  readonly coinIdHex: string;
  readonly tokenTypeHex: string;
  readonly chainId: number;
  /** Lock event nonce (filled once the lock tx is mined). */
  nonce?: number;
  /** Salt (hex) that derives the committed tokenId. */
  readonly saltHex: string;
  readonly tokenIdHex: string;
  readonly recipientCommitmentHex: string;
  readonly amount: string;
  /** Tron lock txid. */
  lockTxid?: string;
  /** Block the lock landed in (for finality display). */
  lockBlock?: number;
  /** Lock-event logIndex (for the mint justification). */
  logIndex?: number;
  readonly createdAt: number;
  status: 'locking' | 'locked' | 'minted' | 'failed';
}

/** A bridge-back return awaiting settlement (the burned blob is the recovery key). */
export interface PendingReturn {
  readonly id: string;
  readonly coinIdHex: string;
  /** 32-byte nullifier (hex) — idempotency key + the `Released` watch key. */
  readonly nullifierHex: string;
  /** Burned-token CBOR (hex) — recovery-critical; resubmittable by anyone. */
  readonly burnedTokenCborHex: string;
  /** Canonical reason bytes (hex). */
  readonly reasonBytesHex: string;
  readonly configHashHex: string;
  /** Tron destination (hex/base58). */
  readonly recipient: string;
  readonly amount: string;
  readonly deadline: string;
  readonly returnServiceUrl: string;
  returnId?: string;
  settleTxid?: string;
  readonly createdAt: number;
  status: 'queued' | 'proving' | 'submitted' | 'settled' | 'failed' | 'stale';
}

interface BridgeState {
  locks: PendingLock[];
  returns: PendingReturn[];
}

function read(addressKey: string): BridgeState {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + addressKey);
    if (!raw) return { locks: [], returns: [] };
    const parsed = JSON.parse(raw) as Partial<BridgeState>;
    return { locks: parsed.locks ?? [], returns: parsed.returns ?? [] };
  } catch {
    return { locks: [], returns: [] };
  }
}

/** Persist state; returns false when storage is full/unavailable (fail-closed callers check). */
function write(addressKey: string, state: BridgeState): boolean {
  try {
    localStorage.setItem(KEY_PREFIX + addressKey, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** A per-address handle over the persisted bridge recovery material. */
export class BridgeStore {
  public constructor(private readonly addressKey: string) {}

  // --- pending locks (bridge-in) -------------------------------------------
  public listLocks(): PendingLock[] {
    return read(this.addressKey).locks;
  }

  public pendingMints(): PendingLock[] {
    return this.listLocks().filter((l) => l.status === 'locking' || l.status === 'locked');
  }

  /**
   * Persist a pending lock. Returns `false` if storage was unavailable — the
   * bridge-in caller treats that as fail-closed and refuses to lock (08 §1.5),
   * since a lock with no recorded salt is unmintable.
   */
  public persistPendingLock(lock: PendingLock): boolean {
    const state = read(this.addressKey);
    const i = state.locks.findIndex((l) => l.id === lock.id);
    if (i >= 0) state.locks[i] = lock;
    else state.locks.push(lock);
    return write(this.addressKey, state);
  }

  public updateLock(id: string, patch: Partial<PendingLock>): void {
    const state = read(this.addressKey);
    const i = state.locks.findIndex((l) => l.id === id);
    if (i < 0) return;
    state.locks[i] = { ...state.locks[i], ...patch };
    write(this.addressKey, state);
  }

  public removeLock(id: string): void {
    const state = read(this.addressKey);
    state.locks = state.locks.filter((l) => l.id !== id);
    write(this.addressKey, state);
  }

  // --- pending returns (bridge-back) ---------------------------------------
  public listReturns(): PendingReturn[] {
    return read(this.addressKey).returns;
  }

  public activeReturns(): PendingReturn[] {
    return this.listReturns().filter((r) => r.status !== 'settled' && r.status !== 'failed');
  }

  public persistReturn(ret: PendingReturn): void {
    const state = read(this.addressKey);
    const i = state.returns.findIndex((r) => r.id === ret.id || r.nullifierHex === ret.nullifierHex);
    if (i >= 0) state.returns[i] = ret;
    else state.returns.push(ret);
    write(this.addressKey, state);
  }

  public updateReturn(id: string, patch: Partial<PendingReturn>): void {
    const state = read(this.addressKey);
    const i = state.returns.findIndex((r) => r.id === id);
    if (i < 0) return;
    state.returns[i] = { ...state.returns[i], ...patch };
    write(this.addressKey, state);
  }

  /** Export all recovery material (backup inclusion — ZK_BACK3 §13). */
  public exportAll(): BridgeState {
    return read(this.addressKey);
  }
}

/** Build a {BridgeStore} for a wallet address (chainPubkey or directAddress). */
export function bridgeStoreFor(addressKey: string): BridgeStore {
  return new BridgeStore(addressKey);
}
