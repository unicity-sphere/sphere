/**
 * A locked wallet must not let its own apps impersonate a fresh account.
 *
 * DM and Group Chat need the Sphere instance, which a lock destroys. Rendered anyway they show
 * their EMPTY states — "No conversations yet", "No groups yet", "User not found", a forever
 * "Connecting..." spinner — which reads as "you have no data", not "the wallet is locked".
 *
 * It matters most on mobile: the wallet panel is off-canvas by default there and switching apps
 * force-closes it, so the UnlockScreen — the app's only lock signal — is not on screen at all.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const state = vi.hoisted(() => ({
  walletExists: true,
  isLoading: false,
  isLocked: false,
}));

vi.mock('../../../src/sdk', () => ({
  useWalletStatus: () => ({ walletExists: state.walletExists, isLoading: state.isLoading }),
}));

vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ isLocked: state.isLocked }),
}));

vi.mock('../../../src/config/activities', () => ({
  agentRequiresWallet: () => true,
}));

import { WalletRequiredBlocker } from '../../../src/components/agents/WalletRequiredBlocker';

function renderBlocker(onOpenWallet?: () => void) {
  return render(
    <WalletRequiredBlocker agentId="dm" onOpenWallet={onOpenWallet}>
      <div data-testid="chat">No conversations yet</div>
    </WalletRequiredBlocker>,
  );
}

beforeEach(() => {
  state.walletExists = true;
  state.isLoading = false;
  state.isLocked = false;
});

describe('chat surfaces while the wallet is locked', () => {
  it('renders the app normally when the wallet is live', () => {
    renderBlocker();
    expect(screen.getByTestId('chat')).toBeTruthy();
    expect(screen.queryByTestId('chat-locked-notice')).toBeNull();
  });

  it('replaces the app with a LOCKED notice, so its empty state cannot pose as no data', () => {
    state.isLocked = true;
    renderBlocker();

    expect(screen.queryByTestId('chat')).toBeNull();
    expect(screen.getByTestId('chat-locked-notice')).toBeTruthy();
    expect(screen.getByText(/Wallet Locked/)).toBeTruthy();
    // The user must be told their data still exists.
    expect(screen.getByText(/nothing has been lost/i)).toBeTruthy();
  });

  it('offers an unlock affordance, because on mobile there is no other lock signal on screen', () => {
    state.isLocked = true;
    const onOpenWallet = vi.fn();
    renderBlocker(onOpenWallet);

    fireEvent.click(screen.getByText('Unlock Wallet'));
    expect(onOpenWallet).toHaveBeenCalledTimes(1);
  });

  it('distinguishes LOCKED from NO WALLET — they are different states with different actions', () => {
    state.isLocked = false;
    state.walletExists = false;
    renderBlocker(() => {});

    expect(screen.getByTestId('chat-wallet-required')).toBeTruthy();
    expect(screen.getByText('Set Up Wallet')).toBeTruthy();
    expect(screen.queryByTestId('chat-locked-notice')).toBeNull();
  });

  it('prefers LOCKED over NO WALLET when both look true mid-transition', () => {
    // initialize() reports walletExists false while a locked wallet is still settling; showing
    // "Set Up Wallet" there invites the user toward creating a second wallet.
    state.isLocked = true;
    state.walletExists = false;
    renderBlocker(() => {});

    expect(screen.getByTestId('chat-locked-notice')).toBeTruthy();
    expect(screen.queryByTestId('chat-wallet-required')).toBeNull();
  });

  it('shows the app while still loading, rather than flashing either notice', () => {
    state.isLoading = true;
    state.isLocked = true;
    renderBlocker();
    expect(screen.getByTestId('chat')).toBeTruthy();
  });
});
