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
});
