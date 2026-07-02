/**
 * Bridge-in orchestration tests (08 Phase 2 — the absent §W2 tests). Exercises
 * the decisions runBridgeIn owns, against a fake signer / node / store and a real
 * LoadedBridge (NILE_USDT_BRIDGE) with a stubbed sphere.payments.bridgeMint:
 * allowance-skip, approve→lock receipt sequencing, wrong-network + mid-flow drift
 * guards, fail-closed persist, and terminal pending-record handling.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  loadBridges,
  NILE_USDT_BRIDGE,
  type BridgeSourceAdapter,
  type TronCall,
  type TronSigner,
} from '@unicitylabs/bridge-plugin-tron-usdt/lib/wallet/index.js';
import { LOCK_EVENT_TOPIC0, type TronTxInfo } from '@unicitylabs/bridge-plugin-tron-usdt';
import type { Sphere } from '@unicitylabs/sphere-sdk';

import { runBridgeIn, resumeBridgeMint, TxRevertedError, type BridgeInRpc } from '@/bridge/bridgeIn';
import type { BridgeStore, PendingLock } from '@/bridge/store';

const bridge = loadBridges(NILE_USDT_BRIDGE)[0];
const VAULT_HEX = bridge.plugin.resolvedConfig.lockContractHex;
const CHAIN = bridge.manifest.chainId;
const OWNER = 'TMckEpYxv8QA7oL36FvFRR7Gg1bL5DHsbt';
// A valid compressed secp256k1 point (generator G) — a plausible chain pubkey.
const PUBKEY = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
const AMOUNT = 1_000_000n; // 1 USDT (6 decimals)
// Tron txids are 32-byte hex (mintFromLock does fromHex on the lock txid).
const APPROVE_TX = 'bb'.repeat(32);
const LOCK_TX = 'aa'.repeat(32);

function fakeSphere() {
  return {
    identity: { chainPubkey: PUBKEY },
    payments: { bridgeMint: vi.fn(async () => ({ success: true, tokenId: 'MINTED' })) },
  } as unknown as Sphere;
}

const okReceipt: TronTxInfo = { blockNumber: 10n, success: true, logs: [] };
const revertedReceipt: TronTxInfo = { blockNumber: 10n, success: false, logs: [] };
const lockMined: TronTxInfo = {
  blockNumber: 12n,
  success: true,
  logs: [{ address: VAULT_HEX, topics: [LOCK_EVENT_TOPIC0, '0'.repeat(64), '0'.repeat(64)], data: '0'.repeat(192) }],
};
const lockReverted: TronTxInfo = { blockNumber: 12n, success: false, logs: [] };

/** Fake node: a fixed allowance + per-txid receipts, recording read order. */
function fakeRpc(
  opts: { allowance: bigint; approve?: TronTxInfo | null; lock?: TronTxInfo | null },
  timeline: string[] = [],
): BridgeInRpc {
  return {
    async triggerConstantContract() {
      return opts.allowance.toString(16).padStart(64, '0');
    },
    async getTransactionInfo(txid: string): Promise<TronTxInfo | null> {
      timeline.push('receipt:' + txid);
      return txid === APPROVE_TX ? (opts.approve ?? okReceipt) : (opts.lock ?? lockMined);
    },
  };
}

class FakeSigner implements TronSigner {
  public account = OWNER;
  public network = CHAIN;
  public readonly sent: TronCall[] = [];
  /** Fires after each send — used to simulate a mid-flow account/network switch. */
  public afterSend?: (sig: string) => void;
  public constructor(private readonly timeline: string[] = []) {}
  async connect() {
    return this.account;
  }
  async getAddress() {
    return this.account;
  }
  async getNetwork() {
    return this.network;
  }
  async sendCall(call: TronCall) {
    this.sent.push(call);
    const kind = call.functionSignature.startsWith('approve') ? 'approve' : 'lock';
    this.timeline.push('send:' + kind);
    this.afterSend?.(call.functionSignature);
    return kind === 'approve' ? APPROVE_TX : LOCK_TX;
  }
  sigs() {
    return this.sent.map((c) => c.functionSignature.split('(')[0]);
  }
}

