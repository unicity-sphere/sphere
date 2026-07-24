/**
 * #449 CRITICAL no-wallet-loss regression: the create flow used to route
 * through SetPasswordScreen (after the mnemonic-backup screen) and, if the
 * user chose a password, run a SECOND `importWallet()` call on the wallet
 * `createWallet()` had already persisted moments earlier. `importWallet`
 * wraps the SDK's `Sphere.import()`, which unconditionally `Sphere.clear()`s
 * any already-persisted wallet before rebuilding it — if that rebuild then
 * failed (a network hiccup during identity/nametag sync, etc.), storage was
 * left cleared while the app kept using the in-memory instance for the rest
 * of the session, so on next reload the wallet could show unexpectedly
 * LOCKED or vanish entirely. It also raced the just-published Nostr nametag
 * binding from createWalletThenRegister (#448), risking permanently burning
 * it.
 *
 * Fixed by removing the create flow's use of SetPasswordScreen entirely: the
 * create flow now persists its (plaintext) wallet exactly ONCE, via
 * `createWallet()`, and finalizes straight from the mnemonic-backup screen.
 * This test asserts `importWallet` is never invoked anywhere in the
 * skip-nametag create path, `createWallet` runs exactly once, and the
 * SetPasswordScreen ("Protect Your Wallet") never appears in that flow.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Keep this test deterministic and network-free: doFinalizeWallet only
// short-circuits straight to finishFinalize() when subscriptions are off —
// otherwise it would race a real subscriptionApi HTTP call.
vi.mock('../../../src/config/subscription', async (orig) => ({
  ...(await orig<typeof import('../../../src/config/subscription')>()),
  SUBSCRIPTION_ENABLED: false,
}));

const ctx = vi.hoisted(() => ({
  importWallet: vi.fn(async () => ({
    getAllTrackedAddresses: () => [],
    identity: { nametag: null },
  })),
  createWallet: vi.fn(async () => ({
    mnemonic:
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    sphere: { registerNametag: vi.fn(async () => {}) },
  })),
  finalizeWallet: vi.fn(),
  resolveNametag: vi.fn(async () => null),
  importFromFile: vi.fn(),
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
  }),
}));

import { CreateWalletFlow } from '../../../src/components/wallet/onboarding/CreateWalletFlow';

function Wrapper({ children }: { children: ReactNode }) {
  const [qc] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('create flow persists the wallet exactly once (#449)', () => {
  it('never calls importWallet; createWallet() is the ONLY persisting call and the backup screen finalizes directly', async () => {
    render(<CreateWalletFlow />, { wrapper: Wrapper });

    // Start → "Create New Wallet"
    fireEvent.click(screen.getByRole('button', { name: /create new wallet/i }));

    // Nametag screen → skip
    await waitFor(() => expect(screen.getByRole('button', { name: /skip for now/i })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /skip for now/i }));

    // createWallet() persists the (plaintext) wallet exactly once.
    await waitFor(() => expect(ctx.createWallet).toHaveBeenCalledTimes(1));

    // Processing screen auto-transitions to the mnemonic backup screen.
    await waitFor(
      () => expect(screen.getByRole('button', { name: /saved my recovery phrase/i })).toBeDefined(),
      { timeout: 3000 },
    );

    // The create flow must NOT offer a SetPasswordScreen anywhere.
    expect(screen.queryByText(/protect your wallet/i)).toBeNull();

    // Confirming the backup finalizes directly — no intervening setPassword step.
    fireEvent.click(screen.getByRole('button', { name: /saved my recovery phrase/i }));

    await waitFor(() => expect(ctx.finalizeWallet).toHaveBeenCalledTimes(1), { timeout: 3000 });

    // The critical assertion: importWallet — the SDK call that would
    // Sphere.clear() the wallet createWallet() just persisted — is never
    // invoked anywhere in this flow, and createWallet ran exactly once.
    expect(ctx.importWallet).not.toHaveBeenCalled();
    expect(ctx.createWallet).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/protect your wallet/i)).toBeNull();
  });
});
