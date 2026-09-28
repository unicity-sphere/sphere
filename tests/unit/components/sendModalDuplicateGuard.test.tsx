/**
 * THE INVARIANT (stated in src/components/connect/duplicateSendGuard.ts): the
 * wallet does not start a send that duplicates a payment already converging,
 * and no control that can authorize one is live the instant it appears.
 *
 * The Connect path was closed first (ConnectIntentHandler + the presentation-
 * armed settle shield). This is the wallet's OWN send modal, the other half of
 * the same hole: a keep-open outcome ("Network is busy") leaves the SDK
 * converging that transfer, while the reservation ledger only stops the SAME
 * token being spent twice — a second attempt plans a NEW transferId against the
 * remaining balance and the recipient is paid TWICE (audit probe: 100 sent,
 * keep-open, re-sent 100 → recipient got 200). A user who closes the busy
 * screen and sends again, or double-taps Send, does exactly that.
 *
 * Matching is `findDuplicatePending` — the same matcher the Connect guard uses,
 * imported, never re-implemented — and the settle window is the same
 * INTENT_SETTLE_MS.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import type { PendingTransfer } from '@unicitylabs/sphere-sdk/payments-v2';
import { INTENT_SETTLE_MS } from '../../../src/components/connect/settleWindow';

/**
 * Animations are stubbed out so the only thing FAKE TIME drives here is the
 * settle window itself. framer-motion's frame loop captures the timer
 * environment it first sees, and re-installing fake timers per test leaves it
 * driving nothing — with the real library, step transitions stall from the
 * fourth test on. Nothing under test depends on the animation: the shield is
 * armed by the control's MOUNT, which is exactly what this stub preserves.
 */
vi.mock('framer-motion', async () => (await import('../../support/framerMotionStub')).framerMotionStub());

const COIN = 'c'.repeat(64);
const OTHER_COIN = 'd'.repeat(64);
const BOB_PUBKEY = `02${'a'.repeat(64)}`;
const CAROL_PUBKEY = `03${'b'.repeat(64)}`;

