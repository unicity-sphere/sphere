import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIdleTimer } from '../../../../src/sdk/walletLock/useIdleTimer';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useIdleTimer', () => {
  it('fires onIdle after the timeout with no activity', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimer({ timeoutMs: 1000, enabled: true, onIdle }));
    vi.advanceTimersByTime(1000);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('resets on user activity', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimer({ timeoutMs: 1000, enabled: true, onIdle }));
    vi.advanceTimersByTime(900);
    window.dispatchEvent(new Event('keydown'));
    vi.advanceTimersByTime(900);
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('never fires when disabled', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimer({ timeoutMs: 1000, enabled: false, onIdle }));
    vi.advanceTimersByTime(5000);
    expect(onIdle).not.toHaveBeenCalled();
  });

  it('never fires when timeoutMs is null (Never)', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimer({ timeoutMs: null, enabled: true, onIdle }));
    vi.advanceTimersByTime(5000);
    expect(onIdle).not.toHaveBeenCalled();
  });

  // BroadcastChannel delivery is real-async and doesn't play well with fake
  // timers, so this test uses real timers with generous margins around each
  // deadline instead.
  it('resets on activity broadcast from another tab, without echoing back', async () => {
    vi.useRealTimers();
    const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
    const channelName = `cross-tab-test-${Math.random().toString(36).slice(2)}`;
    const onIdle = vi.fn();

    // Simulates activity happening in a separate browser tab.
    const otherChannel = new BroadcastChannel(channelName);
    const otherOnMessage = vi.fn();
    otherChannel.onmessage = otherOnMessage;

    const { unmount } = renderHook(() =>
      useIdleTimer({ timeoutMs: 200, enabled: true, onIdle, channelName })
    );

    // Broadcast remote activity shortly before the original 200ms deadline.
    await sleep(150);
    otherChannel.postMessage('activity');

    // Past the original deadline (200ms), but the reset should have pushed
    // it out — onIdle must not have fired.
    await sleep(100); // elapsed ~250ms since mount
    expect(onIdle).not.toHaveBeenCalled();

    // Past the new deadline (~150ms reset point + 200ms timeout = ~350ms).
    await sleep(170); // elapsed ~420ms since mount
    expect(onIdle).toHaveBeenCalledTimes(1);

    // The hook must never echo remote activity back onto the channel.
    expect(otherOnMessage).not.toHaveBeenCalled();

    unmount();
    otherChannel.close();
  });
});
