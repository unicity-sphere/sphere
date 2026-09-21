import { describe, it, expect, vi } from 'vitest';
import {
  createTronSourceAdapter,
  loadBridges,
  NILE_USDT_BRIDGE,
  type BridgeSourceAdapter,
  type TronCall,
  type TronSigner,
} from '@unicitylabs/bridge-plugin-tron-usdt/wallet';
import { LOCK_EVENT_TOPIC0, type TronTxInfo } from '@unicitylabs/bridge-plugin-tron-usdt';
import type { BridgePayments, ReceiptReader } from '@unicitylabs/bridge-core';

import { runBridgeIn, resumeBridgeMint, TxRevertedError, type WalletSide } from '@/modules/bridge/bridgeIn';
import type { BridgeStore, PendingLock } from '@/modules/bridge/store';

const bridge = loadBridges(NILE_USDT_BRIDGE)[0];
const VAULT_HEX = bridge.plugin.resolvedConfig.lockContractHex;
const CHAIN = bridge.manifest.chainId;
const OWNER = 'TMckEpYxv8QA7oL36FvFRR7Gg1bL5DHsbt';
const PUBKEY = fromHex('0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798');
const AMOUNT = 1_000_000n;
const APPROVE_TX = 'bb'.repeat(32);
const LOCK_TX = 'aa'.repeat(32);

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function fakePayments() {
  return {
    mintCustom: vi.fn(async () => ({ success: true, tokenId: 'MINTED' })),
  } as unknown as BridgePayments;
}

const okReceipt: TronTxInfo = { blockNumber: 10n, success: true, logs: [] };
const revertedReceipt: TronTxInfo = { blockNumber: 10n, success: false, logs: [] };
const lockMined: TronTxInfo = {
  blockNumber: 12n,
  success: true,
  logs: [{ address: VAULT_HEX, topics: [LOCK_EVENT_TOPIC0, '0'.repeat(64), '0'.repeat(64)], data: '0'.repeat(192) }],
};
const lockReverted: TronTxInfo = { blockNumber: 12n, success: false, logs: [] };