const ASSET = {
  coinId: COIN,
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
const pendingTransfersMock = vi.fn(async (): Promise<PendingTransfer[]> => []);
const resolveMock = vi.fn(async () => ({ chainPubkey: BOB_PUBKEY }));

vi.mock('../../../src/sdk', async () => {
  const { formatAmount } = await vi.importActual<typeof import('../../../src/sdk/utils/format')>(
    '../../../src/sdk/utils/format',
  );
  return {
    formatAmount,
    useAssets: () => ({ assets: [ASSET] }),
    // SendModal prices its live send-progress legs from the inventory.
    useTokens: () => ({
      tokens: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      tokenCount: 0,
      hasTokens: false,
      confirmedTokens: [],
      pendingTokens: [],
    }),
    useTransfer: () => ({
      transfer: transferMock,
      isLoading: false,
      error: null,
      lastResult: null,
      reset: vi.fn(),
    }),
  };
});

interface PrewarmRequest {
  coinId: string;
  amount: string;
  recipient: string;
}
const prewarmRequests: PrewarmRequest[] = [];
const prewarmSendMock = vi.fn(async (request: PrewarmRequest): Promise<void> => {
  prewarmRequests.push(request);
});
const discardPrewarmMock = vi.fn();

const fakeSphere = {
  on: vi.fn(),
  off: vi.fn(),
  resolve: resolveMock,
  payments: {
    pendingTransfers: pendingTransfersMock,
    resumeNow: vi.fn(),
    send: vi.fn(),
    // sphere-sdk#753: the confirm screen warms source blobs. A double missing
    // these is not a lighter double, it is a different interface.
    prewarmSend: prewarmSendMock,
    discardPrewarm: discardPrewarmMock,
  },
};

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

function pendingRow(overrides: Partial<PendingTransfer> = {}): PendingTransfer {
  return {
    transferId: 'tf_9d2c4e7a1b3f',
    kind: 'open',
    recipient: BOB_PUBKEY,
    coinId: COIN,
    amount: '10',
    legs: { certified: 1, total: 2 },
    deliveryPending: true,
    createdAt: 1,
    ...overrides,
  };
}

/**
 * Step transitions ride framer-motion's AnimatePresence, so time has to move
 * for the next screen to mount. Advancing in small slices keeps the settle
 * window (armed when the control mounts) essentially untouched — at most one
 * slice of it is consumed before the assertions below run.
 */
const SLICE_MS = 20;
async function advanceUntil(present: () => boolean, maxMs = 3_000) {
  let elapsed = 0;
  while (!present() && elapsed < maxMs) {
    await act(async () => {
      vi.advanceTimersByTime(SLICE_MS);
      await Promise.resolve();
    });
    elapsed += SLICE_MS;
  }
  if (!present()) throw new Error('UI never appeared');
}

const sendButton = () => screen.queryByRole('button', { name: 'Send' }) as HTMLButtonElement | null;
const sendAnywayButton = () =>
  screen.queryByRole('button', { name: 'Send anyway' }) as HTMLButtonElement | null;

/** asset → details → Review. Lands on the confirm step, or the duplicate warning. */
async function review({ recipient = 'bob', amount = '10' } = {}) {
  const rendered = render(<SendModal isOpen onClose={vi.fn()} />);
  fireEvent.click(screen.getByText('UCT'));
  await advanceUntil(() => screen.queryByPlaceholderText("Recipient's Unicity ID") !== null);
  fireEvent.change(screen.getByPlaceholderText("Recipient's Unicity ID"), {
    target: { value: recipient },
  });
  fireEvent.change(screen.getByPlaceholderText('Amount'), { target: { value: amount } });
  await act(async () => {
    fireEvent.click(screen.getByText('Review'));
    await Promise.resolve();
    await Promise.resolve();
  });
  return rendered;
}

/** Wait out the settle window, then press Send on the confirm step. */
async function pressSend() {
  await advanceUntil(() => sendButton() !== null);
  await act(async () => {
    vi.advanceTimersByTime(INTENT_SETTLE_MS);
  });
  await act(async () => {
    fireEvent.click(sendButton()!);
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  prewarmSendMock.mockClear();
  prewarmRequests.length = 0;
  discardPrewarmMock.mockClear();
  transferMock.mockReset();
  transferMock.mockResolvedValue({ id: 'tid', status: 'completed', tokens: [], tokenTransfers: [] });
  pendingTransfersMock.mockReset();
  pendingTransfersMock.mockResolvedValue([]);
  resolveMock.mockReset();
  resolveMock.mockResolvedValue({ chainPubkey: BOB_PUBKEY });
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('SendModal — settle shield (no control is live the instant it appears)', () => {
  it('the confirm-step Send button is inert when it first appears and for the settle window after', async () => {
    await review();
    await advanceUntil(() => sendButton() !== null);

    // First paint of the button: dead.
    expect(sendButton()!.disabled).toBe(true);

    // Still dead most of the way through the window (a slice of it may have
    // been consumed getting here — the margin, not the window, is approximate).
    await act(async () => {
      vi.advanceTimersByTime(INTENT_SETTLE_MS - SLICE_MS * 5);
    });
    expect(sendButton()!.disabled).toBe(true);

    // A double-tap landing in that window spends nothing.
    fireEvent.click(sendButton()!);
    expect(transferMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(SLICE_MS * 5);
    });
    expect(sendButton()!.disabled).toBe(false);
  });

  it('two clicks dispatched in one task open exactly one attempt', async () => {
    await review();
    await advanceUntil(() => sendButton() !== null);
    await act(async () => {
      vi.advanceTimersByTime(INTENT_SETTLE_MS);
    });

    // Past the settle window the button is live — but a double-tap that lands
    // before React can flush the disabled state must still spend once. The
    // synchronous re-entrancy ref, not a re-render, is what makes that true.
    await act(async () => {
      const button = sendButton()!;
      fireEvent.click(button);
      fireEvent.click(button);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(transferMock).toHaveBeenCalledTimes(1);
  });

  it('re-arms on the warning→proceed transition — "Send anyway" hands over a dead Send button', async () => {
    pendingTransfersMock.mockResolvedValue([pendingRow()]);
    await review();
    await advanceUntil(() => sendAnywayButton() !== null);

    // The destructive control is itself shielded on appearance.
    expect(sendAnywayButton()!.disabled).toBe(true);
    await act(async () => {
      vi.advanceTimersByTime(INTENT_SETTLE_MS);
    });
    expect(sendAnywayButton()!.disabled).toBe(false);

    await act(async () => {
      fireEvent.click(sendAnywayButton()!);
      await Promise.resolve();
    });
    await advanceUntil(() => sendButton() !== null);

    // A fresh primary button under the cursor that just clicked one: dead again.
    expect(sendButton()!.disabled).toBe(true);
    fireEvent.click(sendButton()!);
    expect(transferMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(INTENT_SETTLE_MS);
    });
    expect(sendButton()!.disabled).toBe(false);
  });
});

describe('SendModal — duplicate payment guard', () => {
  it('a converging transfer for the same recipient/coin/amount blocks the send and names it', async () => {
    pendingTransfersMock.mockResolvedValue([pendingRow()]);
    await review();
    await advanceUntil(() => screen.queryByText('Sending again pays TWICE.') !== null);

    expect(screen.getByText(/is still completing \(transfer/)).toBeTruthy();
    expect(screen.getByText(/1 of 2 parts are already certified/)).toBeTruthy();
    // Nothing was executed, and the confirm screen is not what the user is
    // looking at — the warning replaced it.
    expect(transferMock).not.toHaveBeenCalled();
    expect(sendButton()).toBeNull();
  });

  it('declining returns to the edit step and sends nothing', async () => {
    pendingTransfersMock.mockResolvedValue([pendingRow()]);
    await review();
    await advanceUntil(() => screen.queryByText("Don't send") !== null);

    await act(async () => {
      fireEvent.click(screen.getByText("Don't send"));
      await Promise.resolve();
    });
    await advanceUntil(() => screen.queryByPlaceholderText('Amount') !== null);

    expect(transferMock).not.toHaveBeenCalled();
    expect(screen.queryByText('Sending again pays TWICE.')).toBeNull();
  });

  it('explicit approval sends exactly once', async () => {
    pendingTransfersMock.mockResolvedValue([pendingRow()]);
    await review();
    await advanceUntil(() => sendAnywayButton() !== null);
    await act(async () => {
      vi.advanceTimersByTime(INTENT_SETTLE_MS);
    });
    await act(async () => {
      fireEvent.click(sendAnywayButton()!);
      await Promise.resolve();
    });

    await pressSend();

    // The override is honoured — a user may genuinely want to pay twice — and
    // the still-matching row does NOT re-raise the warning behind their back.
    expect(transferMock).toHaveBeenCalledTimes(1);
    expect(transferMock.mock.calls[0][0]).toMatchObject({ amount: '10', coinId: COIN });
  });

  it('a row that matches only at SEND time (another send went keep-open meanwhile) still blocks', async () => {
    pendingTransfersMock.mockResolvedValueOnce([]); // clear when the confirm step opens
    pendingTransfersMock.mockResolvedValue([pendingRow()]); // converging by the time Send is pressed

    await review();
    await pressSend();

    expect(transferMock).not.toHaveBeenCalled();
    await advanceUntil(() => screen.queryByText('Sending again pays TWICE.') !== null);
  });

  it.each([
    ['a different amount', pendingRow({ amount: '11' })],
    ['a different recipient', pendingRow({ recipient: CAROL_PUBKEY })],
    ['a different coin', pendingRow({ coinId: OTHER_COIN })],
    ['a journal-only row with no amount', pendingRow({ amount: '', coinId: '' })],
  ])('%s is not a duplicate — the send proceeds', async (_label, row) => {
    pendingTransfersMock.mockResolvedValue([row]);
    await review();
    await pressSend();

    expect(transferMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Sending again pays TWICE.')).toBeNull();
  });

  it('no converging transfers: the send proceeds on the single resolution the modal already did', async () => {
    await review();
    await pressSend();

    expect(transferMock).toHaveBeenCalledTimes(1);
    // The guard reuses the confirm step's resolution — it never opens a second
    // recipient lookup of its own.
    expect(resolveMock).toHaveBeenCalledTimes(1);
  });

  it('fails open: pendingTransfers() throwing never blocks a legitimate send', async () => {
    pendingTransfersMock.mockRejectedValue(new Error('storage unavailable'));
    await review();
    await pressSend();

    expect(transferMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Sending again pays TWICE.')).toBeNull();
  });
});

describe('SendModal — confirm-screen prewarm (sphere-sdk#753)', () => {
  it('warms the sources the send will spend, for the amount the send will use', async () => {
    await review({ amount: '10' });
    await advanceUntil(() => sendButton() !== null);

    // Warming is the confirm screen's whole contribution to send latency; if it
    // does not happen, the 3.4 s blob read simply moves back after the button.
    // The amount must match handleSend's, or the preview selects other tokens
    // and every warmed blob misses.
    expect(prewarmRequests).toEqual([{ coinId: COIN, amount: '10', recipient: 'bob' }]);
  });

  it('does not warm before the confirm screen — an abandoned draft must not fetch', async () => {
    render(<SendModal isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('UCT'));
    await advanceUntil(() => screen.queryByPlaceholderText("Recipient's Unicity ID") !== null);
    fireEvent.change(screen.getByPlaceholderText('Amount'), { target: { value: '10' } });

    expect(prewarmSendMock).not.toHaveBeenCalled();
  });

  it('keeps the warm when the send commits, because send() reads it after the quota check', async () => {
    await review({ amount: '10' });
    await advanceUntil(() => sendButton() !== null);
    expect(prewarmSendMock).toHaveBeenCalled();

    await pressSend();

    // confirm→processing is the ONE exit that must not discard: useTransfer awaits
    // checkSendQuota() before payments.send() reads the warm, so discarding on the
    // step change throws away precisely what the confirm screen warmed it for.
    expect(transferMock).toHaveBeenCalledTimes(1);
    expect(discardPrewarmMock).not.toHaveBeenCalled();
  });

  it('discards when the confirm screen goes away, so a cancelled send holds nothing', async () => {
    const { unmount } = await review();
    await advanceUntil(() => sendButton() !== null);
    expect(prewarmSendMock).toHaveBeenCalled();
    expect(discardPrewarmMock).not.toHaveBeenCalled();

    // Closing the modal is the same teardown as backing out or unmounting: the
    // warmed set must not outlive the screen that asked for it.
    unmount();

    expect(discardPrewarmMock).toHaveBeenCalled();
  });
});
