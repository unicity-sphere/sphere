/**
 * Graceful lock §8.3: the unlock surface must not steal keyboard focus unless
 * its caller KNOWS it is on screen, must name the transport-verified origin when
 * one is supplied, and must not offer the destructive restore path when the
 * caller does not pass one.
 *
 * The panel shell is `w-0 overflow-hidden` (desktop, closed) / `translate-x-full`
 * (mobile) — neither is display:none, so React mounts UnlockScreen and its
 * unconditional autoFocus pulled the caret out of a cross-origin iframe while the
 * attacker owned every visible pixel.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ unlock: vi.fn(async () => {}), isLocked: true }),
}));

import { UnlockScreen } from '../../../src/components/wallet/onboarding/components/UnlockScreen';

describe('UnlockScreen surface', () => {
  it('does NOT take focus by default', () => {
    render(<UnlockScreen onRestore={vi.fn()} />);
    expect(document.activeElement).not.toBe(screen.getByLabelText(/password/i));
  });

  it('takes focus only when the caller says the surface is visible', () => {
    render(<UnlockScreen onRestore={vi.fn()} autoFocus />);
    expect(document.activeElement).toBe(screen.getByLabelText(/password/i));
  });

  it('shows no origin block for the cold-start gate', () => {
    render(<UnlockScreen onRestore={vi.fn()} />);
    expect(screen.queryByTestId('unlock-origin')).toBeNull();
  });

  it('names the verified origin and warns that it is unverifiable when one is supplied', () => {
    render(<UnlockScreen origin="https://evil.attacker.example" />);
    expect(screen.getByTestId('unlock-origin').textContent).toContain('https://evil.attacker.example');
    expect(screen.getByTestId('unlock-origin-warning')).toBeDefined();
  });

  it('offers NO restore path when the caller passes no onRestore', () => {
    render(<UnlockScreen origin="https://dapp.example" />);
    expect(screen.queryByText(/recovery phrase/i)).toBeNull();
  });
});
