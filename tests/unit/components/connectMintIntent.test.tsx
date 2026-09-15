/**
 * The coin `mint` Connect intent: the wallet self-mints a fungible token to its own
 * address. A mint that throws is an unknown outcome — it may have been journaled, and
 * a journaled mint resumes on its own — so it settles at once and is never offered
 * again for that intent, where a retry could mint twice.
 *
 * Runs the real handler and modal; the wallet, the registry, the subscription guard
 * and the Connect context are fakes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ConnectHost } from '@unicitylabs/sphere-sdk/connect';
import { ERROR_CODES } from '@unicitylabs/sphere-sdk/connect';
import type { MintResult } from '@unicitylabs/sphere-sdk/payments-v2';
import type { PendingIntent } from '../../../src/components/connect/ConnectContext';

const mocks = vi.hoisted(() => ({
  mint: vi.fn<(coinId: string, amount: bigint) => Promise<MintResult>>(),
  subscriptionReady: true,
}));

// An empty registry: the modal names the coin by its id.
vi.mock('@unicitylabs/sphere-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@unicitylabs/sphere-sdk')>();
  return {
    ...actual,
    TokenRegistry: { getInstance: () => ({ getDefinition: () => undefined, getIconUrl: () => null }) },
  };
});
vi.mock('../../../src/sdk', () => ({
  useSphereContext: () => ({ sphere: {} }),
}));
vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: {} }),
}));
vi.mock('../../../src/sdk/payments', () => ({
  getPayments: () => ({ mint: mocks.mint }),
}));
vi.mock('../../../src/sdk/hooks/subscription', () => ({
  useSubscriptionKeyGuard: () => ({ ready: mocks.subscriptionReady, assertReady: vi.fn() }),
}));
vi.mock('../../../src/sdk/hooks/comms/useSendDM', () => ({
  useSendDM: () => ({ sendDM: vi.fn(), isLoading: false }),
}));
vi.mock('../../../src/components/upgrade', () => ({
  useUpgrade: () => ({ openUpgrade: vi.fn() }),
}));

const resolveIntent = vi.fn();
const rejectIntent = vi.fn();
let pendingIntent: PendingIntent | null = null;

/** Intent ids the host has stopped waiting for, as ConnectProvider.isIntentPending sees them. */
const stoppedIntents = new Set<number>();

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

const INTENT_ID = 21;
const COIN_ID = 'ab'.repeat(32);
const AMOUNT = '1000';
const TOKEN_ID = 'cd'.repeat(32);

function mintIntent(params: Record<string, unknown> = { coinId: COIN_ID, amount: AMOUNT }): PendingIntent {
  return { id: INTENT_ID, host: {} as ConnectHost, origin: 'https://faucet.example', action: 'mint', params, resolve: vi.fn() };
}

function mintButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Mint' }) as HTMLButtonElement;
}

function cancelButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement;
}

async function clickMint() {
  await act(async () => {
    fireEvent.click(mintButton());
  });
}

beforeEach(() => {
  mocks.mint.mockReset();
  mocks.subscriptionReady = true;
  resolveIntent.mockClear();
  rejectIntent.mockClear();
  pendingIntent = mintIntent();
});