class FakeStore {
  public readonly locks = new Map<string, PendingLock>();
  public failPersist = false;
  persistPendingLock(l: PendingLock): boolean {
    if (this.failPersist) return false;
    this.locks.set(l.id, { ...l });
    return true;
  }
  updateLock(id: string, patch: Partial<PendingLock>): void {
    const cur = this.locks.get(id);
    if (cur) this.locks.set(id, { ...cur, ...patch });
  }
  removeLock(id: string): void {
    this.locks.delete(id);
  }
  only(): PendingLock {
    return [...this.locks.values()][0];
  }
}

const asStore = (s: FakeStore) => s as unknown as BridgeStore;

function run(over: {
  signer: FakeSigner;
  store: FakeStore;
  rpc: BridgeInRpc;
  approveAmount?: bigint;
  sphere?: Sphere;
}) {
  return runBridgeIn({
    sphere: over.sphere ?? fakeSphere(),
    bridge,
    signer: over.signer,
    store: asStore(over.store),
    amount: AMOUNT,
    networkId: 4,
    approveAmount: over.approveAmount,
    rpc: over.rpc,
  });
}

describe('runBridgeIn', () => {
  it('skips approve when allowance already covers the amount (single lock prompt)', async () => {
    const signer = new FakeSigner();
    const store = new FakeStore();
    const res = await run({ signer, store, rpc: fakeRpc({ allowance: 2_000_000n }) });

    expect(signer.sigs()).toEqual(['lock']);
    expect(res).toEqual({ tokenId: 'MINTED', amount: AMOUNT });
    expect(store.locks.size).toBe(0); // record removed after a successful mint
  });

  it('approves then locks, waiting for the approve receipt before the lock', async () => {
    const timeline: string[] = [];
    const signer = new FakeSigner(timeline);
    const store = new FakeStore();
    await run({ signer, store, rpc: fakeRpc({ allowance: 0n }, timeline) });

    expect(signer.sigs()).toEqual(['approve', 'lock']);
    // The lock is sent only after the approval receipt confirmed.
    expect(timeline.indexOf('send:lock')).toBeGreaterThan(timeline.indexOf('receipt:' + APPROVE_TX));
  });

  it('fails fast on a reverted approval and never locks', async () => {
    const signer = new FakeSigner();
    const store = new FakeStore();
    await expect(
      run({ signer, store, rpc: fakeRpc({ allowance: 0n, approve: revertedReceipt }) }),
    ).rejects.toBeInstanceOf(TxRevertedError);

    expect(signer.sigs()).toEqual(['approve']); // lock never sent
    expect(store.locks.size).toBe(0); // no confirmed lock -> intent dropped
  });

  it('blocks before any signing when the wallet is on the wrong network', async () => {
    const signer = new FakeSigner();
    signer.network = CHAIN + 1;
    const store = new FakeStore();
    await expect(run({ signer, store, rpc: fakeRpc({ allowance: 0n }) })).rejects.toThrow(/Wrong Tron network/);

    expect(signer.sent).toHaveLength(0);
    expect(store.locks.size).toBe(0); // never even persisted
  });

  it('aborts if the account changes mid-flow, before the lock', async () => {
    const signer = new FakeSigner();
    signer.afterSend = (sig) => {
      if (sig.startsWith('approve')) signer.account = 'TSomeOtherAccount000000000000000000';
    };
    const store = new FakeStore();
    await expect(run({ signer, store, rpc: fakeRpc({ allowance: 0n }) })).rejects.toThrow(/account changed/);

    expect(signer.sigs()).toEqual(['approve']); // lock guarded out
    expect(store.locks.size).toBe(0);
  });

  it('is fail-closed: refuses to lock if the pending intent could not be persisted', async () => {
    const signer = new FakeSigner();
    const store = new FakeStore();
    store.failPersist = true;
    await expect(run({ signer, store, rpc: fakeRpc({ allowance: 2_000_000n }) })).rejects.toThrow(/Could not save/);

    expect(signer.sent).toHaveLength(0);
  });

  it('marks the record failed when a broadcast lock reverts on-chain', async () => {
    const signer = new FakeSigner();
    const store = new FakeStore();
    await expect(
      run({ signer, store, rpc: fakeRpc({ allowance: 2_000_000n, lock: lockReverted }) }),
    ).rejects.toBeInstanceOf(TxRevertedError);

    const rec = store.only();
    expect(rec.lockTxid).toBe(LOCK_TX);
    expect(rec.status).toBe('failed'); // kept but terminal, not a zombie pending mint
  });
});

