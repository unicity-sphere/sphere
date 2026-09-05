import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { NetworkType } from '@unicitylabs/sphere-sdk';

// Mutable holder so individual tests can change the active network; the
// getter makes the mocked module binding read it lazily (jsdom cannot
// re-import per test without resetModules, which would break vi.mock).
const netState = vi.hoisted(() => ({
  active: 'testnet2' as NetworkType,
  downgradedFrom: null as string | null,
  mainnetReason: 'not-onboarded' as string,
  setActiveNetwork: vi.fn(),
}));

vi.mock('../../../src/config/network', () => ({
  get SPHERE_NETWORK() {
    return netState.active;
  },
  get NETWORK_DOWNGRADED_FROM() {
    return netState.downgradedFrom;
  },
  get SUPPORTED_NETWORKS() {
    return [
      { id: 'testnet2', label: 'Testnet', available: true },
      { id: 'mainnet', label: 'Mainnet', available: false, unavailableReason: netState.mainnetReason },
    ];
  },
  setActiveNetwork: netState.setActiveNetwork,
}));

import { NetworkModal } from '../../../src/components/wallet/L3/modals/NetworkModal';

beforeEach(() => {
  netState.active = 'testnet2';
  netState.downgradedFrom = null;
  netState.mainnetReason = 'not-onboarded';
  netState.setActiveNetwork.mockReset();
});

function renderModal() {
  return render(<NetworkModal isOpen onClose={vi.fn()} />);
}

describe('NetworkModal', () => {
  it('renders the supported networks with the current one marked', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /Testnet/ })).toBeDefined();
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

  // DELETED with the sphere-sdk 0.16.0-dev.1 bump: 'appends the active dev
  // network as an extra current row'. It drove buildNetworkRows' append branch
  // through netState.active = 'dev', and 'dev' is no longer a NetworkType — nor
  // can any NetworkType outside SUPPORTED_NETWORKS become the active network
  // (see the note in networkRows.test.ts). The screen has no state left in
  // which it renders an unlisted current row.

  it('confirms before switching and calls setActiveNetwork', () => {
    netState.active = 'mainnet'; // makes Testnet an available, non-current target
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Testnet/ }));
    expect(
      screen.getByText(
        'Balances, history and subscription keys are separate per network. The app will reload.',
      ),
    ).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Switch & Reload' }));
    expect(netState.setActiveNetwork).toHaveBeenCalledWith('testnet2');
  });

  it('cancel dismisses the confirmation without switching', () => {
    netState.active = 'mainnet';
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Testnet/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText(/separate per network/i)).toBeNull();
    expect(netState.setActiveNetwork).not.toHaveBeenCalled();
  });

  it('says the deployment cannot reach a network rather than "Coming soon"', () => {
    netState.mainnetReason = 'not-served-here';
    renderModal();
    expect(screen.getByText('Not available here')).toBeDefined();
    expect(screen.queryByText('Coming soon')).toBeNull();
  });

  it('shows no downgrade notice when the persisted choice was honoured', () => {
    renderModal();
    expect(screen.queryByText(/is not available here, so the wallet is on/)).toBeNull();
  });

  it('explains a fallback, and that the assets on the other network are untouched', () => {
    // Without this the user lands on another network, sees an empty wallet and
    // concludes their funds are gone.
    netState.downgradedFrom = 'mainnet';
    renderModal();
    expect(screen.getByText(/mainnet is not available here, so the wallet is on Testnet/)).toBeDefined();
    expect(screen.getByText(/assets on mainnet are\s+untouched/)).toBeDefined();
  });
});
