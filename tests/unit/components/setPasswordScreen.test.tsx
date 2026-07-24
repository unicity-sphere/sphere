import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SetPasswordScreen } from '../../../src/components/wallet/onboarding/components/SetPasswordScreen';

describe('SetPasswordScreen', () => {
  it('calls onSet when password matches and is long enough', () => {
    const onSet = vi.fn();
    render(<SetPasswordScreen onSet={onSet} onSkip={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } });
    fireEvent.change(screen.getByLabelText(/confirm/i), { target: { value: 'password1' } });
    fireEvent.click(screen.getByRole('button', { name: /set password/i }));
    expect(onSet).toHaveBeenCalledWith('password1');
  });
  it('blocks mismatched passwords', () => {
    const onSet = vi.fn();
    render(<SetPasswordScreen onSet={onSet} onSkip={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } });
    fireEvent.change(screen.getByLabelText(/confirm/i), { target: { value: 'password2' } });
    fireEvent.click(screen.getByRole('button', { name: /set password/i }));
    expect(onSet).not.toHaveBeenCalled();
    expect(screen.getByText(/don't match/i)).toBeDefined();
  });
  it('blocks passwords shorter than 8 characters', () => {
    const onSet = vi.fn();
    render(<SetPasswordScreen onSet={onSet} onSkip={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short1' } });
    fireEvent.change(screen.getByLabelText(/confirm/i), { target: { value: 'short1' } });
    fireEvent.click(screen.getByRole('button', { name: /set password/i }));
    expect(onSet).not.toHaveBeenCalled();
    expect(screen.getByText(/at least 8/i)).toBeDefined();
  });
  it('skips', () => {
    const onSkip = vi.fn();
    render(<SetPasswordScreen onSet={vi.fn()} onSkip={onSkip} />);
    fireEvent.click(screen.getByRole('button', { name: /skip/i }));
    expect(onSkip).toHaveBeenCalled();
  });
});
