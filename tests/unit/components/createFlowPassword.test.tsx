/**
 * #449 create-flow reorder: show -> confirm -> password -> download. The
 * CREATE onboarding flow now displays the recovery phrase, makes the user
 * re-enter it to VERIFY the backup (ConfirmMnemonicScreen), THEN asks for
 * the optional at-rest password, and only THEN offers the backup-file
 * download — new ordering: processing → mnemonicShow → mnemonicConfirm →
 * setPassword → backupDownload → planCapabilities → wallet. The ONE password
 * chosen on setPassword also encrypts the downloaded backup file.
 *
 * This is safe (unlike the original #449 bug — see
 * createFlowSinglePersist.test.tsx) because the wallet is ALREADY persisted
 * (plaintext) by createWallet() before any of these screens show, and a
 * chosen password is applied via the reviewed-SAFE in-place re-encrypt
 * (`setWalletPassword`, which wraps `reencryptStoredMnemonic`) — never a
 * second `importWallet()`/`Sphere.import()` call.
 *
 * Covers:
 *  - setPassword shows only AFTER mnemonicShow + mnemonicConfirm, and BEFORE
 *    the backup-download screen
 *  - choosing a password calls setWalletPassword (never importWallet), then
 *    advances to the backup-download screen — not finalized yet
 *  - the SAME password threads into the downloaded backup file
 *  - skipping leaves the backup file plaintext and still finalizes
 *  - a setWalletPassword rejection surfaces an error and does NOT advance
 *    past setPassword — the wallet is never lost/stuck (still skippable)
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

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

const ctx = vi.hoisted(() => {
  const exportToJSON = vi.fn((opts: unknown) => ({ opts }));
  return {
    importWallet: vi.fn(async () => ({
      getAllTrackedAddresses: () => [],
      identity: { nametag: null },
    })),
    exportToJSON,
    createWallet: vi.fn(async () => ({
      mnemonic:
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      sphere: { registerNametag: vi.fn(async () => {}), exportToJSON },
    })),
    finalizeWallet: vi.fn(),
    resolveNametag: vi.fn(async () => null),
    importFromFile: vi.fn(),
    setWalletPassword: vi.fn(async () => {}),
  };
});

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

/** Drives the create flow (skip-nametag) all the way through the mnemonic
 *  show + confirm screens up to the new setPassword screen. */
async function driveToSetPasswordScreen() {
  render(<CreateWalletFlow />, { wrapper: Wrapper });

  fireEvent.click(screen.getByRole('button', { name: /create new wallet/i }));

  await waitFor(() => expect(screen.getByRole('button', { name: /skip for now/i })).toBeDefined());
  fireEvent.click(screen.getByRole('button', { name: /skip for now/i }));

  await waitFor(() => expect(ctx.createWallet).toHaveBeenCalledTimes(1));

  // Show step first.
  await waitFor(
    () => expect(screen.getByText(/back up recovery phrase/i)).toBeDefined(),
    { timeout: 3000 },
  );
  fireEvent.click(screen.getByRole('button', { name: /saved my recovery phrase/i }));

  // Confirm step — re-enter the correct phrase (12-word grid). Pasting the
  // whole phrase into the first cell fills every cell.
  await waitFor(() => expect(screen.getByText(/confirm recovery phrase/i)).toBeDefined());
  const confirmCells = screen.getAllByPlaceholderText('word');
  fireEvent.paste(confirmCells[0], { clipboardData: { getData: () => MNEMONIC } });
  fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

  await waitFor(
    () => expect(screen.getByText(/protect your wallet/i)).toBeDefined(),
    { timeout: 3000 },
  );
}

beforeEach(() => {
  ctx.importWallet.mockClear();
  ctx.createWallet.mockClear();
  ctx.finalizeWallet.mockClear();
  ctx.setWalletPassword.mockClear();
  ctx.setWalletPassword.mockImplementation(async () => {});
  ctx.exportToJSON.mockClear();
});

