import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BridgePayments } from '@unicitylabs/bridge-core';

import { toHex } from '@unicitylabs/bridge-plugin';
import { logger } from '@unicitylabs/sphere-sdk';

import { recoverBurns, RETRY_DELAY_MS, retryReturn, runBridgeOut, syncReturns } from '@/modules/bridge/bridgeOut';
import { bridgeStoreFor } from '@/modules/bridge/store';
import type { BridgeAsset, BridgeReturnService, ReturnServiceRecord } from '@/modules/bridge/types';

const BLOB = new Uint8Array([1, 2, 3, 4]);
const NULLIFIER = 'ab'.repeat(32);

function fakeService(over: Partial<BridgeReturnService> = {}): BridgeReturnService & { submitted: number } {
  const svc = {
    submitted: 0,
    submit: vi.fn(async (): Promise<ReturnServiceRecord> => {
      svc.submitted += 1;
      return { returnId: 'r-1', status: 'queued' };
    }),
    status: vi.fn(async (): Promise<ReturnServiceRecord | null> => ({ returnId: 'r-1', status: 'proving' })),
    refusal: () => null,
    timing: async () => null,
    ...over,
  };
  return svc;
}

function fakeAsset(service: BridgeReturnService, over: Partial<BridgeAsset> = {}): BridgeAsset {
  return {
    id: 'test:usdx',
    label: 'USDX (bridged · Test)',
    symbol: 'USDX',
    decimals: 6,
    coinIdHex: 'cd'.repeat(32),
    tokenTypeHex: 'ef'.repeat(32),
    chain: { id: 'test:1', name: 'Test', networkName: 'testnet', testnet: true },
    confirmations: 1,
    networks: ['testnet2'],
    tokenPlugin: { id: 'test', mintJustificationVerifiers: [], tokenIssuancePolicies: [] },
    presentation: { explorerTxUrl: (tx) => `https://x/${tx}`, explorerAddressUrl: (a) => `https://x/address/${a}`, validateAddress: (a) => a.startsWith('T') },
    wallets: () => [],
    resumeDeps: () => { throw new Error('unused'); },
    out: {
      fee: async () => 2n,
      reasonFor: async ({ amount }) => new Uint8Array([Number(amount & 0xffn)]),
      identify: async (blob) => (blob[0] === 1 ? { nullifierHex: NULLIFIER, destination: 'Tdest', amount: 7n, fee: 2n, reasonBytes: new Uint8Array([7]) } : null),
      backs: () => true,
      returns: service,
    },
    ...over,
  };
}

function fakePayments(over: Partial<BridgePayments> = {}) {
  const p = {
    acknowledged: [] as string[],
    burn: vi.fn(async () => ({ success: true, burnId: 'b-1', tokenId: 't-1', burnedToken: BLOB })),
    acknowledgeBurn: vi.fn(async (id: string) => { p.acknowledged.push(id); }),
    pendingBurns: vi.fn(async () => []),
    mintCustom: vi.fn(),
    ...over,
  };
  return p as unknown as BridgePayments & { acknowledged: string[] };
}

beforeEach(() => localStorage.clear());

