/**
 * #449 CRITICAL no-wallet-loss regression: the UnlockScreen's "forgot
 * password → restore from recovery phrase" lock-escape must never destroy a
 * REAL, still-recoverable (locked) wallet before a valid replacement is
 * confirmed. This covers the two destructive paths that were fixed:
 *
 *  1. An invalid/typo'd mnemonic must be rejected in-app (Sphere.validateMnemonic)
 *     BEFORE `importWallet` — which wraps the SDK's `Sphere.import()`, which
 *     clears existing storage BEFORE it validates the mnemonic internally —
 *     is ever called. A wrong phrase must never touch storage.
 *  2. The lock-escape's "Back" action must exit back to the UnlockScreen
 *     (via `onExitToUnlock`), never fall through to the generic StartScreen,
 *     whose "Create New Wallet" button would call `createWallet()` against
 *     storage that still holds the locked wallet.
 *
 * Also covers the erase-confirmation gate (both restore options are disabled
 * until the user explicitly acknowledges the wallet on this device will be
 * replaced).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const ctx = vi.hoisted(() => ({
  importWallet: vi.fn(async () => ({
    getAllTrackedAddresses: () => [],
    identity: { nametag: null },
  })),
  createWallet: vi.fn(async () => ({ mnemonic: 'never called', sphere: {} })),
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

// Well-known, checksum-valid BIP39 test vector ("abandon..." x11 + "about"),
// used across the industry (e.g. Ethereum test suites) as a canonical valid
// 12-word mnemonic.
const VALID_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
// Not BIP39 wordlist words at all — guaranteed to fail the checksum.
const INVALID_MNEMONIC =
  'wrong wrong wrong wrong wrong wrong wrong wrong wrong wrong wrong wrong';

function fillSeedWords(phrase: string) {
  const inputs = screen.getAllByPlaceholderText('word');
  phrase.split(' ').forEach((w, i) => fireEvent.change(inputs[i], { target: { value: w } }));
}

function Wrapper({ children }: { children: ReactNode }) {
  const [qc] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function renderFlow(props: Parameters<typeof CreateWalletFlow>[0]) {
  return render(<CreateWalletFlow {...props} />, { wrapper: Wrapper });
}

describe('restore-from-lock guard (#449)', () => {
  it('blocks an invalid mnemonic BEFORE importWallet/Sphere.import ever runs — nothing is wiped', async () => {
    renderFlow({ initialStep: 'restore', fromLock: true, onExitToUnlock: vi.fn() });

    fillSeedWords(INVALID_MNEMONIC);
    fireEvent.click(screen.getByRole('button', { name: /^restore$/i }));

    await waitFor(() => expect(screen.getByText(/invalid recovery phrase/i)).toBeDefined());

    // The destructive path — importWallet (which wraps Sphere.import, which
    // clears storage BEFORE validating the mnemonic) — must never run, and
    // createWallet (the other destructive entry point) must never run either.
    expect(ctx.importWallet).not.toHaveBeenCalled();
    expect(ctx.createWallet).not.toHaveBeenCalled();
  });

  it('proceeds to import once a valid mnemonic is entered', async () => {
    renderFlow({ initialStep: 'restore', fromLock: true, onExitToUnlock: vi.fn() });

    fillSeedWords(VALID_MNEMONIC);
    fireEvent.click(screen.getByRole('button', { name: /^restore$/i }));

    await waitFor(() => expect(ctx.importWallet).toHaveBeenCalledWith(VALID_MNEMONIC));
    expect(screen.queryByText(/invalid recovery phrase/i)).toBeNull();
  });

  it('gates both restore options behind an explicit erase-confirmation when entered from the lock screen', () => {
    renderFlow({ initialStep: 'restoreMethod', fromLock: true, onExitToUnlock: vi.fn() });

    const mnemonicOption = screen.getByRole('button', { name: /recovery phrase/i }) as HTMLButtonElement;
    const fileOption = screen.getByRole('button', { name: /import from file/i }) as HTMLButtonElement;
    expect(mnemonicOption.disabled).toBe(true);
    expect(fileOption.disabled).toBe(true);

    fireEvent.click(screen.getByRole('checkbox'));

    expect(mnemonicOption.disabled).toBe(false);
    expect(fileOption.disabled).toBe(false);
  });

  it('does NOT gate restore options behind the erase-confirmation in normal (non-locked) onboarding', () => {
    renderFlow({ initialStep: 'restoreMethod' });

    const mnemonicOption = screen.getByRole('button', { name: /recovery phrase/i }) as HTMLButtonElement;
    expect(mnemonicOption.disabled).toBe(false);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('exits to the UnlockScreen (not the generic StartScreen) when backing out of the lock-escape', () => {
    const onExitToUnlock = vi.fn();
    renderFlow({ initialStep: 'restoreMethod', fromLock: true, onExitToUnlock });

    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));

    expect(onExitToUnlock).toHaveBeenCalledTimes(1);
    // "Create New Wallet" (StartScreen) must never render for this exit —
    // it would call createWallet() against storage still holding the locked
    // wallet.
    expect(screen.queryByText(/create new wallet/i)).toBeNull();
    expect(ctx.createWallet).not.toHaveBeenCalled();
  });
});
