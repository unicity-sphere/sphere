/**
 * #449 CRITICAL no-wallet-loss regression (guard kept green through the #449
 * follow-up that re-introduced SetPasswordScreen in the create flow): the
 * create flow used to route through SetPasswordScreen (after the
 * mnemonic-backup screen) and, if the user chose a password, run a SECOND
 * `importWallet()` call on the wallet `createWallet()` had already persisted
 * moments earlier. `importWallet` wraps the SDK's `Sphere.import()`, which
 * unconditionally `Sphere.clear()`s any already-persisted wallet before
 * rebuilding it — if that rebuild then failed (a network hiccup during
 * identity/nametag sync, etc.), storage was left cleared while the app kept
 * using the in-memory instance for the rest of the session, so on next
 * reload the wallet could show unexpectedly LOCKED or vanish entirely. It
 * also raced the just-published Nostr nametag binding from
 * createWalletThenRegister (#448), risking permanently burning it.
 *
 * The #449 follow-up brought SetPasswordScreen BACK into the create flow
 * (ordering: mnemonicBackup → setPassword → planCapabilities → wallet), but
 * applies a chosen password via the reviewed-SAFE in-place re-encrypt
 * (`setWalletPassword`, not `importWallet`) — see
 * tests/unit/components/createFlowPassword.test.tsx for that path. This test
 * keeps guarding the ORIGINAL regression: the create flow still persists its
 * (plaintext) wallet exactly ONCE via `createWallet()`, and Skipping the new
 * password step still never calls `importWallet` — the SDK call that would
 * `Sphere.clear()` the wallet `createWallet()` just persisted.
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
  setWalletPassword: vi.fn(async () => {}),
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
  it('never calls importWallet; createWallet() is the ONLY persisting call, and skipping the password step finalizes with no re-encrypt', async () => {
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

    // Confirming the backup now leads to the optional SetPasswordScreen
    // (#449 follow-up) — it must NOT finalize directly anymore.
    fireEvent.click(screen.getByRole('button', { name: /saved my recovery phrase/i }));
    await waitFor(() => expect(screen.getByText(/protect your wallet/i)).toBeDefined());
    expect(ctx.finalizeWallet).not.toHaveBeenCalled();

    // Skip the optional password.
    fireEvent.click(screen.getByRole('button', { name: /^skip$/i }));

    await waitFor(() => expect(ctx.finalizeWallet).toHaveBeenCalledTimes(1), { timeout: 3000 });

    // The critical assertion: importWallet — the SDK call that would
    // Sphere.clear() the wallet createWallet() just persisted — is never
    // invoked anywhere in this flow, and createWallet ran exactly once.
    // Skipping the password step must also never call setWalletPassword.
    expect(ctx.importWallet).not.toHaveBeenCalled();
    expect(ctx.createWallet).toHaveBeenCalledTimes(1);
    expect(ctx.setWalletPassword).not.toHaveBeenCalled();
  });
});