describe('create flow ordering: show -> confirm -> password -> download (#449)', () => {
  it('shows setPassword only after mnemonicShow + mnemonicConfirm, before the backup-download screen', async () => {
    await driveToSetPasswordScreen();

    expect(screen.getByText(/protect your wallet/i)).toBeDefined();
    expect(screen.queryByText(/download wallet backup/i)).toBeNull();
    expect(ctx.finalizeWallet).not.toHaveBeenCalled();
  });

  it('choosing a password calls setWalletPassword (never importWallet), advances to the backup-download screen (not finalized), and the SAME password encrypts the downloaded backup', async () => {
    await driveToSetPasswordScreen();

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'my-secret-1' } });
    fireEvent.change(screen.getByLabelText(/confirm/i), { target: { value: 'my-secret-1' } });
    fireEvent.click(screen.getByRole('button', { name: /^set password$/i }));

    await waitFor(() => expect(ctx.setWalletPassword).toHaveBeenCalledWith('my-secret-1'));

    // Advances to the backup-download screen next — NOT finalized yet.
    await waitFor(() => expect(screen.getByText(/download wallet backup/i)).toBeDefined());
    expect(ctx.finalizeWallet).not.toHaveBeenCalled();
    expect(ctx.importWallet).not.toHaveBeenCalled();

    // The single #450 backup-file password input is gone — the button
    // itself now reflects that the wallet password will be reused.
    expect(screen.queryByPlaceholderText(/backup file password/i)).toBeNull();
    const downloadButton = screen.getByRole('button', { name: /download encrypted backup/i });
    fireEvent.click(downloadButton);
    expect(ctx.exportToJSON).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'my-secret-1' }),
    );

    // Continuing from the download screen finalizes.
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
    await waitFor(() => expect(ctx.finalizeWallet).toHaveBeenCalledTimes(1));
    expect(ctx.createWallet).toHaveBeenCalledTimes(1);
  });

  it('skipping leaves the backup file plaintext and finalizes without ever calling setWalletPassword', async () => {
    await driveToSetPasswordScreen();

    fireEvent.click(screen.getByRole('button', { name: /^skip$/i }));

    await waitFor(() => expect(screen.getByText(/download wallet backup/i)).toBeDefined());
    const downloadButton = screen.getByRole('button', { name: /^download backup file$/i });
    fireEvent.click(downloadButton);
    expect(ctx.exportToJSON).toHaveBeenCalledWith(
      expect.objectContaining({ password: undefined }),
    );

    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
    await waitFor(() => expect(ctx.finalizeWallet).toHaveBeenCalledTimes(1));

    expect(ctx.setWalletPassword).not.toHaveBeenCalled();
    expect(ctx.importWallet).not.toHaveBeenCalled();
  });

  it('a setWalletPassword rejection surfaces an error and does NOT advance past setPassword — the wallet is never lost, and Skip still works', async () => {
    ctx.setWalletPassword.mockImplementation(async () => {
      throw new Error('re-encrypt failed');
    });

    await driveToSetPasswordScreen();

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'my-secret-1' } });
    fireEvent.change(screen.getByLabelText(/confirm/i), { target: { value: 'my-secret-1' } });
    fireEvent.click(screen.getByRole('button', { name: /^set password$/i }));

    await waitFor(() => expect(ctx.setWalletPassword).toHaveBeenCalledWith('my-secret-1'));

    // Stays on setPassword with the error surfaced — must NOT silently
    // advance to a plaintext wallet believing it's protected.
    await waitFor(() => expect(screen.getByText(/re-encrypt failed/i)).toBeDefined());
    expect(screen.getByText(/protect your wallet/i)).toBeDefined();
    expect(screen.queryByText(/download wallet backup/i)).toBeNull();
    expect(ctx.finalizeWallet).not.toHaveBeenCalled();
    expect(ctx.importWallet).not.toHaveBeenCalled();

    // The user can still Skip from here — never stuck, never wiped.
    fireEvent.click(screen.getByRole('button', { name: /^skip$/i }));
    await waitFor(() => expect(screen.getByText(/download wallet backup/i)).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
    await waitFor(() => expect(ctx.finalizeWallet).toHaveBeenCalledTimes(1));
  });
});