describe('runBridgeOut', () => {
  it('burns, records the blob, releases the wallet copy, then submits', async () => {
    const service = fakeService();
    const store = bridgeStoreFor('alice');
    const payments = fakePayments();
    const rec = await runBridgeOut({ payments, store, asset: fakeAsset(service), tokenId: 't-1', amount: 7n, maxFee: 3n, destination: 'Tdest' });

    expect(payments.acknowledged).toEqual(['b-1']);
    expect(rec).toMatchObject({ id: NULLIFIER, returnId: 'r-1', status: 'queued', burnedTokenHex: toHex(BLOB), destination: 'Tdest', amount: '7' });
    expect(store.getReturn(NULLIFIER)?.status).toBe('queued');
  });

  it('builds the reason within the fee the user approved and records the fee the burn pays', async () => {
    const asset = fakeAsset(fakeService());
    const reasonFor = vi.spyOn(asset.out!, 'reasonFor');
    const rec = await runBridgeOut({ payments: fakePayments(), store: bridgeStoreFor('alice'), asset, tokenId: 't-1', amount: 7n, maxFee: 3n, destination: 'Tdest' });

    expect(reasonFor).toHaveBeenCalledWith({ amount: 7n, destination: 'Tdest', maxFee: 3n });
    expect(rec.fee).toBe('2');
  });

  it('burns nothing when the fee terms are refused', async () => {
    const store = bridgeStoreFor('alice');
    const payments = fakePayments();
    const asset = fakeAsset(fakeService());
    asset.out!.reasonFor = async () => {
      throw new Error('The return service asks a fee above the one approved.');
    };

    await expect(
      runBridgeOut({ payments, store, asset, tokenId: 't-1', amount: 7n, maxFee: 3n, destination: 'Tdest' }),
    ).rejects.toThrow(/above the one approved/);
    expect(payments.burn).not.toHaveBeenCalled();
    expect(store.listReturns()).toEqual([]);
  });

  it('refuses an invalid destination before burning anything', async () => {
    const payments = fakePayments();
    await expect(
      runBridgeOut({ payments, store: bridgeStoreFor('alice'), asset: fakeAsset(fakeService()), tokenId: 't-1', amount: 7n, maxFee: 3n, destination: 'nope' }),
    ).rejects.toThrow(/valid Test destination/);
    expect(payments.burn).not.toHaveBeenCalled();
  });

  it('keeps the wallet copy when the record cannot be written', async () => {
    const store = bridgeStoreFor('alice');
    vi.spyOn(store, 'persistReturn').mockReturnValue(false);
    const payments = fakePayments();
    await expect(
      runBridgeOut({ payments, store, asset: fakeAsset(fakeService()), tokenId: 't-1', amount: 7n, maxFee: 3n, destination: 'Tdest' }),
    ).rejects.toThrow(/keeps it/);
    expect(payments.acknowledged).toEqual([]);
  });

  it('keeps a return whose submission failed outright, with the error as its reason, and resubmits it only after the retry delay', async () => {
    const service = fakeService({ submit: vi.fn(async () => { service.submitted += 1; throw new Error('ECONNREFUSED'); }) });
    const store = bridgeStoreFor('alice');
    const asset = fakeAsset(service);
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);

    const rec = await runBridgeOut({ payments: fakePayments(), store, asset, tokenId: 't-1', amount: 7n, maxFee: 3n, destination: 'Tdest' });
    expect(rec).toMatchObject({ status: 'failed', recoverable: true, message: 'The return was not submitted: ECONNREFUSED', failedAt: 1_000_000 });
    expect(rec.returnId).toBeUndefined();

    clock.mockReturnValue(1_000_000 + RETRY_DELAY_MS - 1);
    await syncReturns(store, () => asset);
    expect(service.submitted).toBe(1);

    (service.submit as ReturnType<typeof vi.fn>).mockImplementation(async () => { service.submitted += 1; return { returnId: 'r-2', status: 'queued' }; });
    clock.mockReturnValue(1_000_000 + RETRY_DELAY_MS);
    const after = await syncReturns(store, () => asset);
    expect(service.submitted).toBe(2);
    expect(after[0]).toMatchObject({ returnId: 'r-2', status: 'queued' });
    clock.mockRestore();
  });

  it('keeps a refusal the service may lift, with its reason, and resubmits it only after the retry delay', async () => {
    const service = fakeService({
      submit: vi.fn(async () => { service.submitted += 1; throw new Error('chain not synced'); }),
      refusal: (e) => ({ message: (e as Error).message, recoverable: true }),
    });
    const store = bridgeStoreFor('alice');
    const asset = fakeAsset(service);
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);

    const rec = await runBridgeOut({ payments: fakePayments(), store, asset, tokenId: 't-1', amount: 7n, maxFee: 3n, destination: 'Tdest' });
    expect(rec).toMatchObject({ status: 'failed', recoverable: true, message: 'chain not synced', failedAt: 1_000_000 });
    expect(store.activeReturns().map((r) => r.id)).toEqual([NULLIFIER]);
    expect(service.submitted).toBe(1);

    clock.mockReturnValue(1_000_000 + RETRY_DELAY_MS - 1);
    await syncReturns(store, () => asset);
    expect(service.submitted).toBe(1);

    (service.submit as ReturnType<typeof vi.fn>).mockImplementation(async () => { service.submitted += 1; return { returnId: 'r-2', status: 'queued' }; });
    clock.mockReturnValue(1_000_000 + RETRY_DELAY_MS);
    const after = await syncReturns(store, () => asset);
    expect(service.submitted).toBe(2);
    expect(after[0]).toMatchObject({ returnId: 'r-2', status: 'queued' });
    clock.mockRestore();
  });

  it('marks a return failed when the service says the blob will never be accepted', async () => {
    const service = fakeService({
      submit: vi.fn(async () => { throw new Error('config hash mismatch'); }),
      refusal: (e) => ({ message: (e as Error).message, recoverable: false }),
    });
    const store = bridgeStoreFor('alice');
    const rec = await runBridgeOut({ payments: fakePayments(), store, asset: fakeAsset(service), tokenId: 't-1', amount: 7n, maxFee: 3n, destination: 'Tdest' });
    expect(rec).toMatchObject({ status: 'failed', message: 'config hash mismatch' });
    expect(store.getReturn(NULLIFIER)?.burnedTokenHex).toBe(toHex(BLOB));
  });
});

