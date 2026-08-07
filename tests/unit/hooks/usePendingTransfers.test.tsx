import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { PendingTransfer } from '@unicitylabs/sphere-sdk/payments-v2';
import {
  usePendingTransfers,
  PENDING_TRANSFERS_POLL_MS,
} from '../../../src/sdk/hooks/payments/usePendingTransfers';

// ============================================================================
// Fake sphere: exactly the payments surface the hook may use —
// pendingTransfers() + resumeNow(). A `send` spy is present ONLY to prove the
// hook's retry path never touches it (re-sending double-pays; the SDK
// converges the SAME transfer via resumeNow).
// ============================================================================

function makeRow(transferId: string, overrides: Partial<PendingTransfer> = {}): PendingTransfer {
  return {
    transferId,
    kind: 'open',
    recipient: '@bob',
    coinId: 'coin-1',
    amount: '1000',
    legs: { certified: 1, total: 2 },
    deliveryPending: false,
    createdAt: Date.now(),
    ...overrides,
  };
}

function makeFakeSphere(initial: PendingTransfer[] = []) {
  let rows = [...initial];
  const listeners = new Map<string, Set<(data: unknown) => void>>();

  const sphere = {
    on: (evt: string, fn: (data: unknown) => void) => {
      if (!listeners.has(evt)) listeners.set(evt, new Set());
      listeners.get(evt)!.add(fn);
    },
    off: (evt: string, fn: (data: unknown) => void) => {
      listeners.get(evt)?.delete(fn);
    },
    payments: {
      pendingTransfers: vi.fn(async () => rows.map((r) => ({ ...r }))),
      resumeNow: vi.fn(async () => {}),
      send: vi.fn(),
    },
    // Test-side helpers
    _setRows: (next: PendingTransfer[]) => {
      rows = [...next];
    },
    _emit: (evt: string, data: unknown) => {
      listeners.get(evt)?.forEach((fn) => fn(data));
    },
    _listenerCount: (evt: string) => listeners.get(evt)?.size ?? 0,
  };
  return sphere;
}

let fakeSphere: ReturnType<typeof makeFakeSphere> | null = null;

vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: fakeSphere }),
}));