describe('runBridgeIn is chain-neutral (opaque adapter steps)', () => {
  it('runs a single-signature deposit strategy through the same orchestration', async () => {
    // A fake second-chain adapter: one opaque step, no approve/allowance — the
    // EIP-3009-style single-signature deposit. Sphere must run it unchanged.
    const adapterSends: string[] = [];
    const buildMintRequest = vi.fn(() => ({}) as never);
    const adapter: BridgeSourceAdapter = {
      async prepareDeposit() {
        return {
          recovery: {
            tokenIdHex: 'ab'.repeat(32),
            saltHex: 'cd'.repeat(32),
            recipientCommitmentHex: 'ef'.repeat(32),
            coinIdHex: '12'.repeat(32),
            tokenTypeHex: '34'.repeat(32),
            chainId: CHAIN,
          },
          steps: [
            {
              label: 'Authorize deposit (single signature)…',
              awaitReceipt: false,
              send: async () => {
                adapterSends.push('authorize');
                return 'a1'.repeat(32);
              },
            },
          ],
          commitIndex: 0,
        };
      },
      decodeCommit: () => ({ nonce: 1n, blockNumber: 2n, logIndex: 0 }),
      buildMintRequest,
    };

    const signer = new FakeSigner(); // used only for connect + guard (account/network)
    const store = new FakeStore();
    const sphere = fakeSphere();
    const res = await runBridgeIn({
      sphere,
      bridge,
      signer,
      store: asStore(store),
      amount: AMOUNT,
      networkId: 4,
      adapter,
      // committing receipt is a plain success; the fake adapter's decodeCommit ignores it
      rpc: fakeRpc({ allowance: 0n, lock: { blockNumber: 2n, success: true, logs: [] } }),
    });

    expect(adapterSends).toEqual(['authorize']); // one signature, no approve step
    expect(signer.sent).toHaveLength(0); // Sphere signed via the opaque step, not the Tron signer
    expect(buildMintRequest).toHaveBeenCalledTimes(1);
    expect(res).toEqual({ tokenId: 'MINTED', amount: AMOUNT });
    expect(store.locks.size).toBe(0);
  });
});

describe('resumeBridgeMint', () => {
  it('marks a reverted lock failed instead of leaving it pending', async () => {
    const store = new FakeStore();
    const lock: PendingLock = {
      id: 'lock-1',
      coinIdHex: bridge.plugin.coinIdHex,
      tokenTypeHex: bridge.plugin.tokenTypeHex,
      chainId: CHAIN,
      saltHex: '00'.repeat(32),
      tokenIdHex: '11'.repeat(32),
      recipientCommitmentHex: '22'.repeat(32),
      amount: AMOUNT.toString(),
      lockTxid: LOCK_TX,
      createdAt: Date.now(),
      status: 'locking',
    };
    store.locks.set(lock.id, lock);

    await expect(
      resumeBridgeMint(fakeSphere(), bridge, asStore(store), lock, fakeRpc({ allowance: 0n, lock: lockReverted })),
    ).rejects.toBeInstanceOf(TxRevertedError);

    expect(store.locks.get('lock-1')?.status).toBe('failed');
  });
});
