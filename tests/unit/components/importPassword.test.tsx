/**
 * #449 Task C: offer a password when IMPORTING a wallet (restore-from-
 * recovery-phrase OR wallet file), applied via the SAFE in-place
 * `setWalletPassword` (never `Sphere.import`/`Sphere.clear`). Covers:
 *
 *  (a) restore-from-mnemonic: the wallet imports PLAINTEXT immediately (no
 *      password threaded into `importWallet`), and only AFTER address
 *      selection + nametag does the SAME optional SetPasswordScreen the
 *      create flow uses appear. Setting a password calls `setWalletPassword`
 *      (never a second `importWallet` call); Skip finalizes plaintext.
 *  (b) an ENCRYPTED file import auto-applies the file's own decrypt
 *      password as the wallet's at-rest password via `setWalletPassword`,
 *      and skips the optional SetPasswordScreen entirely (already
 *      protected).
 *  (c) a `setWalletPassword` rejection (on the optional, non-auto step)
 *      surfaces an error and does NOT lose the wallet — Skip still works.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Keep this deterministic and network-free: doFinalizeWallet only
// short-circuits straight to finishFinalize() when subscriptions are off.
vi.mock('../../../src/config/subscription', async (orig) => ({
  ...(await orig<typeof import('../../../src/config/subscription')>()),
  SUBSCRIPTION_ENABLED: false,
}));

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

function fillSeedWords(phrase: string) {
  const inputs = screen.getAllByPlaceholderText('word');
  phrase.split(' ').forEach((w, i) => fireEvent.change(inputs[i], { target: { value: w } }));
}

/** Drives the restore-from-mnemonic flow (plaintext import mocked to return
 *  zero tracked addresses / no nametag) through nametag-skip up to the
 *  optional SetPasswordScreen. */
async function driveRestoreToSetPassword() {
  render(<CreateWalletFlow initialStep="restore" />, { wrapper: Wrapper });

  fillSeedWords(VALID_MNEMONIC);
  fireEvent.click(screen.getByRole('button', { name: /^restore$/i }));

  // Imported PLAINTEXT immediately — no password option threaded in.
  await waitFor(() => expect(ctx.importWallet).toHaveBeenCalledWith(VALID_MNEMONIC));
  expect(ctx.importWallet.mock.calls[0]).toHaveLength(1);

  // No addresses / no nametag on the mocked instance → nametag screen next.
  await waitFor(() => expect(screen.getByText(/choose unicity id/i)).toBeDefined());
  fireEvent.click(screen.getByRole('button', { name: /skip for now/i }));

  await waitFor(
    () => expect(screen.getByText(/protect your wallet/i)).toBeDefined(),
  );
}

beforeEach(() => {
  ctx.importWallet.mockClear();
  ctx.importWallet.mockImplementation(async () => ({
    getAllTrackedAddresses: () => [],
    identity: { nametag: null },
  }));
  ctx.createWallet.mockClear();
  ctx.finalizeWallet.mockClear();
  ctx.resolveNametag.mockClear();
  ctx.importFromFile.mockClear();
  ctx.setWalletPassword.mockClear();
  ctx.setWalletPassword.mockImplementation(async () => {});
});

describe('restore-from-mnemonic offers the optional password AFTER import (#449 Task C)', () => {
  it('imports plaintext immediately, reaches SetPasswordScreen after nametag, and Set calls setWalletPassword (never a second importWallet)', async () => {
    await driveRestoreToSetPassword();

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'my-secret-1' } });
    fireEvent.change(screen.getByLabelText(/confirm/i), { target: { value: 'my-secret-1' } });
    fireEvent.click(screen.getByRole('button', { name: /^set password$/i }));

    await waitFor(() => expect(ctx.setWalletPassword).toHaveBeenCalledWith('my-secret-1'));

    // Import flow has no backup-download screen — finalizes directly.
    await waitFor(() => expect(ctx.finalizeWallet).toHaveBeenCalledTimes(1));

    // The critical assertion: importWallet was called exactly ONCE, with NO
    // password/options argument — the password is applied via the in-place
    // re-encrypt, never a second Sphere.import()-backed call.
    expect(ctx.importWallet).toHaveBeenCalledTimes(1);
    expect(ctx.importWallet).toHaveBeenCalledWith(VALID_MNEMONIC);
  });

  it('Skip finalizes a plaintext wallet without ever calling setWalletPassword', async () => {
    await driveRestoreToSetPassword();

    fireEvent.click(screen.getByRole('button', { name: /^skip$/i }));

    await waitFor(() => expect(ctx.finalizeWallet).toHaveBeenCalledTimes(1));
    expect(ctx.setWalletPassword).not.toHaveBeenCalled();
    expect(ctx.importWallet).toHaveBeenCalledTimes(1);
  });

  it('a setWalletPassword rejection surfaces an error, does NOT lose the wallet, and Skip still finalizes it', async () => {
    ctx.setWalletPassword.mockImplementation(async () => {
      throw new Error('re-encrypt failed');
    });

    await driveRestoreToSetPassword();

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'my-secret-1' } });
    fireEvent.change(screen.getByLabelText(/confirm/i), { target: { value: 'my-secret-1' } });
    fireEvent.click(screen.getByRole('button', { name: /^set password$/i }));

    await waitFor(() => expect(ctx.setWalletPassword).toHaveBeenCalledWith('my-secret-1'));

    // Stays on setPassword with the error surfaced — never silently
    // finalizes a wallet the user believes is protected while it's plaintext.
    await waitFor(() => expect(screen.getByText(/re-encrypt failed/i)).toBeDefined());
    expect(screen.getByText(/protect your wallet/i)).toBeDefined();
    expect(ctx.finalizeWallet).not.toHaveBeenCalled();
    expect(ctx.importWallet).toHaveBeenCalledTimes(1);

    // The wallet is never lost/stuck — Skip still finalizes it (plaintext).
    fireEvent.click(screen.getByRole('button', { name: /^skip$/i }));
    await waitFor(() => expect(ctx.finalizeWallet).toHaveBeenCalledTimes(1));
  });
});

