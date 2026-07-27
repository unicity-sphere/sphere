/**
 * Graceful lock §8.5, idle-timer policy — STRICT. This is a REGRESSION GUARD,
 * not a red-green cycle: it passes on today's ACTIVITY_EVENTS and exists to
 * fail the day someone adds 'message' to them.
 *
 * Traffic from a framed dApp reaches the wallet window as a `message` event. If
 * that counted as activity, an embedded page could hold the wallet unlocked
 * forever by polling. It must not: the wallet locks on the user's schedule, the
 * dApp gets a typed WALLET_LOCKED (4009), and the wallet lights a passive badge
 * in its own chrome.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIdleTimer } from '../../../../src/sdk/walletLock/useIdleTimer';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('idle timer — strict activity policy', () => {
  it('does NOT treat dApp postMessage traffic as activity', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimer({
      timeoutMs: 1000,
      enabled: true,
      onIdle,
      channelName: `activity-test-${Math.random().toString(36).slice(2)}`,
    }));

    // A chatty dApp polling the host across the whole idle window.
    for (let elapsed = 0; elapsed < 1000; elapsed += 100) {
      window.dispatchEvent(new MessageEvent('message', { data: { id: '1', method: 'sphere_getBalance' } }));
      vi.advanceTimersByTime(100);
    }

    expect(onIdle).toHaveBeenCalledTimes(1);
  });
});
