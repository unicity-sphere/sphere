/**
 * An intent its Connect host stopped waiting for (its deadline, a lock, a revoked
 * session) leaves the queue at once, but its modal may not have unmounted when a click
 * lands. Nothing with an effect outside the wallet may act on it then: the host has
 * already answered the dApp, which may send the request again.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ConnectHost } from '@unicitylabs/sphere-sdk/connect';

const COIN = 'c'.repeat(64);
const INTENT_ID = 9;
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
const sendDMMock = vi.fn();
const signMessageMock = vi.fn(() => 'signature');
const createRequestMock = vi.fn();

const fakeSphere = {
  identity: { chainPubkey: BOB_PUBKEY },
  resolve: vi.fn(async () => ({ chainPubkey: BOB_PUBKEY })),
  signMessage: signMessageMock,
  payments: {
    pendingTransfers: vi.fn(async () => []),
    requests: { create: createRequestMock },
  },
};

// ConnectIntentHandler reads useSphereContext from the barrel; the duplicate-send guard
// reads it from the deep module — both must see the same fake wallet.
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
  useSendDM: () => ({ sendDM: sendDMMock, isLoading: false }),
}));
vi.mock('../../../src/components/upgrade', () => ({
  useUpgrade: () => ({ openUpgrade: vi.fn() }),
}));

const resolveIntent = vi.fn();
const rejectIntent = vi.fn();
/** Intent ids the host has stopped waiting for, as ConnectProvider.isIntentPending sees them. */
const stoppedIntents = new Set<number>();
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
    armIntentShield: vi.fn(),
    isIntentPending: (id: number) => !stoppedIntents.has(id),
  }),
}));

import { ConnectIntentHandler } from '../../../src/components/connect/ConnectIntentHandler';

function intent(action: string, params: Record<string, unknown>) {
  return { id: INTENT_ID, host: {} as ConnectHost, origin: 'https://dapp.example', action, params, resolve: vi.fn() };
}

/** Every intent with an effect outside this view: its params, its confirm button, and the call it makes. */
const CASES: ReadonlyArray<readonly [string, Record<string, unknown>, string, () => ReturnType<typeof vi.fn>]> = [
  ['send', { to: '@bob', amount: '100', coinId: COIN }, 'Send', () => transferMock],
  ['payment_request', { to: '@bob', amount: '100', coinId: COIN }, 'Send Request', () => createRequestMock],
  ['dm', { to: '@bob', message: 'gm' }, 'Send DM', () => sendDMMock],
  ['sign_message', { message: 'Domain: dapp.example\nNonce: 1' }, 'Sign', () => signMessageMock],
];

beforeEach(() => {
  transferMock.mockReset();
  transferMock.mockResolvedValue({ id: 'tid', status: 'confirmed', tokens: [], tokenTransfers: [] });
  sendDMMock.mockReset();
  sendDMMock.mockResolvedValue({ id: 'dm-1', timestamp: 1 });
  signMessageMock.mockClear();
  createRequestMock.mockReset();
  createRequestMock.mockResolvedValue({ success: true, requestId: 'req-1' });
  resolveIntent.mockClear();
  rejectIntent.mockClear();
  stoppedIntents.clear();
});

describe('Connect intents — nothing acts on an intent its host stopped waiting for', () => {
  it.each(CASES)('%s acts on its confirm button while the intent is still waited for', async (action, params, button, effect) => {
    pendingIntent = intent(action, params);
    render(<ConnectIntentHandler />);

    const control = await screen.findByRole('button', { name: button });
    await act(async () => {
      fireEvent.click(control);
    });

    expect(effect()).toHaveBeenCalledTimes(1);
  });

  it.each(CASES)(
    '%s does nothing once the host has stopped waiting, though its button is still on screen',
    async (action, params, button, effect) => {
      pendingIntent = intent(action, params);
      render(<ConnectIntentHandler />);
      const control = await screen.findByRole('button', { name: button });

      stoppedIntents.add(INTENT_ID);
      await act(async () => {
        fireEvent.click(control);
      });

      expect(effect()).not.toHaveBeenCalled();
      expect(resolveIntent).not.toHaveBeenCalled();
      expect(rejectIntent).not.toHaveBeenCalled();
    },
  );
});
