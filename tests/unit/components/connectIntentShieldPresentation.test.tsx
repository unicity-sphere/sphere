/**
 * THE INVARIANT (ConnectContext.armIntentShield): the §8.4 settle window
 * measures from the moment ACTIONABLE intent UI is first PRESENTED to the user
 * — never from queue arrival.
 *
 * The bug it closes: the shield used to be armed by the intent ARRIVING at the
 * head of the queue. The duplicate-send guard can hold the send modal back for
 * up to DUPLICATE_CHECK_TIMEOUT_MS (a pendingTransfers() read plus a recipient
 * resolution, both able to ride the network). A check slower than the 500 ms
 * window therefore spent the whole window behind a BLANK screen, and the modal
 * appeared with a live "Send" button under the cursor — exactly the
 * accidental-click / clickjack case the shield exists for.
 *
 * This drives the real ConnectProvider + real ConnectIntentHandler together,
 * because the defect only exists in the seam between them.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import type { ConnectHost, DAppMetadata } from '@unicitylabs/sphere-sdk/connect';
import type { PendingTransfer } from '@unicitylabs/sphere-sdk/payments-v2';

const COIN = 'c'.repeat(64);
const BOB_PUBKEY = `02${'a'.repeat(64)}`;

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
const fakeSphere = {
  resolve: vi.fn(async () => ({ chainPubkey: BOB_PUBKEY })),
  payments: { pendingTransfers: pendingTransfersMock },
};

vi.mock('../../../src/sdk', () => ({
  useSphereContext: () => ({ sphere: fakeSphere }),
  useAssets: () => ({ assets: [ASSET] }),
  useTransfer: () => ({
    transfer: transferMock,
    isLoading: false,
    error: null,
    lastResult: null,
    reset: vi.fn(),
  }),
}));
// ConnectProvider needs `isLocked`; the duplicate guard needs `sphere`.
vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: fakeSphere, isLocked: false, unlock: vi.fn(async () => {}) }),
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
vi.mock('../../../src/components/connect/ConnectionApprovalModal', () => ({
  ConnectionApprovalModal: () => null,
}));

import { ConnectProvider } from '../../../src/components/connect/ConnectProvider';
import {
  useConnectContext,
  type ConnectContextValue,
} from '../../../src/components/connect/ConnectContext';
import { clearConnectHosts } from '../../../src/sdk/connectHostRegistry';

/** Copy unique to SendIntentModal — its presence means the send confirmation is on screen. */
const SEND_MODAL_COPY = 'This dApp is asking to send tokens from your wallet.';
const SETTLE_MS = 500;
/** How long the guard check takes here — deliberately past the settle window. */
const SLOW_CHECK_MS = 1200;

const host = { id: 'A' } as unknown as ConnectHost;

let ctx: ConnectContextValue | null = null;
function Probe() {
  ctx = useConnectContext();
  return <div data-testid="interactive">{String(ctx.intentInteractive)}</div>;
}

function shielded(): boolean {
  return screen.queryByTestId('intent-settle-shield') !== null;
}

function sendIntent() {
  act(() => {
    void ctx!.requestIntent(host, 'https://dapp.example', 'send', {
      to: '@bob',
      amount: '100',
      coinId: COIN,
    });
  });
}

/** A pendingTransfers() read that answers only after `ms` of (fake) time. */
function slowCheck(rows: PendingTransfer[], ms: number) {
  pendingTransfersMock.mockImplementation(
    () => new Promise<PendingTransfer[]>((resolve) => setTimeout(() => resolve(rows), ms)),
  );
}

function pendingRow(): PendingTransfer {
  return {
    transferId: 'tf_9d2c4e7a1b3f',
    kind: 'open',
    recipient: BOB_PUBKEY,
    coinId: COIN,
    amount: '100',
    legs: { certified: 1, total: 2 },
    deliveryPending: true,
    createdAt: 1,
  };
}

beforeEach(() => {
  ctx = null;
  clearConnectHosts();
  transferMock.mockReset();
  transferMock.mockResolvedValue({ id: 'tid', status: 'confirmed', tokens: [], tokenTransfers: [] });
  pendingTransfersMock.mockReset();
  pendingTransfersMock.mockResolvedValue([]);
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  clearConnectHosts();
});

