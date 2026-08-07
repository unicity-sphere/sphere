import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import type { PendingTransfer } from '@unicitylabs/sphere-sdk/payments-v2';
import { PendingTransfersIndicator } from '../../../src/components/layout/PendingTransfersIndicator';

// ============================================================================
// Fake sphere: the payments surface the chip (via usePendingTransfers) may
// use. `send` exists ONLY to prove the retry button never reaches it — the
// button must call resumeNow() (same-transfer convergence), never a re-send.
// ============================================================================

function makeRow(transferId: string, overrides: Partial<PendingTransfer> = {}): PendingTransfer {
  return {
    transferId,
    kind: 'open',
    recipient: '@bob',
    coinId: 'c'.repeat(64),
    amount: '1000',
    legs: { certified: 1, total: 3 },
    deliveryPending: false,
    createdAt: Date.now() - 5 * 60_000, // 5 minutes ago
    ...overrides,
  };
}

function makeFakeSphere(initial: PendingTransfer[] = []) {
  let rows = [...initial];
  const listeners = new Map<string, Set<(data: unknown) => void>>();
  return {
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
    _setRows: (next: PendingTransfer[]) => {
      rows = [...next];
    },
    _emit: (evt: string, data: unknown) => {
      listeners.get(evt)?.forEach((fn) => fn(data));
    },
  };
}

let fakeSphere: ReturnType<typeof makeFakeSphere> | null = null;

vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: fakeSphere }),
}));

beforeEach(() => {
  fakeSphere = null;
});

describe('PendingTransfersIndicator', () => {
  it('renders NOTHING while the pending list is empty', async () => {
    fakeSphere = makeFakeSphere([]);
    const { container } = render(<PendingTransfersIndicator />);

    // Let the mount read settle — still nothing.
    await act(async () => {});
    expect(container.innerHTML).toBe('');
  });

  it('shows the count chip from pendingTransfers() at mount (reopen: pending transfers visible immediately)', async () => {
    fakeSphere = makeFakeSphere([makeRow('t1'), makeRow('t2')]);
    render(<PendingTransfersIndicator />);

    expect(await screen.findByText('2 pending')).toBeTruthy();
  });

  it('expands to the list — amount, recipient short-form, certified/total legs, age', async () => {
    fakeSphere = makeFakeSphere([makeRow('t1')]);
    render(<PendingTransfersIndicator />);

    fireEvent.click(await screen.findByText('1 pending'));

    expect(screen.getByText(/to @bob/)).toBeTruthy();
    expect(screen.getByText('1/3 certified')).toBeTruthy();
    expect(screen.getByText('5m ago')).toBeTruthy();
    expect(screen.getByText(/will complete automatically/)).toBeTruthy();
  });

  it('"Retry now" calls payments.resumeNow() — NEVER send() (a re-send would double-pay)', async () => {
    fakeSphere = makeFakeSphere([makeRow('t1')]);
    render(<PendingTransfersIndicator />);

    fireEvent.click(await screen.findByText('1 pending'));
    await act(async () => {
      fireEvent.click(screen.getByText('Retry now'));
    });

    expect(fakeSphere.payments.resumeNow).toHaveBeenCalledTimes(1);
    expect(fakeSphere.payments.send).not.toHaveBeenCalled();
  });

  it('disappears when convergence empties the list (transfer:updated refresh)', async () => {
    fakeSphere = makeFakeSphere([makeRow('t1')]);
    const { container } = render(<PendingTransfersIndicator />);
    await screen.findByText('1 pending');

    fakeSphere._setRows([]);
    act(() => {
      fakeSphere!._emit('transfer:updated', { id: 't1', status: 'confirmed' });
    });

    await waitFor(() => expect(container.innerHTML).toBe(''));
  });
});