describe('encrypted file import auto-applies its decrypt password (#449 Task C)', () => {
  function makeEncryptedJsonFile() {
    const content = JSON.stringify({ type: 'sphere-wallet', version: '1.0', encrypted: { mnemonic: 'x' } });
    const file = new File([content], 'wallet.json', { type: 'application/json' });
    // jsdom's File/Blob doesn't implement `.text()` in this environment —
    // handleFileSelect awaits it for any non-.dat file. Stub it directly.
    (file as unknown as { text: () => Promise<string> }).text = async () => content;
    return file;
  }

  async function selectAndImportEncryptedFile() {
    const { container } = render(<CreateWalletFlow initialStep="importFile" />, { wrapper: Wrapper });

    const file = makeEncryptedJsonFile();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    // Encrypted detection happens after the async file read. Wait budget is
    // global (tests/setup.ts) — this file flaked at 1079ms and again at
    // 3069ms on loaded CI runners while passing locally every time.
    await waitFor(() => expect(screen.getByRole('button', { name: /^import$/i })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /^import$/i }));

    // Encrypted → password prompt (no importFromFile call yet).
    await waitFor(() => expect(screen.getByText(/enter password/i)).toBeDefined());
    expect(ctx.importFromFile).not.toHaveBeenCalled();
  }

  it('applies the SAME password used to decrypt as the new at-rest password, and skips the optional SetPasswordScreen entirely', async () => {
    ctx.importFromFile.mockResolvedValue({
      success: true,
      sphere: { getAllTrackedAddresses: () => [], identity: { nametag: null } },
    });

    await selectAndImportEncryptedFile();

    fireEvent.change(screen.getByPlaceholderText(/wallet password/i), { target: { value: 'file-pw-123' } });
    fireEvent.click(screen.getByRole('button', { name: /^unlock$/i }));

    await waitFor(() =>
      expect(ctx.importFromFile).toHaveBeenCalledWith(
        expect.objectContaining({ fileName: 'wallet.json', password: 'file-pw-123' }),
      ),
    );

    // Auto-applied via the SAME password used to decrypt the file.
    await waitFor(() => expect(ctx.setWalletPassword).toHaveBeenCalledWith('file-pw-123'));

    // No addresses / no nametag → nametag screen next.
    await waitFor(() => expect(screen.getByText(/choose unicity id/i)).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /skip for now/i }));

    // Already protected — the optional SetPasswordScreen never shows, and
    // the flow finalizes directly.
    await waitFor(() => expect(ctx.finalizeWallet).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/protect your wallet/i)).toBeNull();
  });

  it('gracefully skips the auto-apply (no scary error) when the import has no mnemonic to protect, and still offers the optional SetPasswordScreen', async () => {
    ctx.importFromFile.mockResolvedValue({
      success: true,
      // Master-key-only legacy import — no mnemonic recovered.
      sphere: { getAllTrackedAddresses: () => [], identity: { nametag: null } },
    });
    ctx.setWalletPassword.mockImplementation(async () => {
      throw new Error('No wallet mnemonic found in storage — nothing to protect');
    });

    await selectAndImportEncryptedFile();

    fireEvent.change(screen.getByPlaceholderText(/wallet password/i), { target: { value: 'file-pw-123' } });
    fireEvent.click(screen.getByRole('button', { name: /^unlock$/i }));

    await waitFor(() => expect(ctx.setWalletPassword).toHaveBeenCalledWith('file-pw-123'));

    // No scary error surfaced for the automatic attempt — the password
    // prompt / decrypt flow just proceeds normally to the nametag screen.
    await waitFor(() => expect(screen.getByText(/choose unicity id/i)).toBeDefined());
    expect(screen.queryByText(/no wallet mnemonic found/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /skip for now/i }));

    // Not auto-applied (it threw) — the optional SetPasswordScreen IS shown.
    await waitFor(
      () => expect(screen.getByText(/protect your wallet/i)).toBeDefined(),
    );
    expect(ctx.finalizeWallet).not.toHaveBeenCalled();
  });
});