beforeEach(() => {
  fakeSphere = null;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('usePendingTransfers', () => {
  it('seeds from payments.pendingTransfers() at mount — transfers pending across a close/reopen are visible immediately', async () => {
    fakeSphere = makeFakeSphere([makeRow('t1'), makeRow('t2', { kind: 'shortfall' })]);
    const { result } = renderHook(() => usePendingTransfers());

    await waitFor(() => expect(result.current.pending).toHaveLength(2));
    expect(result.current.pending[0].transferId).toBe('t1');
    expect(result.current.pending[1].kind).toBe('shortfall');
    expect(fakeSphere.payments.pendingTransfers).toHaveBeenCalledTimes(1);
  });

  it('is empty (and stays empty) without a sphere', () => {
    fakeSphere = null;
    const { result } = renderHook(() => usePendingTransfers());
    expect(result.current.pending).toEqual([]);
  });

  it('refreshes on transfer:updated (convergence progress drops completed rows)', async () => {
    fakeSphere = makeFakeSphere([makeRow('t1'), makeRow('t2')]);
    const { result } = renderHook(() => usePendingTransfers());
    await waitFor(() => expect(result.current.pending).toHaveLength(2));

    // The SDK converged t1 and emitted transfer:updated.
    fakeSphere._setRows([makeRow('t2')]);
    act(() => {
      fakeSphere!._emit('transfer:updated', { id: 't1', status: 'confirmed' });
    });

    await waitFor(() => expect(result.current.pending).toHaveLength(1));
    expect(result.current.pending[0].transferId).toBe('t2');
  });

  it('refreshes on connection:status (recovery resets the SDK backoff — re-read promptly)', async () => {
    fakeSphere = makeFakeSphere([makeRow('t1')]);
    const { result } = renderHook(() => usePendingTransfers());
    await waitFor(() => expect(result.current.pending).toHaveLength(1));

    fakeSphere._setRows([]);
    act(() => {
      fakeSphere!._emit('connection:status', { status: 'connected' });
    });

    await waitFor(() => expect(result.current.pending).toHaveLength(0));
  });

  it('slow-polls (~15s) while the list is non-empty', async () => {
    vi.useFakeTimers();
    fakeSphere = makeFakeSphere([makeRow('t1')]);
    const { result } = renderHook(() => usePendingTransfers());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0); // flush the mount read
    });
    expect(result.current.pending).toHaveLength(1);
    const callsAfterMount = fakeSphere.payments.pendingTransfers.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PENDING_TRANSFERS_POLL_MS);
    });
    expect(fakeSphere.payments.pendingTransfers.mock.calls.length).toBe(callsAfterMount + 1);

    // Poll picks up an emptied list…
    fakeSphere._setRows([]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PENDING_TRANSFERS_POLL_MS);
    });
    expect(result.current.pending).toHaveLength(0);
  });

  it('does NOT poll while the list is empty', async () => {
    vi.useFakeTimers();
    fakeSphere = makeFakeSphere([]);
    const { result } = renderHook(() => usePendingTransfers());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0); // flush the mount read
    });
    expect(result.current.pending).toHaveLength(0);
    const callsAfterMount = fakeSphere.payments.pendingTransfers.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PENDING_TRANSFERS_POLL_MS * 4);
    });
    expect(fakeSphere.payments.pendingTransfers.mock.calls.length).toBe(callsAfterMount);
  });

  it('resumeNow() calls payments.resumeNow — and NEVER send (re-sending double-pays)', async () => {
    fakeSphere = makeFakeSphere([makeRow('t1')]);
    const { result } = renderHook(() => usePendingTransfers());
    await waitFor(() => expect(result.current.pending).toHaveLength(1));

    await act(async () => {
      await result.current.resumeNow();
    });

    expect(fakeSphere.payments.resumeNow).toHaveBeenCalledTimes(1);
    expect(fakeSphere.payments.send).not.toHaveBeenCalled();
  });

  it('resumeNow() refreshes the list afterwards (converged rows disappear without waiting for an event)', async () => {
    fakeSphere = makeFakeSphere([makeRow('t1')]);
    const { result } = renderHook(() => usePendingTransfers());
    await waitFor(() => expect(result.current.pending).toHaveLength(1));

    fakeSphere.payments.resumeNow.mockImplementationOnce(async () => {
      fakeSphere!._setRows([]);
    });
    await act(async () => {
      await result.current.resumeNow();
    });

    await waitFor(() => expect(result.current.pending).toHaveLength(0));
  });

  it('keeps the last known list on a transient read failure (never blanks a real pending state on an outage)', async () => {
    fakeSphere = makeFakeSphere([makeRow('t1')]);
    const { result } = renderHook(() => usePendingTransfers());
    await waitFor(() => expect(result.current.pending).toHaveLength(1));

    fakeSphere.payments.pendingTransfers.mockRejectedValueOnce(new Error('offline'));
    act(() => {
      fakeSphere!._emit('transfer:updated', { id: 'x', status: 'failed' });
    });

    // The refresh failed — the row is still shown.
    await waitFor(() =>
      expect(fakeSphere!.payments.pendingTransfers.mock.calls.length).toBeGreaterThan(1),
    );
    expect(result.current.pending).toHaveLength(1);
  });

  it('unsubscribes both refresh events on unmount', async () => {
    fakeSphere = makeFakeSphere([makeRow('t1')]);
    const { unmount, result } = renderHook(() => usePendingTransfers());
    await waitFor(() => expect(result.current.pending).toHaveLength(1));
    expect(fakeSphere._listenerCount('transfer:updated')).toBe(1);
    expect(fakeSphere._listenerCount('connection:status')).toBe(1);

    unmount();
    expect(fakeSphere._listenerCount('transfer:updated')).toBe(0);
    expect(fakeSphere._listenerCount('connection:status')).toBe(0);
  });
});
