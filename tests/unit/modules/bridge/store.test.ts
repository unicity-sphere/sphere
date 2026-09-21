import { describe, it, expect, beforeEach } from 'vitest';
import { bridgeStoreFor, type PendingLock } from '@/modules/bridge/store';

const lock = (id: string, status: PendingLock['status'] = 'locking'): PendingLock => ({
  id,
  coinIdHex: 'aa'.repeat(32),
  tokenTypeHex: 'bb'.repeat(32),
  chainId: 1,
  saltHex: 'cc'.repeat(32),
  tokenIdHex: id,
  recipientCommitmentHex: 'dd'.repeat(32),
  amount: '1000000',
  createdAt: 1,
  status,
});

describe('bridge recovery store', () => {
  beforeEach(() => localStorage.clear());

  it('keeps records per identity', () => {
    bridgeStoreFor('alice').persistPendingLock(lock('a'));
    expect(bridgeStoreFor('alice').listLocks().map((l) => l.id)).toEqual(['a']);
    expect(bridgeStoreFor('bob').listLocks()).toEqual([]);
  });

  it('lists only unfinished deposits as pending mints', () => {
    const store = bridgeStoreFor('alice');
    store.persistPendingLock(lock('signed', 'locking'));
    store.persistPendingLock(lock('mined', 'locked'));
    store.persistPendingLock(lock('done', 'minted'));
    store.persistPendingLock(lock('dead', 'failed'));
    expect(store.pendingMints().map((l) => l.id).sort()).toEqual(['mined', 'signed']);
  });

  it('patches and removes by id', () => {
    const store = bridgeStoreFor('alice');
    store.persistPendingLock(lock('a'));
    store.updateLock('a', { lockTxid: 'tx', status: 'locked' });
    expect(store.getLock('a')).toMatchObject({ lockTxid: 'tx', status: 'locked' });
    store.removeLock('a');
    expect(store.getLock('a')).toBeUndefined();
  });

  it('uses the wallet prefix so wallet deletion clears it', () => {
    bridgeStoreFor('alice').persistPendingLock(lock('a'));
    expect(Object.keys(localStorage).every((k) => k.startsWith('sphere_'))).toBe(true);
  });
});

describe('bridge recovery store: returns', () => {
  const ret = (id: string, status: 'burned' | 'settled' = 'burned') => ({
    id, coinIdHex: 'aa'.repeat(32), assetId: 'a', burnedTokenHex: '01', reasonBytesHex: '02', destination: 'T', amount: '1', createdAt: 1, status,
  });

  it('keeps returns beside locks, per identity', () => {
    localStorage.clear();
    const store = bridgeStoreFor('alice');
    store.persistPendingLock(lock('l'));
    store.persistReturn(ret('r'));
    expect(store.listLocks().map((l) => l.id)).toEqual(['l']);
    expect(store.listReturns().map((r) => r.id)).toEqual(['r']);
    expect(bridgeStoreFor('bob').listReturns()).toEqual([]);
  });

  it('lists only unfinished returns as active and refuses to remove them', () => {
    localStorage.clear();
    const store = bridgeStoreFor('alice');
    store.persistReturn(ret('open'));
    store.persistReturn(ret('done', 'settled'));
    expect(store.activeReturns().map((r) => r.id)).toEqual(['open']);
    expect(store.removeReturn('open')).toBe(false);
    expect(store.removeReturn('done')).toBe(true);
  });
});
