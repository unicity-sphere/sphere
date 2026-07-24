/**
 * #449 review-fix regression: SecurityModal's submit/Enter handlers must not
 * launch a second concurrent password operation on a rapid double-submit or
 * Enter-mash. Before the fix, handleSet/handleChange/handleRemove didn't
 * check `busy` at all, so two overlapping reencryptStoredMnemonic calls
 * could race against the SAME mnemonic storage key.
 *
 * The provider (setWalletPassword/changeWalletPassword/removeWalletPassword)
 * is mocked here — this file exercises ONLY the modal's own re-entrancy
 * guard. See SphereProvider.tsx's withPasswordOpLock for the provider-level
 * backstop, and passwordChangeTimeoutPreservation.test.tsx for the other
 * #449 review fix (auto-lock timeout preservation).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const sphereMock = vi.hoisted(() => ({
  hasWalletPassword: true,
  setWalletPassword: vi.fn(),
  changeWalletPassword: vi.fn(),
  removeWalletPassword: vi.fn(),
  setAutoLockTimeout: vi.fn(),
}));

vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({
    hasWalletPassword: sphereMock.hasWalletPassword,
    setWalletPassword: sphereMock.setWalletPassword,
    changeWalletPassword: sphereMock.changeWalletPassword,
    removeWalletPassword: sphereMock.removeWalletPassword,
    autoLockMinutes: 15,
    setAutoLockTimeout: sphereMock.setAutoLockTimeout,
  }),
}));

import { SecurityModal } from '../../../src/components/wallet/L3/modals/SecurityModal';

/** A promise the test controls the resolution of, to hold a submit "in flight". */
function deferred<T = void>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function renderModal() {
  return render(<SecurityModal isOpen onClose={vi.fn()} />);
}

function fillChangePasswordForm() {
  fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));
  fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'old-pw-123' } });
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'new-password-1' } });
  fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'new-password-1' } });
}

beforeEach(() => {
  sphereMock.hasWalletPassword = true;
  sphereMock.setWalletPassword.mockReset();
  sphereMock.changeWalletPassword.mockReset();
  sphereMock.removeWalletPassword.mockReset();
});

describe('SecurityModal — re-entrancy guard (#449 review fix)', () => {
  it('a rapid double-click on Change Password only invokes the provider once', () => {
    const gate = deferred();
    sphereMock.changeWalletPassword.mockReturnValue(gate.promise);

    renderModal();
    fillChangePasswordForm();

    const submit = screen.getByRole('button', { name: 'Change Password' });
    fireEvent.click(submit);
    fireEvent.click(submit); // re-entrant click while the first call is still pending

    expect(sphereMock.changeWalletPassword).toHaveBeenCalledTimes(1);
    gate.resolve();
  });

  it('Enter-mashing the confirm-password field only invokes the provider once', () => {
    const gate = deferred();
    sphereMock.changeWalletPassword.mockReturnValue(gate.promise);

    renderModal();
    fillChangePasswordForm();

    const confirm = screen.getByLabelText('Confirm new password');
    fireEvent.keyDown(confirm, { key: 'Enter' });
    fireEvent.keyDown(confirm, { key: 'Enter' }); // Enter-mash while the first call is still pending

    expect(sphereMock.changeWalletPassword).toHaveBeenCalledTimes(1);
    gate.resolve();
  });

  it('a rapid double-click on Set Password only invokes the provider once', () => {
    sphereMock.hasWalletPassword = false; // Set mode is only offered without an existing password
    const gate = deferred();
    sphereMock.setWalletPassword.mockReturnValue(gate.promise);

    renderModal();
    // The Set-Password MenuButton also has a subtitle, so its accessible
    // name includes that text — match the label text itself instead.
    fireEvent.click(screen.getByText('Set Password'));
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'new-password-1' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'new-password-1' } });

    const submit = screen.getByRole('button', { name: 'Set Password' });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(sphereMock.setWalletPassword).toHaveBeenCalledTimes(1);
    gate.resolve();
  });

  it('a rapid double-submit on Remove Password only invokes the provider once', () => {
    const gate = deferred();
    sphereMock.removeWalletPassword.mockReturnValue(gate.promise);

    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Password' }));
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'old-pw-123' } });

    const submit = screen.getByRole('button', { name: 'Remove Password' });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(sphereMock.removeWalletPassword).toHaveBeenCalledTimes(1);
    gate.resolve();
  });

  it('Enter-mashing the current-password field in Remove mode only invokes the provider once', () => {
    const gate = deferred();
    sphereMock.removeWalletPassword.mockReturnValue(gate.promise);

    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Password' }));
    const current = screen.getByLabelText('Current password');
    fireEvent.change(current, { target: { value: 'old-pw-123' } });

    fireEvent.keyDown(current, { key: 'Enter' });
    fireEvent.keyDown(current, { key: 'Enter' });

    expect(sphereMock.removeWalletPassword).toHaveBeenCalledTimes(1);
    gate.resolve();
  });
});