describe('settle shield arms when the intent UI is PRESENTED, not when it arrives', () => {
  it('a 1200 ms duplicate check still yields a shielded Send for the full window after the modal appears', async () => {
    slowCheck([], SLOW_CHECK_MS);
    render(<ConnectProvider><Probe /></ConnectProvider>);
    act(() => ctx!.attachHost(host, 'https://a.example'));

    sendIntent();

    // The arrival window burns while the check runs behind a blank screen —
    // nothing actionable is on screen, so it protects nothing.
    await act(async () => { vi.advanceTimersByTime(SETTLE_MS); });
    expect(screen.queryByText(SEND_MODAL_COPY)).toBeNull();

    // The check answers: the Send button appears NOW, and the window restarts NOW.
    await act(async () => { vi.advanceTimersByTime(SLOW_CHECK_MS - SETTLE_MS); });
    expect(screen.getByText(SEND_MODAL_COPY)).toBeTruthy();
    expect(shielded()).toBe(true);
    expect(screen.getByTestId('interactive').textContent).toBe('false');

    // Still shielded a tick before the window closes...
    await act(async () => { vi.advanceTimersByTime(SETTLE_MS - 1); });
    expect(shielded()).toBe(true);

    // ...and released only after a full INTENT_SETTLE_MS of the modal being visible.
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(shielded()).toBe(false);
    expect(screen.getByTestId('interactive').textContent).toBe('true');
  });

  it('shields the duplicate warning from ITS appearance — "Send anyway" spends a second time', async () => {
    slowCheck([pendingRow()], SLOW_CHECK_MS);
    render(<ConnectProvider><Probe /></ConnectProvider>);
    act(() => ctx!.attachHost(host, 'https://a.example'));

    sendIntent();
    await act(async () => { vi.advanceTimersByTime(SLOW_CHECK_MS); });

    expect(screen.getByText('Payment already in progress')).toBeTruthy();
    expect(shielded()).toBe(true);

    await act(async () => { vi.advanceTimersByTime(SETTLE_MS); });
    expect(shielded()).toBe(false);

    // Choosing "Send anyway" swaps in a fresh primary button under the cursor
    // that just clicked — that is a new presentation, so it re-arms.
    await act(async () => { fireEvent.click(screen.getByText('Send anyway')); });
    expect(screen.getByText(SEND_MODAL_COPY)).toBeTruthy();
    expect(shielded()).toBe(true);
    expect(transferMock).not.toHaveBeenCalled();

    await act(async () => { vi.advanceTimersByTime(SETTLE_MS); });
    expect(shielded()).toBe(false);
  });

  it('an immediately presented intent keeps the arrival-armed window (no regression, no double window)', async () => {
    render(<ConnectProvider><Probe /></ConnectProvider>);
    act(() => ctx!.attachHost(host, 'https://a.example'));

    act(() => {
      void ctx!.requestIntent(host, 'https://a.example', 'sign_message', { message: 'hi' });
    });

    expect(screen.getByText('Sign Message')).toBeTruthy();
    expect(shielded()).toBe(true);

    // Exactly one window, measured from arrival — the handler must not add a
    // second one for UI that was never delayed.
    await act(async () => { vi.advanceTimersByTime(SETTLE_MS); });
    expect(shielded()).toBe(false);
    expect(screen.getByTestId('interactive').textContent).toBe('true');
  });

  it('does not re-arm on a re-render that changes nothing about what is presented', async () => {
    render(<ConnectProvider><Probe /></ConnectProvider>);
    act(() => ctx!.attachHost(host, 'https://a.example'));

    sendIntent();
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(screen.getByText(SEND_MODAL_COPY)).toBeTruthy();

    // Half the window in, force unrelated re-renders of the whole tree (a
    // connection approval queuing behind the intent re-renders the provider and
    // every child). If arming were per-render the window would never close.
    await act(async () => { vi.advanceTimersByTime(SETTLE_MS / 2); });
    act(() => {
      void ctx!.requestApproval(host, { name: 'dapp' } as DAppMetadata, [], 'https://a.example');
      void ctx!.requestApproval(host, { name: 'dapp' } as DAppMetadata, [], 'https://a.example');
    });
    expect(shielded()).toBe(true);

    // The window still closes on its ORIGINAL schedule.
    await act(async () => { vi.advanceTimersByTime(SETTLE_MS / 2); });
    expect(shielded()).toBe(false);
  });
});
