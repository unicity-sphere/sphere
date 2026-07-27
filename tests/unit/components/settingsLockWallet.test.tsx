/**
 * #449: A manual "Lock Wallet" action in Settings. It calls the context's
 * lock() and closes Settings. CRITICAL no-wallet-loss invariant: the button
 * is shown ONLY when the wallet has an at-rest password
 * (hasWalletPassword === true). Locking a password-less wallet would leave it
 * requiring an unlock password that doesn't exist — the user could only
 * recover from seed. So a password-less wallet must never see this button.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const sphereMock = vi.hoisted(() => ({
  hasWalletPassword: true,
  lock: vi.fn(async () => {}),
}));

vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({
    hasWalletPassword: sphereMock.hasWalletPassword,
    lock: sphereMock.lock,
  }),
}));

// Isolate SettingsModal from the heavy child screens and their own hooks.
vi.mock('../../../src/components/upgrade', () => ({ useUpgrade: () => ({ openUpgrade: vi.fn() }) }));
vi.mock('../../../src/sdk/hooks/subscription', () => ({ useUtilization: () => ({ data: undefined }) }));
vi.mock('../../../src/components/wallet/L3/modals/LookupModal', () => ({ LookupModal: () => null }));
vi.mock('../../../src/components/wallet/L3/modals/AddressManagerModal', () => ({ AddressManagerModal: () => null }));
vi.mock('../../../src/components/wallet/L3/modals/ConnectedSitesModal', () => ({ ConnectedSitesModal: () => null }));
vi.mock('../../../src/components/wallet/L3/modals/SubscriptionModal', () => ({ SubscriptionModal: () => null }));
vi.mock('../../../src/components/wallet/L3/modals/SecurityModal', () => ({ SecurityModal: () => null }));

import { SettingsModal } from '../../../src/components/wallet/L3/modals/SettingsModal';

function renderSettings(overrides: { onClose?: () => void } = {}) {
  return render(
    <SettingsModal
      isOpen
      onClose={overrides.onClose ?? vi.fn()}
      onBackupWallet={vi.fn()}
      onLogout={vi.fn()}
    />,
  );
}

beforeEach(() => {
  sphereMock.hasWalletPassword = true;
  sphereMock.lock.mockReset();
  sphereMock.lock.mockResolvedValue(undefined);
});

describe('SettingsModal — manual Lock Wallet (#449)', () => {
  it('shows "Lock Wallet" and calls lock() + onClose when a password is set', () => {
    const onClose = vi.fn();
    renderSettings({ onClose });

    const lockBtn = screen.getByRole('button', { name: /lock wallet/i });
    fireEvent.click(lockBtn);

    expect(sphereMock.lock).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('hides "Lock Wallet" when the wallet has no password (would strand the user)', () => {
    sphereMock.hasWalletPassword = false;
    renderSettings();

    expect(screen.queryByRole('button', { name: /lock wallet/i })).toBeNull();
    expect(sphereMock.lock).not.toHaveBeenCalled();
  });
});
