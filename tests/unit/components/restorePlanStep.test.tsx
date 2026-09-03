/**
 * sphere#496: restoring a wallet re-provisions (get-or-creates) its gateway
 * key, so the plan it comes back on decides what onboarding does next.
 *
 *  - already on a PAID plan → nothing to decide, walk straight into the wallet;
 *  - on the FREE plan → show the plan line-up, as onboarding does for a fresh
 *    wallet.
 *
 * Drives the real restore-from-mnemonic flow (the harness mirrors
 * importPassword.test.tsx) with subscriptions ON and the gateway call mocked,
 * because this branch lives in doFinalizeWallet.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const VALID_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

const ctx = vi.hoisted(() => ({
  importWallet: vi.fn(async () => ({
    getAllTrackedAddresses: () => [],
    identity: { nametag: null },
  })),
  createWallet: vi.fn(async () => ({ mnemonic: 'never called', sphere: {} })),
  finalizeWallet: vi.fn(),
  resolveNametag: vi.fn(async () => null),
  importFromFile: vi.fn(),
  setWalletPassword: vi.fn(async () => {}),
  provision: vi.fn(),
}));

vi.mock('../../../src/config/subscription', async (orig) => ({
  ...(await orig<typeof import('../../../src/config/subscription')>()),
  SUBSCRIPTION_ENABLED: true,
  PAID_PLANS_ENABLED: true,
}));

vi.mock('../../../src/services/subscriptionApi', async (orig) => ({
  ...(await orig<typeof import('../../../src/services/subscriptionApi')>()),
  provisionOrRecoverKey: () => ctx.provision(),
}));

// The plan screen's own data comes from the gateway; stub it so this test is
// about the branch, not about the line-up.
vi.mock('../../../src/sdk/hooks/subscription', () => ({
  usePlans: () => ({ data: [], isLoading: false, isError: false }),
  useUtilization: () => ({ data: null, isLoading: false, isError: false }),
  useCheckout: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({
    sphere: null,
    network: 'testnet2',
    createWallet: ctx.createWallet,
    resolveNametag: ctx.resolveNametag,
    importWallet: ctx.importWallet,
    importFromFile: ctx.importFromFile,
    finalizeWallet: ctx.finalizeWallet,
    walletExists: false,
    initProgress: null,
    setWalletPassword: ctx.setWalletPassword,
    applySubscriptionKey: vi.fn(),
  }),
}));

import { CreateWalletFlow } from '../../../src/components/wallet/onboarding/CreateWalletFlow';

function Wrapper({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

/** Restore-from-mnemonic through nametag-skip and the optional password step. */
async function restoreWallet() {
  render(<CreateWalletFlow initialStep="restore" />, { wrapper: Wrapper });

  const inputs = screen.getAllByPlaceholderText('word');
  VALID_MNEMONIC.split(' ').forEach((w, i) => fireEvent.change(inputs[i], { target: { value: w } }));
  fireEvent.click(screen.getByRole('button', { name: /^restore$/i }));

  await waitFor(() => expect(ctx.importWallet).toHaveBeenCalled());
  await waitFor(() => expect(screen.getByText(/choose unicity id/i)).toBeDefined());
  fireEvent.click(screen.getByRole('button', { name: /skip for now/i }));

  await waitFor(() => expect(screen.getByText(/protect your wallet/i)).toBeDefined());
  fireEvent.click(screen.getByRole('button', { name: /^skip$/i }));
}

beforeEach(() => {
  ctx.importWallet.mockClear();
  ctx.finalizeWallet.mockClear();
  ctx.setWalletPassword.mockClear();
  ctx.provision.mockReset();
});

describe('restore lands on the plan step only when the recovered plan is free', () => {
  it('walks a restored PAID wallet straight into the wallet', async () => {
    ctx.provision.mockResolvedValue({ apiKey: `sk_${'a'.repeat(32)}`, plan: 'premium', created: false });

    await restoreWallet();

    await waitFor(() => expect(ctx.finalizeWallet).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/subscription restored/i)).toBeNull();
    expect(screen.queryByText(/your plan is ready/i)).toBeNull();
  });

  it('shows the plan line-up for a restored FREE wallet', async () => {
    ctx.provision.mockResolvedValue({ apiKey: `sk_${'b'.repeat(32)}`, plan: 'free', created: false });

    await restoreWallet();

    await waitFor(() => expect(screen.queryByText(/subscription restored/i)).not.toBeNull());
    // Still on the step — the wallet is finalized by its continue button.
    expect(ctx.finalizeWallet).not.toHaveBeenCalled();
  });
});
