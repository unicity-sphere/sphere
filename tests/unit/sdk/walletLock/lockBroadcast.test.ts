/**
 * Pure cross-tab lock signal (#449 Task 8a): `broadcastLock()` tells every
 * OTHER tab to lock immediately (idle auto-lock or an explicit lock in one
 * tab must lock all of them). Real BroadcastChannel is available under
 * vitest/jsdom; delivery across separate channel instances is asynchronous,
 * so tests await a short tick instead of asserting synchronously.
 */
import { describe, it, expect, vi } from 'vitest';
import { broadcastLock, subscribeLockBroadcast } from '../../../../src/sdk/walletLock/lockBroadcast';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe('lockBroadcast', () => {
  it('delivers a broadcastLock() post to a subscriber on another channel instance', async () => {
    const channelName = `lock-test-${Math.random().toString(36).slice(2)}`;
    const onLock = vi.fn();
    const unsubscribe = subscribeLockBroadcast(channelName, onLock);

    broadcastLock(channelName);
    await sleep(50);

    expect(onLock).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('stops delivery after unsubscribe', async () => {
    const channelName = `lock-test-${Math.random().toString(36).slice(2)}`;
    const onLock = vi.fn();
    const unsubscribe = subscribeLockBroadcast(channelName, onLock);

    unsubscribe();
    broadcastLock(channelName);
    await sleep(50);

    expect(onLock).not.toHaveBeenCalled();
  });

  it('uses the shared default channel name when none is given, so a same-process default subscriber still receives it', async () => {
    const onLock = vi.fn();
    const unsubscribe = subscribeLockBroadcast(undefined, onLock);

    broadcastLock();
    await sleep(50);

    expect(onLock).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('is a no-op when BroadcastChannel is unavailable (e.g. very old browsers)', () => {
    const original = globalThis.BroadcastChannel;
    // @ts-expect-error deliberately simulating an environment without BroadcastChannel
    delete globalThis.BroadcastChannel;
    try {
      expect(() => broadcastLock('whatever')).not.toThrow();
      const unsubscribe = subscribeLockBroadcast('whatever', vi.fn());
      expect(() => unsubscribe()).not.toThrow();
    } finally {
      globalThis.BroadcastChannel = original;
    }
  });
});
