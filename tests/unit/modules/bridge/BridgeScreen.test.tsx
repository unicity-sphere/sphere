/**
 * The picker shows every step even with one option, so what the wallet
 * supports is visible: network, then asset, then the form. Rendered against
 * the real Tron USDT asset (no wallet, no network calls).
 */
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ network: 'testnet2', sphere: null }),
}));
// The screen lists the wallet's tokens for the assets-out form; none here.
vi.mock('../../../../src/sdk', () => ({ useTokens: () => ({ tokens: [] }) }));
// The live Nile deployment is disabled; the walkthrough needs an asset that can be picked.
vi.mock('@unicitylabs/bridge-plugin-tron-usdt/wallet', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@unicitylabs/bridge-plugin-tron-usdt/wallet')>();
  return { ...mod, NILE_USDT_BRIDGE: { ...mod.NILE_USDT_BRIDGE, disabledReason: undefined } };
});

import { BridgeScreen } from '@/modules/bridge/BridgeScreen';

function renderScreen() {
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BridgeScreen isOpen onClose={onClose} />
    </QueryClientProvider>,
  );
  return { onClose };
}

describe('BridgeScreen picker', () => {
  it('walks direction, network, asset, then the form, showing each step with its single option', () => {
    const { onClose } = renderScreen();

    // Step 0: which way. Both directions are offered; out counts the assets with a return path.
    expect(screen.getByText('Bring assets in')).toBeDefined();
    expect(screen.getByText('Send assets out')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Bring assets in/ }));

    // Step 1: the one supported network, named and tagged as a testnet.
    expect(screen.getByText(/Step 1 of 3/)).toBeDefined();
    expect(screen.getByText('Tron')).toBeDefined();
    expect(screen.getByText(/Nile testnet/)).toBeDefined();
    expect(screen.getByText('testnet')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Tron/ }));

    // Step 2: the one asset on it.
    expect(screen.getByText(/Step 2 of 3/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /USDT/ }));

    // Step 3: the form keeps the choice in view and names the signer.
    expect(screen.getByPlaceholderText('0.00')).toBeDefined();
    expect(screen.getByText(/^From/)).toBeDefined();
    expect(screen.getByRole('button', { name: /Continue with TronLink/ })).toBeDefined();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('offers the assets-out path and asks for tokens and a destination', () => {
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /Send assets out/ }));
    fireEvent.click(screen.getByRole('button', { name: /Tron/ }));
    fireEvent.click(screen.getByRole('button', { name: /USDT/ }));
    // No tokens in this wallet: the form says so instead of offering a burn.
    expect(screen.getByText(/No USDT tokens to send out/)).toBeDefined();
    expect(screen.getByText(/^To/)).toBeDefined();
  });

  it('closes from the first step and steps back from later ones', () => {
    const { onClose } = renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /Bring assets in/ }));
    fireEvent.click(screen.getByRole('button', { name: /Tron/ }));
    expect(screen.getByText(/Step 2 of 3/)).toBeDefined();

    // The header's back arrow is the only icon-only button in the header.
    const back = screen.getAllByRole('button').find((b) => b.textContent === '')!;
    fireEvent.click(back);
    expect(screen.getByText(/Step 1 of 3/)).toBeDefined();
    fireEvent.click(back);
    expect(screen.getByText('Bring assets in')).toBeDefined();
    fireEvent.click(back);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
