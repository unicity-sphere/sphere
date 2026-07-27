/**
 * Cross-tab logout / wallet-deleted signal (graceful lock §8.1). deleteWallet()
 * wipes IndexedDB and localStorage but does NOT reload the page, so every other
 * open tab keeps a live decrypted Sphere over storage that no longer exists.
 *
 * Unlike lockBroadcast, this signal must NOT loop back into its own tab: the
 * originating tab is already tearing itself down, and re-entering the teardown
 * from the loopback would race deleteWallet()'s own re-initialize().
 */
import { describe, it, expect, vi } from 'vitest';
import {
  broadcastLogout,
  subscribeLogoutBroadcast,
  LOGOUT_CHANNEL_NAME,
} from '../../../../src/sdk/walletLock/logoutBroadcast';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe('logoutBroadcast', () => {
  it('does NOT deliver a tab its own logout broadcast', async () => {
    const channelName = `logout-test-${Math.random().toString(36).slice(2)}`;
    const onLogout = vi.fn();
    const unsubscribe = subscribeLogoutBroadcast(channelName, onLogout);

    broadcastLogout(channelName);
    await sleep(50);

    expect(onLogout).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('delivers a logout posted by another tab', async () => {
    const channelName = `logout-test-${Math.random().toString(36).slice(2)}`;
    const onLogout = vi.fn();
    const unsubscribe = subscribeLogoutBroadcast(channelName, onLogout);

    // A different tab has a different sender id — simulate the wire message.
    const otherTab = new BroadcastChannel(channelName);
    otherTab.postMessage({ type: 'logout', sender: 'some-other-tab' });
    await sleep(50);

    expect(onLogout).toHaveBeenCalledTimes(1);
    otherTab.close();
    unsubscribe();
  });

  it('ignores unrelated traffic on the same channel', async () => {
    const channelName = `logout-test-${Math.random().toString(36).slice(2)}`;
    const onLogout = vi.fn();
    const unsubscribe = subscribeLogoutBroadcast(channelName, onLogout);

    const otherTab = new BroadcastChannel(channelName);
    otherTab.postMessage({ type: 'something-else', sender: 'some-other-tab' });
    otherTab.postMessage('logout');
    await sleep(50);

    expect(onLogout).not.toHaveBeenCalled();
    otherTab.close();
    unsubscribe();
  });

  it('stops delivery after unsubscribe', async () => {
    const channelName = `logout-test-${Math.random().toString(36).slice(2)}`;
    const onLogout = vi.fn();
    const unsubscribe = subscribeLogoutBroadcast(channelName, onLogout);
    unsubscribe();

    const otherTab = new BroadcastChannel(channelName);
    otherTab.postMessage({ type: 'logout', sender: 'some-other-tab' });
    await sleep(50);

    expect(onLogout).not.toHaveBeenCalled();
    otherTab.close();
  });

  it('is a no-op when BroadcastChannel is unavailable', () => {
    const original = globalThis.BroadcastChannel;
    // @ts-expect-error deliberately simulating an environment without BroadcastChannel
    delete globalThis.BroadcastChannel;
    try {
      expect(() => broadcastLogout(LOGOUT_CHANNEL_NAME)).not.toThrow();
      const unsubscribe = subscribeLogoutBroadcast(LOGOUT_CHANNEL_NAME, vi.fn());
      expect(() => unsubscribe()).not.toThrow();
    } finally {
      globalThis.BroadcastChannel = original;
    }
  });
});