describe('syncReturns', () => {
  it('refreshes open returns and resubmits one the service forgot', async () => {
    const service = fakeService({ status: vi.fn(async (id: string) => (id === 'gone' ? null : { returnId: id, status: 'settled' as const, settleTxid: 'tx9' })) });
    const store = bridgeStoreFor('alice');
    const asset = fakeAsset(service);
    const base = { coinIdHex: asset.coinIdHex, assetId: asset.id, burnedTokenHex: toHex(BLOB), reasonBytesHex: '07', destination: 'Tdest', amount: '7', createdAt: 1 };
    store.persistReturn({ ...base, id: 'n1', returnId: 'r-1', status: 'proving' });
    store.persistReturn({ ...base, id: 'n2', returnId: 'gone', status: 'queued' });

    const after = await syncReturns(store, () => asset);
    expect(after.find((r) => r.id === 'n1')).toMatchObject({ status: 'settled', settleTxid: 'tx9' });
    expect(after.find((r) => r.id === 'n2')).toMatchObject({ returnId: 'r-1', status: 'queued' });
    expect(service.submitted).toBe(1);
  });

  it('never submits a stored blob whose hex is corrupt as zero bytes', async () => {
    const service = fakeService();
    const store = bridgeStoreFor('alice');
    const asset = fakeAsset(service);
    store.persistReturn({ id: 'n1', coinIdHex: asset.coinIdHex, assetId: asset.id, burnedTokenHex: 'zz', reasonBytesHex: '07', destination: 'Tdest', amount: '7', createdAt: 1, status: 'burned' });

    await syncReturns(store, () => asset);
    expect(service.submit).not.toHaveBeenCalled();
  });

  it('a return the service no longer knows is re-posted once, and a refusal of that post waits out the retry delay', async () => {
    const service = fakeService({
      status: vi.fn(async () => null),
      submit: vi.fn(async () => { service.submitted += 1; throw new Error('chain not synced'); }),
      refusal: (e) => ({ message: (e as Error).message, recoverable: true }),
    });
    const store = bridgeStoreFor('alice');
    const asset = fakeAsset(service);
    store.persistReturn({ id: 'n1', coinIdHex: asset.coinIdHex, assetId: asset.id, burnedTokenHex: toHex(BLOB), reasonBytesHex: '07', destination: 'Tdest', amount: '7', createdAt: 1, returnId: 'gone', status: 'queued' });
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);

    let after = await syncReturns(store, () => asset);
    expect(service.submitted).toBe(1);
    expect(after[0]).toMatchObject({ status: 'failed', recoverable: true, message: 'chain not synced', failedAt: 1_000_000 });
    expect(after[0].returnId).toBeUndefined();

    clock.mockReturnValue(1_000_000 + RETRY_DELAY_MS - 1);
    after = await syncReturns(store, () => asset);
    expect(service.submitted).toBe(1);

    (service.submit as ReturnType<typeof vi.fn>).mockImplementation(async () => { service.submitted += 1; return { returnId: 'r-2', status: 'queued' }; });
    clock.mockReturnValue(1_000_000 + RETRY_DELAY_MS);
    after = await syncReturns(store, () => asset);
    expect(service.submitted).toBe(2);
    expect(after[0]).toMatchObject({ returnId: 'r-2', status: 'queued' });
    clock.mockRestore();
  });

  it('keeps a return the service failed recoverably, and resubmits it once the retry delay has passed', async () => {
    const service = fakeService({
      status: vi.fn(async () => ({ returnId: 'r-1', status: 'failed' as const, message: 'out of gas', recoverable: true })),
    });
    const store = bridgeStoreFor('alice');
    const asset = fakeAsset(service);
    const base = { coinIdHex: asset.coinIdHex, assetId: asset.id, burnedTokenHex: toHex(BLOB), reasonBytesHex: '07', destination: 'Tdest', amount: '7', createdAt: 1 };
    store.persistReturn({ ...base, id: 'n1', returnId: 'r-1', status: 'proving' });
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);

    let after = await syncReturns(store, () => asset);
    expect(after[0]).toMatchObject({ status: 'failed', recoverable: true, message: 'out of gas', failedAt: 1_000_000 });
    expect(store.activeReturns().map((r) => r.id)).toEqual(['n1']);
    expect(service.submitted).toBe(0);

    clock.mockReturnValue(1_000_000 + RETRY_DELAY_MS - 1);
    after = await syncReturns(store, () => asset);
    expect(service.submitted).toBe(0);
    expect(after[0].failedAt).toBe(1_000_000);

    clock.mockReturnValue(1_000_000 + RETRY_DELAY_MS);
    after = await syncReturns(store, () => asset);
    expect(service.submitted).toBe(1);
    expect(after[0].status).toBe('queued');
    expect(after[0].recoverable).toBeUndefined();
    expect(after[0].failedAt).toBeUndefined();
    clock.mockRestore();
  });

  it('retryReturn resubmits a failed return at once', async () => {
    const service = fakeService();
    const store = bridgeStoreFor('alice');
    const asset = fakeAsset(service);
    const base = { coinIdHex: asset.coinIdHex, assetId: asset.id, burnedTokenHex: toHex(BLOB), reasonBytesHex: '07', destination: 'Tdest', amount: '7', createdAt: 1 };
    store.persistReturn({ ...base, id: 'n1', returnId: 'r-1', status: 'failed', recoverable: true, failedAt: Date.now() });

    const rec = await retryReturn(store, asset, 'n1');
    expect(service.submitted).toBe(1);
    expect(rec).toMatchObject({ status: 'queued' });
  });

  it('a final failure is not resubmitted by itself, stays until retried by hand, and cannot be dismissed', async () => {
    const service = fakeService({
      status: vi.fn(async () => ({ returnId: 'r-1', status: 'failed' as const, message: 'config mismatch', recoverable: false })),
    });
    const store = bridgeStoreFor('alice');
    const asset = fakeAsset(service);
    const base = { coinIdHex: asset.coinIdHex, assetId: asset.id, burnedTokenHex: toHex(BLOB), reasonBytesHex: '07', destination: 'Tdest', amount: '7', createdAt: 1 };
    store.persistReturn({ ...base, id: 'n1', returnId: 'r-1', status: 'queued' });

    await syncReturns(store, () => asset);
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 10 * RETRY_DELAY_MS);
    await syncReturns(store, () => asset);
    expect(service.submitted).toBe(0);
    expect(store.removeReturn('n1')).toBe(false);
    await retryReturn(store, asset, 'n1');
    expect(service.submitted).toBe(1);
    vi.restoreAllMocks();
  });

});

