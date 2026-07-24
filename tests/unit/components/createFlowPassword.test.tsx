/**
 * #449 follow-up: the CREATE onboarding flow now offers the SAME optional
 * at-rest password step the restore/import flow offers, right after the
 * mnemonic-backup screen and before plan-capabilities — new ordering:
 * mnemonicBackup → setPassword → planCapabilities → wallet.
 *
 * This is safe (unlike the original #449 bug — see
 * createFlowSinglePersist.test.tsx) because the wallet is ALREADY persisted
 * (plaintext) by createWallet() before the backup screen shows, and a chosen
 * password is applied via the reviewed-SAFE in-place re-encrypt
 * (`setWalletPassword`, which wraps `reencryptStoredMnemonic`) — never a
 * second `importWallet()`/`Sphere.import()` call.
 *
 * Covers:
 *  - the step transition (backup-complete → setPassword)
 *  - choosing a password calls setWalletPassword (never importWallet)
 *  - skipping finalizes without calling setWalletPassword
 *  - a setWalletPassword rejection still lets the user finalize (the wallet
 *    is never lost/stuck)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
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

/** Drives the create flow (skip-nametag) up to the mnemonic-backup screen's
 *  "Saved My Recovery Phrase" confirmation, then clicks it — landing on
 *  the new setPassword step. */
async function driveToSetPasswordScreen() {
  render(<CreateWalletFlow />, { wrapper: Wrapper });

  fireEvent.click(screen.getByRole('button', { name: /create new wallet/i }));

  await waitFor(() => expect(screen.getByRole('button', { name: /skip for now/i })).toBeDefined());
  fireEvent.click(screen.getByRole('button', { name: /skip for now/i }));

  await waitFor(() => expect(ctx.createWallet).toHaveBeenCalledTimes(1));

  await waitFor(
    () => expect(screen.getByRole('button', { name: /saved my recovery phrase/i })).toBeDefined(),
    { timeout: 3000 },
  );

  fireEvent.click(screen.getByRole('button', { name: /saved my recovery phrase/i }));

  await waitFor(() => expect(screen.getByText(/protect your wallet/i)).toBeDefined());
}

beforeEach(() => {
  ctx.importWallet.mockClear();
  ctx.createWallet.mockClear();
  ctx.finalizeWallet.mockClear();
  ctx.setWalletPassword.mockClear();
  ctx.setWalletPassword.mockImplementation(async () => {});
});

describe('create flow optional password step (#449 follow-up)', () => {
  it('shows setPassword right after the backup-complete confirmation', async () => {
    await driveToSetPasswordScreen();

    expect(screen.getByText(/protect your wallet/i)).toBeDefined();
    expect(ctx.finalizeWallet).not.toHaveBeenCalled();
  });

  it('choosing a password calls setWalletPassword (never importWallet) and then finalizes', async () => {
    await driveToSetPasswordScreen();

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'my-secret-1' } });
    fireEvent.change(screen.getByLabelText(/confirm/i), { target: { value: 'my-secret-1' } });
    fireEvent.click(screen.getByRole('button', { name: /^set password$/i }));

    await waitFor(() => expect(ctx.setWalletPassword).toHaveBeenCalledWith('my-secret-1'));

    await waitFor(() => expect(ctx.finalizeWallet).toHaveBeenCalledTimes(1));

    expect(ctx.importWallet).not.toHaveBeenCalled();
    expect(ctx.createWallet).toHaveBeenCalledTimes(1);
  });

  it('skipping finalizes without ever calling setWalletPassword', async () => {
    await driveToSetPasswordScreen();

    fireEvent.click(screen.getByRole('button', { name: /^skip$/i }));

    await waitFor(() => expect(ctx.finalizeWallet).toHaveBeenCalledTimes(1));

    expect(ctx.setWalletPassword).not.toHaveBeenCalled();
    expect(ctx.importWallet).not.toHaveBeenCalled();
  });

  it('a setWalletPassword rejection still lets the user finalize — the wallet is never lost', async () => {
    ctx.setWalletPassword.mockImplementation(async () => {
      throw new Error('re-encrypt failed');
    });

    await driveToSetPasswordScreen();

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'my-secret-1' } });
    fireEvent.change(screen.getByLabelText(/confirm/i), { target: { value: 'my-secret-1' } });
    fireEvent.click(screen.getByRole('button', { name: /^set password$/i }));

    await waitFor(() => expect(ctx.setWalletPassword).toHaveBeenCalledWith('my-secret-1'));

    // Despite the rejection, the user still reaches the wallet — never
    // re-runs importWallet, and never gets stuck on this screen.
    await waitFor(() => expect(ctx.finalizeWallet).toHaveBeenCalledTimes(1));
    expect(ctx.importWallet).not.toHaveBeenCalled();
  });
});
