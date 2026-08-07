/**
 * THE INVARIANT: the wallet never executes a Connect `send` intent that
 * duplicates a payment already converging (`payments.pendingTransfers()`).
 *
 * The bug it closes: a keep-open send outcome is reported to the dApp as
 * `{success:true, status:'pending', deliveryPending:true}`. A dApp reading
 * `status:'pending'` as "not finished" and re-issuing the intent used to get a
 * SECOND SPEND — nothing below ConnectIntentHandler dedupes it (the host and
 * the InFlightRegistry dedupe by REQUEST id; the SDK's reservation ledger only
 * stops the SAME token being re-spent, so a new transferId simply plans against
 * the remaining free balance). Probe: seed 100+100, send 100 → keep-open,
 * re-send 100 → delivered; 200 delivered for a 100 request.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { ConnectHost } from '@unicitylabs/sphere-sdk/connect';
import { ERROR_CODES } from '@unicitylabs/sphere-sdk/connect';
import type { PendingTransfer } from '@unicitylabs/sphere-sdk/payments-v2';

const COIN = 'c'.repeat(64);
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
const resolveMock = vi.fn(async () => ({ chainPubkey: BOB_PUBKEY }));
const pendingTransfersMock = vi.fn(async (): Promise<PendingTransfer[]> => []);

const fakeSphere = {
  resolve: resolveMock,
  payments: { pendingTransfers: pendingTransfersMock },
};

// ConnectIntentHandler reads useSphereContext from the barrel; the guard reads
// it from the deep module — both must see the same fake wallet.
vi.mock('../../../src/sdk', async () => {
  const { formatAmount } = await vi.importActual<typeof import('../../../src/sdk/utils/format')>(
    '../../../src/sdk/utils/format',
  );
  return {
    formatAmount,
    useSphereContext: () => ({ sphere: fakeSphere }),
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
vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: fakeSphere }),
}));
vi.mock('../../../src/sdk/hooks/subscription', () => ({
  useSubscriptionKeyGuard: () => ({ ready: true, assertReady: vi.fn() }),
}));
vi.mock('../../../src/sdk/hooks/comms/useSendDM', () => ({
  useSendDM: () => ({ sendDM: vi.fn(), isLoading: false }),
}));
vi.mock('../../../src/components/upgrade', () => ({
  useUpgrade: () => ({ openUpgrade: vi.fn() }),
}));

const resolveIntent = vi.fn();
const rejectIntent = vi.fn();
let pendingIntent: {
  id: number;
  host: ConnectHost;
  origin: string;
  action: string;
  params: Record<string, unknown>;
  resolve: (result: unknown) => void;
} | null = null;

vi.mock('../../../src/components/connect/ConnectContext', () => ({
  useConnectContext: () => ({
    pendingIntent,
    resolveIntent,
    rejectIntent,
    registerAutoIntent: vi.fn(),
  }),
}));

import { ConnectIntentHandler } from '../../../src/components/connect/ConnectIntentHandler';
import { DUPLICATE_CHECK_TIMEOUT_MS } from '../../../src/components/connect/duplicateSendGuard';

function sendIntent(params: Record<string, unknown> = {}) {
  return {
    id: 7,
    host: {} as ConnectHost,
    origin: 'https://dapp.example',
    action: 'send',
    params: { to: '@bob', amount: '100', coinId: COIN, ...params },
    resolve: vi.fn(),
  };
}

function pendingRow(over: Partial<PendingTransfer> = {}): PendingTransfer {
  return {
    transferId: 'tf_9d2c4e7a1b3f',
    kind: 'open',
    recipient: BOB_PUBKEY,
    coinId: COIN,
    amount: '100',
    legs: { certified: 1, total: 2 },
    deliveryPending: true,
    createdAt: 1,
    ...over,
  };
}

/** Copy unique to SendIntentModal — its presence means the send path was reached. */
const SEND_MODAL_COPY = 'This dApp is asking to send tokens from your wallet.';

beforeEach(() => {
  transferMock.mockReset();
  transferMock.mockResolvedValue({
    id: 'tid-new',
    status: 'confirmed',
    tokens: [],
    tokenTransfers: [],
  });
  resolveMock.mockClear();
  resolveMock.mockResolvedValue({ chainPubkey: BOB_PUBKEY });
  pendingTransfersMock.mockReset();
  pendingTransfersMock.mockResolvedValue([]);
  resolveIntent.mockClear();
  rejectIntent.mockClear();
  pendingIntent = sendIntent();
});

