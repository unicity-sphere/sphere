/**
 * #449 create-flow reorder: show -> confirm -> password -> download. This is
 * the real backup-VERIFICATION requirement: after the recovery phrase is
 * shown, the user must re-enter it and it must match before the flow can
 * proceed. Covers:
 *  - the full step order (show → confirm → password → download)
 *  - the confirm step REJECTS a wrong phrase (stays put, does not advance)
 *  - the confirm step ACCEPTS the correct phrase (advances to setPassword)
 *  - "Back" from confirm returns to the show screen to re-view the words
 *  - skip-password still finalizes a plaintext wallet after a verified backup
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../../src/config/subscription', async (orig) => ({
  ...(await orig<typeof import('../../../src/config/subscription')>()),
  SUBSCRIPTION_ENABLED: false,
}));

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

const ctx = vi.hoisted(() => ({
  importWallet: vi.fn(async () => ({
    getAllTrackedAddresses: () => [],
    identity: { nametag: null },
  })),
  createWallet: vi.fn(async () => ({
    mnemonic:
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    sphere: { registerNametag: vi.fn(async () => {}), exportToJSON: vi.fn((opts: unknown) => ({ opts })) },
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

async function driveToMnemonicShow() {
  render(<CreateWalletFlow />, { wrapper: Wrapper });
  fireEvent.click(screen.getByRole('button', { name: /create new wallet/i }));
  await waitFor(() => expect(screen.getByRole('button', { name: /skip for now/i })).toBeDefined());
  fireEvent.click(screen.getByRole('button', { name: /skip for now/i }));
  await waitFor(() => expect(ctx.createWallet).toHaveBeenCalledTimes(1));
  await waitFor(
    () => expect(screen.getByText(/back up recovery phrase/i)).toBeDefined(),
    { timeout: 3000 },
  );
}

beforeEach(() => {
  ctx.importWallet.mockClear();
  ctx.createWallet.mockClear();
  ctx.finalizeWallet.mockClear();
  ctx.setWalletPassword.mockClear();
  ctx.setWalletPassword.mockImplementation(async () => {});
});

describe('create flow mnemonic confirmation (#449)', () => {
  it('proves the full order: show -> confirm -> password -> download -> finalize', async () => {
    await driveToMnemonicShow();

    // Show step.
    expect(screen.queryByText(/confirm recovery phrase/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /saved my recovery phrase/i }));

    // Confirm step.
    await waitFor(() => expect(screen.getByText(/confirm recovery phrase/i)).toBeDefined());
    expect(screen.queryByText(/protect your wallet/i)).toBeNull();
    fireEvent.change(screen.getByLabelText(/recovery phrase/i), { target: { value: MNEMONIC } });
    fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    // Password step.
    await waitFor(() => expect(screen.getByText(/protect your wallet/i)).toBeDefined());
    expect(screen.queryByText(/download wallet backup/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^skip$/i }));

    // Download step.
    await waitFor(() => expect(screen.getByText(/download wallet backup/i)).toBeDefined());
    expect(ctx.finalizeWallet).not.toHaveBeenCalled();

    // Finalize.
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
    await waitFor(() => expect(ctx.finalizeWallet).toHaveBeenCalledTimes(1));
  });

  it('rejects a wrong phrase on the confirm step — stays put, does not advance to setPassword', async () => {
    await driveToMnemonicShow();
    fireEvent.click(screen.getByRole('button', { name: /saved my recovery phrase/i }));

    await waitFor(() => expect(screen.getByText(/confirm recovery phrase/i)).toBeDefined());
    fireEvent.change(screen.getByLabelText(/recovery phrase/i), {
      target: { value: 'wrong wrong wrong wrong wrong wrong wrong wrong wrong wrong wrong wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => expect(screen.getByText(/doesn't match/i)).toBeDefined());
    // Still on the confirm screen — never reached setPassword or finalized.
    expect(screen.getByText(/confirm recovery phrase/i)).toBeDefined();
    expect(screen.queryByText(/protect your wallet/i)).toBeNull();
    expect(ctx.finalizeWallet).not.toHaveBeenCalled();
    expect(ctx.setWalletPassword).not.toHaveBeenCalled();
  });

  it('accepts the correct phrase after a prior wrong attempt', async () => {
    await driveToMnemonicShow();
    fireEvent.click(screen.getByRole('button', { name: /saved my recovery phrase/i }));

    await waitFor(() => expect(screen.getByText(/confirm recovery phrase/i)).toBeDefined());
    fireEvent.change(screen.getByLabelText(/recovery phrase/i), { target: { value: 'nope nope nope' } });
    fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }));
    await waitFor(() => expect(screen.getByText(/doesn't match/i)).toBeDefined());

    // Retry with the correct phrase (also exercises whitespace/case tolerance).
    fireEvent.change(screen.getByLabelText(/recovery phrase/i), {
      target: { value: `  ${MNEMONIC.toUpperCase()}  ` },
    });
    fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => expect(screen.getByText(/protect your wallet/i)).toBeDefined());
    expect(screen.queryByText(/doesn't match/i)).toBeNull();
  });

  it('"Back" from the confirm step returns to the show screen to re-view the words', async () => {
    await driveToMnemonicShow();
    fireEvent.click(screen.getByRole('button', { name: /saved my recovery phrase/i }));

    await waitFor(() => expect(screen.getByText(/confirm recovery phrase/i)).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));

    await waitFor(() => expect(screen.getByText(/back up recovery phrase/i)).toBeDefined());
    // The actual words are shown again (the last, unique word of the mnemonic).
    expect(screen.getByText('about')).toBeDefined();
  });

  it('skip-password still finalizes a plaintext wallet after a verified backup', async () => {
    await driveToMnemonicShow();
    fireEvent.click(screen.getByRole('button', { name: /saved my recovery phrase/i }));

    await waitFor(() => expect(screen.getByText(/confirm recovery phrase/i)).toBeDefined());
    fireEvent.change(screen.getByLabelText(/recovery phrase/i), { target: { value: MNEMONIC } });
    fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => expect(screen.getByText(/protect your wallet/i)).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /^skip$/i }));

    await waitFor(() => expect(screen.getByText(/download wallet backup/i)).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    await waitFor(() => expect(ctx.finalizeWallet).toHaveBeenCalledTimes(1));
    expect(ctx.setWalletPassword).not.toHaveBeenCalled();
    expect(ctx.importWallet).not.toHaveBeenCalled();
    expect(ctx.createWallet).toHaveBeenCalledTimes(1);
  });
});
