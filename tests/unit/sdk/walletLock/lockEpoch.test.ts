/**
 * Graceful lock §8.4: a persisted "locked at T" marker so a tab that never
 * re-runs initialize() (bfcache restore, or a hidden tab that missed the
 * BroadcastChannel message) can still notice a lock happened and catch up.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { STORAGE_KEYS } from '../../../../src/config/storageKeys';
import {
  markLockEpoch,
  clearLockEpoch,
  readLockEpoch,
  isLockPending,
} from '../../../../src/sdk/walletLock/lockEpoch';

beforeEach(() => localStorage.clear());
afterEach(() => vi.useRealTimers());

describe('lockEpoch', () => {
  it('round-trips a lock timestamp under a sphere_ prefixed key', () => {
    markLockEpoch(1_700_000_000_000);
    expect(localStorage.getItem(STORAGE_KEYS.LOCK_EPOCH)).toBe('1700000000000');
    expect(readLockEpoch()).toBe(1_700_000_000_000);
  });

  it('reads null when the wallet was never locked', () => {
    expect(readLockEpoch()).toBeNull();
    expect(isLockPending(Date.now())).toBe(false);
  });

  it('clears on unlock', () => {
    markLockEpoch(1_700_000_000_000);
    clearLockEpoch();
    expect(readLockEpoch()).toBeNull();
  });

  it('reports a pending lock when the lock is NEWER than this tab session', () => {
    markLockEpoch(2000);
    expect(isLockPending(1000)).toBe(true);
  });

  it('reports no pending lock when this tab unlocked AFTER the last lock', () => {
    markLockEpoch(1000);
    expect(isLockPending(2000)).toBe(false);
  });

  it('treats a same-millisecond lock as pending (fail closed on ties)', () => {
    markLockEpoch(1000);
    expect(isLockPending(1000)).toBe(true);
  });

  it('never reports a pending lock for a tab that has no live session', () => {
    markLockEpoch(2000);
    expect(isLockPending(null)).toBe(false);
  });

  it('fails CLOSED on a tampered/corrupt value — never "never locked"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(5000);
    localStorage.setItem(STORAGE_KEYS.LOCK_EPOCH, 'not-a-number');
    expect(readLockEpoch()).toBe(5000);
    expect(isLockPending(1000)).toBe(true);
  });
});