describe('Connect send intent — duplicate-payment guard', () => {
  it('blocks a send intent that duplicates a converging transfer: warning shown, send path never reached', async () => {
    pendingTransfersMock.mockResolvedValue([pendingRow()]);

    render(<ConnectIntentHandler />);

    expect(await screen.findByText('Payment already in progress')).toBeTruthy();
    // Names the amount, the recipient and the in-flight transfer — a warning
    // that does not identify what is already converging is not actionable.
    const line = screen.getByText(/is still completing/).textContent ?? '';
    expect(line).toContain('100');
    expect(line).toContain('@bob');
    expect(line).toContain('tf_9d2...1b3f');
    expect(screen.getByText('Approving this sends a SECOND payment.')).toBeTruthy();

    // The plain "Send" confirmation must never have rendered...
    expect(screen.queryByText(SEND_MODAL_COPY)).toBeNull();
    // ...and no money moved, in either direction.
    expect(transferMock).not.toHaveBeenCalled();
    expect(resolveIntent).not.toHaveBeenCalled();
    expect(rejectIntent).not.toHaveBeenCalled();
  });

  it('declining resolves the intent with USER_REJECTED naming the transfer, and never spends', async () => {
    pendingTransfersMock.mockResolvedValue([pendingRow()]);

    render(<ConnectIntentHandler />);
    fireEvent.click(await screen.findByText("Don't send"));

    expect(rejectIntent).toHaveBeenCalledTimes(1);
    const [id, code, message] = rejectIntent.mock.calls[0]!;
    expect(id).toBe(7);
    expect(code).toBe(ERROR_CODES.USER_REJECTED);
    expect(message).toContain('tf_9d2c4e7a1b3f');
    expect(message).toMatch(/still completing/i);
    expect(transferMock).not.toHaveBeenCalled();
  });

  it('approving explicitly DOES send — the user may genuinely want to pay twice', async () => {
    pendingTransfersMock.mockResolvedValue([pendingRow()]);

    render(<ConnectIntentHandler />);
    fireEvent.click(await screen.findByText('Send anyway'));

    // Only now does the normal confirm modal appear.
    expect(await screen.findByText(SEND_MODAL_COPY)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(transferMock).toHaveBeenCalledTimes(1));
    expect(transferMock).toHaveBeenCalledWith({ coinId: COIN, amount: '100', recipient: 'bob' });
    await waitFor(() => expect(resolveIntent).toHaveBeenCalledTimes(1));
    expect(resolveIntent.mock.calls[0]![1]).toMatchObject({ success: true });
    expect(rejectIntent).not.toHaveBeenCalled();
  });

  it('matches a converging transfer whose recipient pubkey differs only in case', async () => {
    pendingTransfersMock.mockResolvedValue([pendingRow({ recipient: BOB_PUBKEY.toUpperCase() })]);

    render(<ConnectIntentHandler />);

    expect(await screen.findByText('Payment already in progress')).toBeTruthy();
    expect(screen.queryByText(SEND_MODAL_COPY)).toBeNull();
  });

  it('passes through when nothing is converging — and costs no recipient resolution', async () => {
    pendingTransfersMock.mockResolvedValue([]);

    render(<ConnectIntentHandler />);

    expect(await screen.findByText(SEND_MODAL_COPY)).toBeTruthy();
    expect(screen.queryByText('Payment already in progress')).toBeNull();
    expect(resolveMock).not.toHaveBeenCalled();
  });

  it.each([
    ['a different amount', { row: { amount: '101' }, intent: {} }],
    ['a different recipient', { row: { recipient: CAROL_PUBKEY }, intent: {} }],
    ['a different coin', { row: { coinId: 'd'.repeat(64) }, intent: {} }],
    ['a different requested amount', { row: {}, intent: { amount: '99' } }],
  ])('passes an intent through untouched when the pending transfer has %s', async (_label, spec) => {
    pendingTransfersMock.mockResolvedValue([pendingRow(spec.row as Partial<PendingTransfer>)]);
    pendingIntent = sendIntent(spec.intent);

    render(<ConnectIntentHandler />);

    expect(await screen.findByText(SEND_MODAL_COPY)).toBeTruthy();
    expect(screen.queryByText('Payment already in progress')).toBeNull();
    expect(rejectIntent).not.toHaveBeenCalled();
  });

  it('fails open: a pendingTransfers() outage never strands the intent', async () => {
    pendingTransfersMock.mockRejectedValue(new Error('offline'));

    render(<ConnectIntentHandler />);

    expect(await screen.findByText(SEND_MODAL_COPY)).toBeTruthy();
    expect(rejectIntent).not.toHaveBeenCalled();
  });

  it('fails open on a check that never answers — a guard may never freeze a payment', async () => {
    vi.useFakeTimers();
    try {
      pendingTransfersMock.mockReturnValue(new Promise<PendingTransfer[]>(() => {}));

      render(<ConnectIntentHandler />);
      // Nothing is on screen while the check is in flight: the send modal must
      // never render behind the guard's back.
      expect(screen.queryByText(SEND_MODAL_COPY)).toBeNull();

      await act(async () => {
        vi.advanceTimersByTime(DUPLICATE_CHECK_TIMEOUT_MS);
      });

      expect(screen.getByText(SEND_MODAL_COPY)).toBeTruthy();
      expect(rejectIntent).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