describe('recoverBurns', () => {
  it('turns a journaled, settled burn into a record and releases the wallet copy', async () => {
    const store = bridgeStoreFor('alice');
    const payments = fakePayments({
      pendingBurns: vi.fn(async () => [{ burnId: 'b-9', tokenId: 't-9', reasonBytes: new Uint8Array([7]), burnedToken: BLOB, settled: true }]),
    });
    const recovered = await recoverBurns(payments, store, [fakeAsset(fakeService())]);
    expect(recovered.map((r) => r.id)).toEqual([NULLIFIER]);
    expect(recovered[0]).toMatchObject({ destination: 'Tdest', amount: '7', fee: '2', status: 'burned', reasonBytesHex: '07' });
    expect(payments.acknowledged).toEqual(['b-9']);
  });

  it('submits a record saved without its reason with the reason the burned token carries', async () => {
    const service = fakeService();
    const store = bridgeStoreFor('alice');
    const asset = fakeAsset(service);
    store.persistReturn({ id: 'n1', coinIdHex: asset.coinIdHex, assetId: asset.id, burnedTokenHex: toHex(BLOB), reasonBytesHex: '', destination: 'Tdest', amount: '7', createdAt: 1, status: 'burned' });

    await syncReturns(store, () => asset);
    expect(service.submit).toHaveBeenCalledWith(BLOB, new Uint8Array([7]));
  });

  it('leaves a burn no asset recognises in the wallet', async () => {
    const store = bridgeStoreFor('alice');
    const payments = fakePayments({
      pendingBurns: vi.fn(async () => [{ burnId: 'b-x', tokenId: 't-x', reasonBytes: new Uint8Array([7]), burnedToken: new Uint8Array([9]), settled: true }]),
    });
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const recovered = await recoverBurns(payments, store, [fakeAsset(fakeService())]);
    expect(recovered).toEqual([]);
    expect(payments.acknowledged).toEqual([]);
    expect(warn).toHaveBeenCalledWith('Bridge', expect.stringContaining('b-x'));
    warn.mockRestore();
  });
});
