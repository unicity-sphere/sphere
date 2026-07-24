import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

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
    unlock.fn.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'DECRYPTION_ERROR' }));
    render(<UnlockScreen onRestore={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }));
    await waitFor(() => expect(screen.getByText(/incorrect password/i)).toBeDefined());
  });
  it('offers restore-from-recovery-phrase', () => {
    const onRestore = vi.fn();
    render(<UnlockScreen onRestore={onRestore} />);
    fireEvent.click(screen.getByText(/recovery phrase/i));
    expect(onRestore).toHaveBeenCalled();
  });
});
