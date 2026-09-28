/**
 * The picker shows every step, so what the wallet supports is visible:
 * network, then asset, then the form. Rendered against the real Tron USDT and
 * Ethereum USDC assets (no wallet extension, no network calls).
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
vi.mock('@unicitylabs/bridge-plugin/wallet', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@unicitylabs/bridge-plugin/wallet')>();
  return { ...mod, NILE_USDT_BRIDGE: { ...mod.NILE_USDT_BRIDGE, disabledReason: undefined } };
});

import { BridgeScreen, ReturnsList } from '@/modules/bridge/BridgeScreen';
import type { PendingReturn } from '@/modules/bridge/store';

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
  it('walks direction, network, asset, then the form, showing each step with its options', () => {
    const { onClose } = renderScreen();

    // Step 0: which way. Both directions are offered; out counts the assets with a return path.
    expect(screen.getByText('Bring assets in')).toBeDefined();
    expect(screen.getByText('Send assets out')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Bring assets in/ }));

    // Step 1: the supported networks, named and tagged as testnets.
    expect(screen.getByText(/Step 1 of 3/)).toBeDefined();
    expect(screen.getByText('Ethereum')).toBeDefined();
    expect(screen.getByText(/Sepolia testnet/)).toBeDefined();
    expect(screen.getByText('Tron')).toBeDefined();
    expect(screen.getByText(/Nile testnet/)).toBeDefined();
    expect(screen.getAllByText('testnet')).toHaveLength(2);
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

  it('walks to the Ethereum USDC form and names MetaMask as the signer', () => {
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /Bring assets in/ }));
    fireEvent.click(screen.getByRole('button', { name: /Ethereum/ }));
    expect(screen.getByText(/Step 2 of 3/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /USDC/ }));
    expect(screen.getByPlaceholderText('0.00')).toBeDefined();
    expect(screen.getByRole('button', { name: /Continue with MetaMask/ })).toBeDefined();
    expect(screen.getByText(/Install the MetaMask browser extension/)).toBeDefined();
  });

  it('refuses a malformed amount or one finer than the asset divides before any wallet prompt', () => {
    const request = vi.fn();
    (window as { ethereum?: unknown }).ethereum = { request };
    try {
      renderScreen();
      fireEvent.click(screen.getByRole('button', { name: /Bring assets in/ }));
      fireEvent.click(screen.getByRole('button', { name: /Ethereum/ }));
      fireEvent.click(screen.getByRole('button', { name: /USDC/ }));
      for (const typed of ['1.2.3', '1.1234567']) {
        fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: typed } });
        fireEvent.click(screen.getByRole('button', { name: /Continue with MetaMask/ }));
        expect(screen.getByText('Enter an amount greater than zero, with at most 6 decimals.')).toBeDefined();
      }
      expect(request).not.toHaveBeenCalled();
    } finally {
      delete (window as { ethereum?: unknown }).ethereum;
    }
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

describe('ReturnsList', () => {
  const failed: PendingReturn = {
    id: 'n1', coinIdHex: 'cd'.repeat(32), assetId: 'test:usdx', burnedTokenHex: '01', reasonBytesHex: '07',
    destination: 'Tdest', amount: '7', createdAt: 1, status: 'failed', recoverable: false, message: 'intake is not configured',
  };

  it('offers a retry on a refused return and never removes the only copy of its burned token', () => {
    const onRetry = vi.fn();
    render(<ReturnsList returns={[failed]} timing={null} onDismiss={vi.fn()} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Send this burn to the service again' }));
    expect(onRetry).toHaveBeenCalledWith('n1');
    expect(screen.queryByRole('button', { name: 'Remove this record' })).toBeNull();
  });

  it('lets a released return be removed', () => {
    render(<ReturnsList returns={[{ ...failed, status: 'settled', recoverable: undefined }]} timing={null} onDismiss={vi.fn()} onRetry={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Remove this record' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Send this burn to the service again' })).toBeNull();
  });
});
