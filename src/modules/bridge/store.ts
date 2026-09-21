const KEY_PREFIX = 'sphere_bridge_';

export interface PendingLock {
  readonly id: string;
  readonly coinIdHex: string;
  readonly tokenTypeHex: string;
  readonly chainId: number;
  nonce?: number;
  readonly saltHex: string;
  readonly tokenIdHex: string;
  readonly recipientCommitmentHex: string;
  readonly amount: string;
  lockTxid?: string;
  lockBlock?: number;
  logIndex?: number;
  readonly createdAt: number;
  status: 'locking' | 'locked' | 'minted' | 'failed';
}

interface BridgeState {
  locks: PendingLock[];
}

function read(key: string): BridgeState {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + key);
    if (!raw) return { locks: [] };
    const parsed = JSON.parse(raw) as Partial<BridgeState>;
    return { locks: parsed.locks ?? [] };
  } catch {
    return { locks: [] };
  }
}

function write(key: string, state: BridgeState): boolean {
  try {
    localStorage.setItem(KEY_PREFIX + key, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export class BridgeStore {
  private readonly key: string;

  public constructor(identityKey: string) {
    this.key = identityKey;
  }

  public listLocks(): PendingLock[] {
    return read(this.key).locks;
  }

  public pendingMints(): PendingLock[] {
    return this.listLocks().filter((l) => l.status === 'locking' || l.status === 'locked');
  }

  public getLock(id: string): PendingLock | undefined {
    return this.listLocks().find((l) => l.id === id);
  }

  public persistPendingLock(lock: PendingLock): boolean {
    const state = read(this.key);
    state.locks = [...state.locks.filter((l) => l.id !== lock.id), lock];
    return write(this.key, state);
  }

  public updateLock(id: string, patch: Partial<PendingLock>): void {
    const state = read(this.key);
    state.locks = state.locks.map((l) => (l.id === id ? { ...l, ...patch } : l));
    write(this.key, state);
  }

  public removeLock(id: string): void {
    const state = read(this.key);
    state.locks = state.locks.filter((l) => l.id !== id);
    write(this.key, state);
  }
}

export function bridgeStoreFor(identityKey: string): BridgeStore {
  return new BridgeStore(identityKey);
}