type FakeRpc = {
  triggerConstantContract(): Promise<string>;
  getTransactionInfo(txid: string): Promise<TronTxInfo | null>;
};
function fakeRpc(
  opts: { allowance: bigint; approve?: TronTxInfo | null; lock?: TronTxInfo | null },
  timeline: string[] = [],
): FakeRpc {
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

const receiptsOf = (rpc: FakeRpc): ReceiptReader => ({ getReceipt: (txid) => rpc.getTransactionInfo(txid) });
const tronAdapterOf = (signer: TronSigner, rpc: FakeRpc): BridgeSourceAdapter => createTronSourceAdapter(bridge, signer, rpc);

class FakeSigner implements TronSigner {
  public account = OWNER;
  public network = CHAIN;
  public readonly sent: TronCall[] = [];
  public afterSend?: (sig: string) => void;
  private readonly timeline: string[];
  public constructor(timeline: string[] = []) {
    this.timeline = timeline;
  }
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

function walletSide(store: FakeStore, payments = fakePayments()): WalletSide {
  return { payments, recipientPubkey: PUBKEY, networkId: 4, store: asStore(store) };
}

function run(over: { signer: FakeSigner; store: FakeStore; rpc: FakeRpc; payments?: BridgePayments }) {
  return runBridgeIn({
    ...walletSide(over.store, over.payments),
    wallet: over.signer,
    receipts: receiptsOf(over.rpc),
    adapter: tronAdapterOf(over.signer, over.rpc),
    expectedNetwork: CHAIN,
    chainLabel: bridge.manifest.label,
    amount: AMOUNT,
  });
}

describe('runBridgeIn', () => {
  it('skips approve when the allowance already covers the amount (one lock prompt)', async () => {
    const signer = new FakeSigner();
    const store = new FakeStore();
    const payments = fakePayments();
    const res = await run({ signer, store, rpc: fakeRpc({ allowance: 2_000_000n }), payments });

    expect(signer.sigs()).toEqual(['lock']);
    expect(res).toEqual({ tokenId: 'MINTED', amount: AMOUNT });
    expect(store.locks.size).toBe(0);
    const mint = (payments.mintCustom as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(mint.assets).toEqual([{ coinId: bridge.plugin.coinIdHex, amount: AMOUNT }]);
    expect(mint.mintJustificationVerifiers).toHaveLength(1);
  });

  it('approves then locks, waiting for the approve receipt before the lock', async () => {
    const timeline: string[] = [];
    const signer = new FakeSigner(timeline);
    const store = new FakeStore();
    await run({ signer, store, rpc: fakeRpc({ allowance: 0n }, timeline) });

    expect(signer.sigs()).toEqual(['approve', 'lock']);
    expect(timeline.indexOf('send:lock')).toBeGreaterThan(timeline.indexOf('receipt:' + APPROVE_TX));
    const approve = signer.sent[0];
    expect(approve.functionSignature.startsWith('approve')).toBe(true);
    expect(approve.parameters.map((p) => String(p.value))).toContain(AMOUNT.toString());
  });

  it('fails fast on a reverted approval and never locks', async () => {
    const signer = new FakeSigner();
    const store = new FakeStore();
    await expect(run({ signer, store, rpc: fakeRpc({ allowance: 0n, approve: revertedReceipt }) })).rejects.toBeInstanceOf(TxRevertedError);

    expect(signer.sigs()).toEqual(['approve']);
    expect(store.locks.size).toBe(0);
  });

  it('blocks before any signing when the wallet is on the wrong network', async () => {
    const signer = new FakeSigner();
    signer.network = CHAIN + 1;
    const store = new FakeStore();
    await expect(run({ signer, store, rpc: fakeRpc({ allowance: 0n }) })).rejects.toThrow(/Wrong network/);

    expect(signer.sent).toHaveLength(0);
    expect(store.locks.size).toBe(0);
  });

  it('aborts if the account changes mid-flow, before the lock', async () => {
    const signer = new FakeSigner();
    signer.afterSend = (sig) => {
      if (sig.startsWith('approve')) signer.account = 'TSomeOtherAccount000000000000000000';
    };
    const store = new FakeStore();
    await expect(run({ signer, store, rpc: fakeRpc({ allowance: 0n }) })).rejects.toThrow(/account changed/);

    expect(signer.sigs()).toEqual(['approve']);
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
    await expect(run({ signer, store, rpc: fakeRpc({ allowance: 2_000_000n, lock: lockReverted }) })).rejects.toBeInstanceOf(TxRevertedError);

    const rec = store.only();
    expect(rec.lockTxid).toBe(LOCK_TX);
    expect(rec.status).toBe('failed');
  });

  it('keeps the record when the mint fails after a confirmed lock (the resumable case)', async () => {
    const signer = new FakeSigner();
    const store = new FakeStore();
    const payments = { mintCustom: vi.fn(async () => ({ success: false, error: 'aggregator down' })) } as unknown as BridgePayments;
    await expect(run({ signer, store, rpc: fakeRpc({ allowance: 2_000_000n }), payments })).rejects.toThrow(/aggregator down/);

    expect(store.only()).toMatchObject({ status: 'locked', lockTxid: LOCK_TX });
  });
});

describe('runBridgeIn is chain-neutral (opaque adapter steps)', () => {
  it('runs a single-signature deposit strategy through the same orchestration', async () => {
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

    const signer = new FakeSigner();
    const store = new FakeStore();
    const res = await runBridgeIn({
      ...walletSide(store),
      wallet: signer,
      receipts: receiptsOf(fakeRpc({ allowance: 0n, lock: { blockNumber: 2n, success: true, logs: [] } })),
      adapter,
      expectedNetwork: CHAIN,
      chainLabel: bridge.manifest.label,
      amount: AMOUNT,
    });

    expect(adapterSends).toEqual(['authorize']);
    expect(signer.sent).toHaveLength(0);
    expect(buildMintRequest).toHaveBeenCalledTimes(1);
    expect(res).toEqual({ tokenId: 'MINTED', amount: AMOUNT });
    expect(store.locks.size).toBe(0);
  });
});

describe('resumeBridgeMint', () => {
  const pendingLock = (): PendingLock => ({
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
  });

  it('marks a reverted lock failed instead of leaving it pending', async () => {
    const store = new FakeStore();
    const lock = pendingLock();
    store.locks.set(lock.id, lock);
    const rpc = fakeRpc({ allowance: 0n, lock: lockReverted });
    await expect(
      resumeBridgeMint({ payments: fakePayments(), adapter: tronAdapterOf(new FakeSigner(), rpc), receipts: receiptsOf(rpc), store: asStore(store), lock }),
    ).rejects.toBeInstanceOf(TxRevertedError);

    expect(store.locks.get('lock-1')?.status).toBe('failed');
  });

  it('mints a landed lock and clears the record, without signing', async () => {
    const store = new FakeStore();
    const lock = pendingLock();
    store.locks.set(lock.id, lock);
    const rpc = fakeRpc({ allowance: 0n });
    const signer = new FakeSigner();
    const res = await resumeBridgeMint({ payments: fakePayments(), adapter: tronAdapterOf(signer, rpc), receipts: receiptsOf(rpc), store: asStore(store), lock });

    expect(res).toEqual({ tokenId: 'MINTED', amount: AMOUNT });
    expect(signer.sent).toHaveLength(0);
    expect(store.locks.size).toBe(0);
  });
});
