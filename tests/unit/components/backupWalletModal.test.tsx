/**
 * #449: BackupWalletModal must gate "Export Wallet File" / "Show Recovery
 * Phrase" (both expose the seed) behind a password prompt whenever the
 * wallet has an at-rest password (hasWalletPassword === true). Wallets with
 * no password must see the two options immediately, unchanged.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const sphereMock = vi.hoisted(() => ({
  hasWalletPassword: true,
  verifyWalletPassword: vi.fn(),
}));

vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({
    hasWalletPassword: sphereMock.hasWalletPassword,
    verifyWalletPassword: sphereMock.verifyWalletPassword,
  }),
}));

import { BackupWalletModal } from '../../../src/components/wallet/shared/modals/BackupWalletModal';

function renderModal() {
  return render(
    <BackupWalletModal
      isOpen
      onClose={vi.fn()}
      onExportWalletFile={vi.fn()}
      onShowRecoveryPhrase={vi.fn()}
    />,
  );
}

beforeEach(() => {
  sphereMock.hasWalletPassword = true;
  sphereMock.verifyWalletPassword.mockReset();
});

describe('BackupWalletModal — password gate (#449)', () => {
  it('shows a password prompt (not the backup options) when the wallet has a password', () => {
    renderModal();

    expect(screen.getByLabelText('Password')).toBeDefined();
    expect(screen.queryByText('Export Wallet File')).toBeNull();
    expect(screen.queryByText('Show Recovery Phrase')).toBeNull();
  });

  it('shows "Incorrect password" and stays gated on a wrong password', async () => {
    sphereMock.verifyWalletPassword.mockResolvedValue(false);
    renderModal();

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => expect(screen.getByText(/incorrect password/i)).toBeDefined());
    expect(sphereMock.verifyWalletPassword).toHaveBeenCalledWith('wrong');
    expect(screen.queryByText('Export Wallet File')).toBeNull();
    expect(screen.queryByText('Show Recovery Phrase')).toBeNull();
  });

  it('reveals the two backup options after a correct password', async () => {
    sphereMock.verifyWalletPassword.mockResolvedValue(true);
    renderModal();

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => expect(screen.getByText('Export Wallet File')).toBeDefined());
    expect(screen.getByText('Show Recovery Phrase')).toBeDefined();
    expect(screen.queryByLabelText('Password')).toBeNull();
  });

  it('shows the two backup options immediately with no prompt when there is no wallet password', () => {
    sphereMock.hasWalletPassword = false;
    renderModal();

    expect(screen.getByText('Export Wallet File')).toBeDefined();
    expect(screen.getByText('Show Recovery Phrase')).toBeDefined();
    expect(screen.queryByLabelText('Password')).toBeNull();
  });
});
