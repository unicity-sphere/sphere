import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SphereError } from '@unicitylabs/sphere-sdk';

const unlock = vi.hoisted(() => ({ fn: vi.fn(async () => {}) }));
vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ unlock: unlock.fn, isLocked: true }),
}));
import { UnlockScreen } from '../../../src/components/wallet/onboarding/components/UnlockScreen';

describe('UnlockScreen', () => {
  it('calls unlock with the entered password', async () => {
    render(<UnlockScreen onRestore={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pw' } });
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }));
    await waitFor(() => expect(unlock.fn).toHaveBeenCalledWith('pw'));
  });
  it('shows an error on a wrong password', async () => {
    // The REAL SDK signal (@unicitylabs/sphere-sdk@0.12.0, code-verified) for
    // a wrong password on unlock(): SphereError('Failed to decrypt mnemonic',
    // 'STORAGE_ERROR') — see src/sdk/walletLock/isDecryptionError.ts.
    unlock.fn.mockRejectedValueOnce(new SphereError('Failed to decrypt mnemonic', 'STORAGE_ERROR'));
    render(<UnlockScreen onRestore={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }));
    await waitFor(() => expect(screen.getByText(/incorrect password/i)).toBeDefined());
  });
  it('shows a generic error (not "incorrect password") on a real storage failure', async () => {
    unlock.fn.mockRejectedValueOnce(new SphereError('IndexedDB transaction failed', 'STORAGE_ERROR'));
    render(<UnlockScreen onRestore={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'whatever' } });
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }));
    await waitFor(() => expect(screen.getByText(/could not unlock/i)).toBeDefined());
  });
  it('offers restore-from-recovery-phrase when the caller supplies onRestore', () => {
    const onRestore = vi.fn();
    render(<UnlockScreen onRestore={onRestore} />);
    fireEvent.click(screen.getByText(/recovery phrase/i));
    expect(onRestore).toHaveBeenCalled();
  });
});
