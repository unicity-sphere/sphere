/**
 * #413 wiring: both derive-address entry points must open the shared
 * NewAddressModal (and refresh their data when it closes) instead of
 * deriving silently.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddressSelector } from '../../../src/components/wallet/shared/components/AddressSelector';
import { AddressManagerModal } from '../../../src/components/wallet/L3/modals/AddressManagerModal';

const PUBKEY = '02' + 'ab'.repeat(32);

// The shared flow itself is covered by its own tests — stub it here.
vi.mock('../../../src/components/wallet/shared/modals/NewAddressModal', () => ({
  NewAddressModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="new-address-modal">
        <button onClick={onClose}>close-flow</button>
      </div>
    ) : null,
}));

let fakeSphere: Record<string, unknown>;
vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: fakeSphere, isDiscoveringAddresses: false }),
}));

vi.mock('../../../src/sdk', () => ({
  useIdentity: () => ({ nametag: null, chainPubkey: PUBKEY }),
}));

function Wrapper({ children }: { children: ReactNode }) {
  const [qc] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  fakeSphere = {
    identity: { chainPubkey: PUBKEY },
    getCurrentAddressIndex: vi.fn(() => 0),
    getActiveAddresses: vi.fn(() => [{ index: 0, chainPubkey: PUBKEY, hidden: false }]),
    getAllTrackedAddresses: vi.fn(() => [{ index: 0, chainPubkey: PUBKEY, hidden: false }]),
    setAddressHidden: vi.fn(async () => {}),
    on: vi.fn(() => () => {}),
  };
});

describe('AddressSelector — "New" opens the Unicity ID flow', () => {
  it('opens NewAddressModal instead of deriving silently', () => {
    render(<AddressSelector compact />, { wrapper: Wrapper });

    // Open the dropdown (trigger shows the truncated pubkey), then hit "New".
    fireEvent.click(screen.getByText(`${PUBKEY.slice(0, 6)}...${PUBKEY.slice(-4)}`));
    expect(screen.queryByTestId('new-address-modal')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /new/i }));

    expect(screen.getByTestId('new-address-modal')).toBeDefined();
    // No direct derivation from the selector anymore.
    expect(fakeSphere.switchToAddress).toBeUndefined();
  });

  it('delegates to the panel host when onNewAddress is provided', () => {
    const onNewAddress = vi.fn();
    render(<AddressSelector compact onNewAddress={onNewAddress} />, { wrapper: Wrapper });

    fireEvent.click(screen.getByText(`${PUBKEY.slice(0, 6)}...${PUBKEY.slice(-4)}`));
    fireEvent.click(screen.getByRole('button', { name: /new/i }));

    expect(onNewAddress).toHaveBeenCalledTimes(1);
    // The selector must not double-host the flow in this mode.
    expect(screen.queryByTestId('new-address-modal')).toBeNull();
  });
});

describe('AddressManagerModal — "Derive New Address" opens the Unicity ID flow', () => {
  it('opens NewAddressModal and refreshes the list when the flow closes', () => {
    render(<AddressManagerModal isOpen onClose={vi.fn()} />, { wrapper: Wrapper });

    const callsBefore = (fakeSphere.getAllTrackedAddresses as ReturnType<typeof vi.fn>).mock
      .calls.length;

    fireEvent.click(screen.getByRole('button', { name: /derive new address/i }));
    expect(screen.getByTestId('new-address-modal')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'close-flow' }));
    expect(screen.queryByTestId('new-address-modal')).toBeNull();

    const callsAfter = (fakeSphere.getAllTrackedAddresses as ReturnType<typeof vi.fn>).mock
      .calls.length;
    expect(callsAfter).toBeGreaterThan(callsBefore);
  });
});