describe('mint intent — the outcome', () => {
  it('mints the requested amount once and resolves { tokenId, coinId, amount }', async () => {
    mocks.mint.mockResolvedValue({ success: true, tokenId: TOKEN_ID });
    render(<ConnectIntentHandler />);

    expect(screen.getByText('Mint Tokens')).toBeTruthy();
    await clickMint();

    await waitFor(() =>
      expect(resolveIntent).toHaveBeenCalledWith(INTENT_ID, { tokenId: TOKEN_ID, coinId: COIN_ID, amount: AMOUNT }),
    );
    expect(mocks.mint).toHaveBeenCalledTimes(1);
    expect(mocks.mint).toHaveBeenCalledWith(COIN_ID, 1000n);
    expect(rejectIntent).not.toHaveBeenCalled();
  });

  it('a journaled failure is an unknown outcome that may still complete, naming the token id in the message and the data', async () => {
    mocks.mint.mockResolvedValue({ success: false, tokenId: TOKEN_ID, error: 'gateway timeout' });
    render(<ConnectIntentHandler />);

    await clickMint();

    await waitFor(() => expect(rejectIntent).toHaveBeenCalledTimes(1));
    const [id, code, message, data] = rejectIntent.mock.calls[0]!;
    expect(id).toBe(INTENT_ID);
    // The one code that forbids the dApp to ask again: the wallet resumes this mint.
    expect(code).toBe(ERROR_CODES.INTENT_OUTCOME_UNKNOWN);
    expect(message).toMatch(/may still complete/);
    expect(message).toContain(TOKEN_ID);
    expect(message).toContain('gateway timeout');
    expect(data).toEqual({ tokenId: TOKEN_ID });
    expect(resolveIntent).not.toHaveBeenCalled();
  });

  it('mints nothing once the host has stopped waiting for the intent, even with Mint still on screen', async () => {
    render(<ConnectIntentHandler />);
    stoppedIntents.add(INTENT_ID);
    try {
      await clickMint();

      expect(mocks.mint).not.toHaveBeenCalled();
      expect(resolveIntent).not.toHaveBeenCalled();
      expect(rejectIntent).not.toHaveBeenCalled();
    } finally {
      stoppedIntents.delete(INTENT_ID);
    }
  });

  it('a failure with nothing journaled is INTERNAL_ERROR with its reason, and no data', async () => {
    mocks.mint.mockResolvedValue({ success: false, error: 'amount too large' });
    render(<ConnectIntentHandler />);

    await clickMint();

    await waitFor(() => expect(rejectIntent).toHaveBeenCalledTimes(1));
    expect(rejectIntent.mock.calls[0]).toEqual([INTENT_ID, ERROR_CODES.INTERNAL_ERROR, 'amount too large']);
  });

  it.each([
    ['rejects', () => Promise.reject(new Error('Payments are not running'))],
    ['throws synchronously', () => { throw new Error('Payments are not running'); }],
  ] as const)(
    'settles a mint that %s as an unknown outcome at once, and never mints twice for the intent',
    async (_how, failure) => {
      mocks.mint.mockImplementation(failure);
      render(<ConnectIntentHandler />);

      await clickMint();

      await waitFor(() => expect(rejectIntent).toHaveBeenCalledTimes(1));
      const [id, code, message] = rejectIntent.mock.calls[0]!;
      expect(id).toBe(INTENT_ID);
      expect(code).toBe(ERROR_CODES.INTENT_OUTCOME_UNKNOWN);
      expect(message).toMatch(/may have started/);
      expect(message).toMatch(/may still complete/);
      expect(message).toMatch(/balance before trying again/);
      expect(message).toContain('Payments are not running');
      expect(resolveIntent).not.toHaveBeenCalled();

      // Mint and Cancel stay disabled, and nothing here mints or settles the intent again.
      expect(mintButton().disabled).toBe(true);
      expect(cancelButton().disabled).toBe(true);
      await clickMint();
      fireEvent.click(cancelButton());
      expect(mocks.mint).toHaveBeenCalledTimes(1);
      expect(rejectIntent).toHaveBeenCalledTimes(1);
    },
  );

  it('cannot be cancelled while the mint runs', async () => {
    let finish!: (result: MintResult) => void;
    mocks.mint.mockImplementation(() => new Promise<MintResult>((resolve) => { finish = resolve; }));
    render(<ConnectIntentHandler />);

    await clickMint();
    expect(screen.getByRole('button', { name: 'Minting…' })).toBeTruthy();
    expect(cancelButton().disabled).toBe(true);
    fireEvent.click(cancelButton());
    expect(rejectIntent).not.toHaveBeenCalled();

    await act(async () => { finish({ success: true, tokenId: TOKEN_ID }); });
    expect(resolveIntent).toHaveBeenCalledWith(INTENT_ID, { tokenId: TOKEN_ID, coinId: COIN_ID, amount: AMOUNT });
    expect(mocks.mint).toHaveBeenCalledTimes(1);
  });
});

describe('mint intent — refused before anything is minted', () => {
  it.each([
    ['a coinId that is not lowercase even-length hex', { coinId: 'ABC', amount: AMOUNT }, 'coinId'],
    ['an amount that is not an integer', { coinId: COIN_ID, amount: '1.5' }, 'integer'],
    ['a zero amount', { coinId: COIN_ID, amount: '0' }, 'greater than zero'],
  ] as const)('refuses %s with INVALID_PARAMS', async (_what, params, text) => {
    pendingIntent = mintIntent({ ...params });
    render(<ConnectIntentHandler />);

    await clickMint();

    expect(rejectIntent).toHaveBeenCalledWith(INTENT_ID, ERROR_CODES.INVALID_PARAMS, expect.stringContaining(text));
    expect(mocks.mint).not.toHaveBeenCalled();
  });

  it('refuses while the subscription key is still being set up: INTERNAL_ERROR, and no mint', async () => {
    mocks.subscriptionReady = false;
    render(<ConnectIntentHandler />);

    await clickMint();

    expect(mocks.mint).not.toHaveBeenCalled();
    expect(rejectIntent).toHaveBeenCalledWith(INTENT_ID, ERROR_CODES.INTERNAL_ERROR, expect.stringMatching(/Subscription/));
  });

  it('Cancel rejects with USER_REJECTED and mints nothing', () => {
    render(<ConnectIntentHandler />);

    fireEvent.click(cancelButton());

    expect(rejectIntent).toHaveBeenCalledWith(INTENT_ID, ERROR_CODES.USER_REJECTED, expect.any(String));
    expect(mocks.mint).not.toHaveBeenCalled();
    expect(resolveIntent).not.toHaveBeenCalled();
  });
});
