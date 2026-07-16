import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { NetworkType } from '@unicitylabs/sphere-sdk';

// Mutable holder so individual tests can change the active network; the
// getter makes the mocked module binding read it lazily (jsdom cannot
// re-import per test without resetModules, which would break vi.mock).
const netState = vi.hoisted(() => ({
  active: 'testnet2' as NetworkType,
  setActiveNetwork: vi.fn(),
}));

vi.mock('../../../src/config/network', () => ({
  get SPHERE_NETWORK() {
    return netState.active;
  },
  SUPPORTED_NETWORKS: [
    { id: 'testnet2', label: 'Testnet2', available: true },
    { id: 'mainnet', label: 'Mainnet', available: false },
  ],
  setActiveNetwork: netState.setActiveNetwork,
}));

import { NetworkModal } from '../../../src/components/wallet/L3/modals/NetworkModal';

beforeEach(() => {
  netState.active = 'testnet2';
  netState.setActiveNetwork.mockReset();
});

function renderModal() {
  return render(<NetworkModal isOpen onClose={vi.fn()} />);
}

describe('NetworkModal', () => {
  it('renders the supported networks with the current one marked', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /Testnet2/ })).toBeDefined();
    expect(screen.getByText('Current')).toBeDefined();
  });

  it('shows mainnet disabled with a Coming soon badge', () => {
    renderModal();
    const mainnet = screen.getByRole('button', { name: /Mainnet/ }) as HTMLButtonElement;
    expect(mainnet.disabled).toBe(true);
    expect(screen.getByText('Coming soon')).toBeDefined();

    fireEvent.click(mainnet);
    expect(screen.queryByText(/separate per network/i)).toBeNull();
  });

  it('appends the active dev network as an extra current row', () => {
    netState.active = 'dev';
    renderModal();
    // Label comes from the real SDK NETWORKS table: dev = 'Development'
    const devRow = screen.getByRole('button', { name: /Development/ }) as HTMLButtonElement;
    expect(devRow.disabled).toBe(true); // current row is not re-selectable
    expect(screen.getByText('Current')).toBeDefined();
  });

  it('confirms before switching and calls setActiveNetwork', () => {
    netState.active = 'dev'; // makes Testnet2 an available, non-current target
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Testnet2/ }));
    expect(
      screen.getByText(
        'Balances, history and subscription keys are separate per network. The app will reload.',
      ),
    ).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Switch & Reload' }));
    expect(netState.setActiveNetwork).toHaveBeenCalledWith('testnet2');
  });

  it('cancel dismisses the confirmation without switching', () => {
    netState.active = 'dev';
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Testnet2/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText(/separate per network/i)).toBeNull();
    expect(netState.setActiveNetwork).not.toHaveBeenCalled();
  });
});
