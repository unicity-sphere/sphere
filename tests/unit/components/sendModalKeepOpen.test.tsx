import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import type { TransferResult } from '@unicitylabs/sphere-sdk';
import type { PendingTransfer } from '@unicitylabs/sphere-sdk/payments-v2';

// ============================================================================
// SendModal keep-open pending state (sphere-sdk 0.14 in-session convergence):
// a PENDING_COMMIT reject surfaces as useTransfer's synthetic pending result
// (status 'pending' + deliveryPending + the #441-stamped transferId in `id`).
// The modal must show the honest "network busy" copy (+ certified-legs
// detail), offer ONLY resumeNow() as the retry, and clear the copy when
// transfer:updated for that transferId reports the transfer done.
// ============================================================================

const ASSET = {
  coinId: 'c'.repeat(64),
  symbol: 'UCT',
  name: 'Unicity',
  decimals: 0,
  totalAmount: '1000',
  confirmedAmount: '1000',
  unconfirmedAmount: '0',
  tokenCount: 1,
  iconUrl: null,
  priceUsd: null,
};

const transferMock = vi.fn();

vi.mock('../../../src/sdk', async () => {
  const { formatAmount } = await vi.importActual<typeof import('../../../src/sdk/utils/format')>(
    '../../../src/sdk/utils/format',
  );
  return {
    formatAmount,
    useAssets: () => ({ assets: [ASSET] }),
    useTransfer: () => ({
      transfer: transferMock,
      isLoading: false,
      error: null,
      lastResult: null,
      reset: vi.fn(),
    }),
  };
});

function makeFakeSphere(pendingRows: PendingTransfer[]) {
  const listeners = new Map<string, Set<(data: unknown) => void>>();
  return {
    on: (evt: string, fn: (data: unknown) => void) => {
      if (!listeners.has(evt)) listeners.set(evt, new Set());
      listeners.get(evt)!.add(fn);
    },
    off: (evt: string, fn: (data: unknown) => void) => {
      listeners.get(evt)?.delete(fn);
    },
    resolve: vi.fn(async () => ({ chainPubkey: '02'.padEnd(66, 'a') })),
    payments: {
      pendingTransfers: vi.fn(async () => pendingRows.map((r) => ({ ...r }))),
      resumeNow: vi.fn(async () => {}),
      send: vi.fn(),
    },
    _emit: (evt: string, data: unknown) => {
      listeners.get(evt)?.forEach((fn) => fn(data));
    },
  };
}

let fakeSphere: ReturnType<typeof makeFakeSphere>;

vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: fakeSphere, subscriptionKeyStatus: 'ready' }),
}));
vi.mock('../../../src/sdk/hooks/subscription', () => ({
  useUtilization: () => ({ data: undefined }),
}));
vi.mock('../../../src/components/upgrade', () => ({
  useUpgrade: () => ({ openUpgrade: vi.fn() }),
}));

import { SendModal } from '../../../src/components/wallet/L3/modals/SendModal';

function keepOpenResult(id: string): TransferResult {
  return { id, status: 'pending', tokens: [], tokenTransfers: [], deliveryPending: true };
}

/** Walk asset → details → confirm → Send. */
async function driveSend() {
  render(<SendModal isOpen onClose={vi.fn()} />);
  fireEvent.click(await screen.findByText('UCT'));
  fireEvent.change(await screen.findByPlaceholderText("Recipient's Unicity ID"), {
    target: { value: 'bob' },
  });
  fireEvent.change(screen.getByPlaceholderText('Amount'), { target: { value: '10' } });
  fireEvent.click(screen.getByText('Review'));
  // Wait for the CONFIRM step (its summary card) — the details step's header
  // title is also 'Send', so the button must be located only once we're there.
  await screen.findByText('You are sending');
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
}

beforeEach(() => {
  transferMock.mockReset();
  fakeSphere = makeFakeSphere([]);
});

describe('SendModal — keep-open pending state (in-session convergence)', () => {
  it('shows the honest "network busy" copy with the certified-legs detail, then clears it on transfer:updated for that transferId', async () => {
    fakeSphere = makeFakeSphere([
      {
        transferId: 'tid-1',
        kind: 'open',
        recipient: '@bob',
        coinId: ASSET.coinId,
        amount: '10',
        legs: { certified: 2, total: 3 },
        deliveryPending: false,
        createdAt: Date.now(),
      },
    ]);
    transferMock.mockResolvedValue(keepOpenResult('tid-1'));

    await driveSend();

    // Honest keep-open copy — never the generic success, never a failure.
    expect(await screen.findByText('Network is busy')).toBeTruthy();
    expect(screen.getByText(/is safe and will complete automatically/)).toBeTruthy();
    // Certified-legs detail (partial info exists via pendingTransfers()).
    expect(await screen.findByText(/2 of 3 parts already certified/)).toBeTruthy();

    // Convergence lands: transfer:updated for the SAME transferId, done status.
    act(() => {
      fakeSphere._emit('transfer:updated', {
        id: 'tid-1',
        status: 'confirmed',
        tokens: [],
        tokenTransfers: [],
      });
    });

    await waitFor(() => expect(screen.queryByText('Network is busy')).toBeNull());
    expect(screen.getByText('Success!')).toBeTruthy();
  });

  it('does NOT clear the copy on transfer:updated for a DIFFERENT transferId', async () => {
    transferMock.mockResolvedValue(keepOpenResult('tid-1'));
    await driveSend();
    await screen.findByText('Network is busy');

    act(() => {
      fakeSphere._emit('transfer:updated', {
        id: 'other-transfer',
        status: 'confirmed',
        tokens: [],
        tokenTransfers: [],
      });
    });

    // Still pending — an unrelated transfer's convergence must not flip this one.
    expect(screen.getByText('Network is busy')).toBeTruthy();
  });

  it('"Retry now" calls payments.resumeNow() and NEVER re-issues the send (double-pay guard)', async () => {
    transferMock.mockResolvedValue(keepOpenResult('tid-1'));
    await driveSend();
    await screen.findByText('Network is busy');
    expect(transferMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(screen.getByText('Retry now'));
    });

    expect(fakeSphere.payments.resumeNow).toHaveBeenCalledTimes(1);
    // The retry affordance converges the SAME transfer — no second send.
    expect(transferMock).toHaveBeenCalledTimes(1);
    expect(fakeSphere.payments.send).not.toHaveBeenCalled();
  });

  it('an ordinary delivery-deferred success (#621: real status, deliveryPending) keeps the existing copy — NOT the keep-open state', async () => {
    transferMock.mockResolvedValue({
      id: 't-done',
      status: 'confirmed',
      tokens: [],
      tokenTransfers: [],
      deliveryPending: true,
    } satisfies TransferResult);

    await driveSend();

    expect(await screen.findByText('Sent — delivery pending')).toBeTruthy();
    expect(screen.queryByText('Network is busy')).toBeNull();
    // No retry affordance on the delivery-deferred path (delivery self-retries).
    expect(screen.queryByText('Retry now')).toBeNull();
  });

  it('a clean success shows plain Success! with no keep-open artifacts', async () => {
    transferMock.mockResolvedValue({
      id: 't-ok',
      status: 'completed',
      tokens: [],
      tokenTransfers: [],
    } satisfies TransferResult);

    await driveSend();

    expect(await screen.findByText('Success!')).toBeTruthy();
    expect(screen.queryByText('Network is busy')).toBeNull();
    expect(screen.queryByText('Retry now')).toBeNull();
  });
});
