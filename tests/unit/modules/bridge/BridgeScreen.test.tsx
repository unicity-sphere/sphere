/**
 * The picker shows every step, so what the wallet supports is visible: the
 * asset and its network in one list, then the form. Rendered against the real
 * Tron USDT and Ethereum USDC assets (no wallet extension, no network calls).
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

import { SEPOLIA_USDC_BRIDGE } from '@unicitylabs/bridge-plugin/wallet';

import { bridgeAssetsFor } from '@/modules/bridge/assets';
import { BridgeScreen, PendingList, ReturnFeeNote, ReturnsList } from '@/modules/bridge/BridgeScreen';
import { summarizeReturnFee } from '@/modules/bridge/returnFee';
import type { PendingLock, PendingReturn } from '@/modules/bridge/store';

// An asset offers bridge-out only with a return service configured for its deployment.
vi.stubEnv('VITE_BRIDGE_RETURN_SERVICE_URL_SEPOLIA_USDC', 'https://sepolia-return.example.test');
vi.stubEnv('VITE_BRIDGE_RETURN_SERVICE_URL_NILE_USDT', 'https://nile-return.example.test');

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
  it('walks direction, then asset and network in one list, then the form', () => {
    const { onClose } = renderScreen();

    // Step 0: which way. Both directions are offered; out counts the assets with a return path.
    expect(screen.getByText('Bring assets in')).toBeDefined();
    expect(screen.getByText('Send assets out')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Bring assets in/ }));

    // Step 1: every asset with its network, ordered by asset then network, tagged as testnets.
    expect(screen.getByText(/Step 1 of 2/)).toBeDefined();
    const rows = screen.getAllByRole('button').map((b) => b.textContent ?? '');
    const usdc = rows.findIndex((t) => t.startsWith('USDC Ethereum'));
    const usdt = rows.findIndex((t) => t.startsWith('USDT Tron'));
    expect(usdc).toBeGreaterThanOrEqual(0);
    expect(usdt).toBeGreaterThan(usdc);
    expect(screen.getByText(/Sepolia testnet/)).toBeDefined();
    expect(screen.getByText(/Nile testnet/)).toBeDefined();
    expect(screen.getAllByText('testnet')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: /USDT Tron/ }));

    // Step 2: the form keeps the choice in view and names the signer.
    expect(screen.getByPlaceholderText('0.00')).toBeDefined();
    expect(screen.getByText(/^From/)).toBeDefined();
    expect(screen.getByRole('button', { name: /Continue with TronLink/ })).toBeDefined();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('walks to the Ethereum USDC form and names MetaMask as the signer', () => {
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /Bring assets in/ }));
    fireEvent.click(screen.getByRole('button', { name: /USDC Ethereum/ }));
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
      fireEvent.click(screen.getByRole('button', { name: /USDC Ethereum/ }));
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
    fireEvent.click(screen.getByRole('button', { name: /USDT Tron/ }));
    // No tokens in this wallet: the form says so instead of offering a burn.
    expect(screen.getByText(/No USDT tokens to send out/)).toBeDefined();
    expect(screen.getByText(/^To/)).toBeDefined();
  });

  it('closes from the first step and steps back from later ones', () => {
    const { onClose } = renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /Bring assets in/ }));
    fireEvent.click(screen.getByRole('button', { name: /USDT Tron/ }));
    expect(screen.getByPlaceholderText('0.00')).toBeDefined();

    // The header's back arrow is the only icon-only button in the header.
    const back = screen.getAllByRole('button').find((b) => b.textContent === '')!;
    fireEvent.click(back);
    expect(screen.getByText(/Step 1 of 2/)).toBeDefined();
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

describe('ReturnFeeNote', () => {
  const usdc = () => bridgeAssetsFor('testnet2').find((a) => a.symbol === 'USDC')!;

  it('shows the fee per token, the fee in all and what is left to release', () => {
    const summary = summarizeReturnFee(50_000n, [1_000_000n, 2_000_000n]);
    const { container } = render(<ReturnFeeNote asset={usdc()} fee={50_000n} summary={summary} tokens={2} failure={null} />);
    expect(container.textContent).toContain('keeps 0.05 USDC of each token');
    expect(container.textContent).toContain('0.1 USDC in all');
    expect(container.textContent).toContain('leaving 2.9 USDC to be released');
  });

  it('says it is asking while the service has not answered', () => {
    render(<ReturnFeeNote asset={usdc()} fee={undefined} summary={null} tokens={0} failure={null} />);
    expect(screen.getByText(/Asking the return service what it charges/)).toBeDefined();
  });

  it('says nothing can be sent out when the service did not answer', () => {
    render(<ReturnFeeNote asset={usdc()} fee={undefined} summary={null} tokens={1} failure={new Error('HTTP 503')} />);
    expect(screen.getByText(/Nothing can be sent out now: the return service did not say what it charges/)).toBeDefined();
  });

  it('adds nothing when the service charges nothing', () => {
    const { container } = render(<ReturnFeeNote asset={usdc()} fee={0n} summary={summarizeReturnFee(0n, [7n])} tokens={1} failure={null} />);
    expect(container.textContent).toBe('');
  });
});

describe('PendingList', () => {
  const TXID = 'ab'.repeat(32);
  const lock: PendingLock = {
    id: 'l1', coinIdHex: SEPOLIA_USDC_BRIDGE.coinIdHex!, tokenTypeHex: SEPOLIA_USDC_BRIDGE.tokenTypeHex!, chainId: SEPOLIA_USDC_BRIDGE.chainId,
    saltHex: '11'.repeat(32), tokenIdHex: '22'.repeat(32), recipientCommitmentHex: '33'.repeat(32), amount: '1000000', createdAt: 1, status: 'locking',
  };
  const renderList = (l: PendingLock) => {
    const onDiscard = vi.fn();
    const onResume = vi.fn();
    render(<PendingList locks={[l]} resumingId={null} onResume={onResume} onDiscard={onDiscard} />);
    return { onDiscard, onResume };
  };

  it('discards a deposit that was never signed in one click', () => {
    const { onDiscard } = renderList(lock);
    fireEvent.click(screen.getByRole('button', { name: 'Discard this record' }));
    expect(onDiscard).toHaveBeenCalledWith(lock);
  });

  it('asks again before discarding a deposit whose lock may have been sent', () => {
    const { onDiscard } = renderList({ ...lock, lockRequested: true });
    fireEvent.click(screen.getByRole('button', { name: 'Discard this record' }));
    expect(onDiscard).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Discard anyway' }));
    expect(onDiscard).toHaveBeenCalledWith(expect.objectContaining({ id: 'l1' }));
  });

  it('resumes a deposit whose lock may have been sent from the lock transaction id the user pastes', () => {
    const { onResume } = renderList({ ...lock, lockRequested: true });
    const input = screen.getByLabelText('Lock transaction id');
    const resume = screen.getByRole('button', { name: 'Resume from this transaction' });
    fireEvent.change(input, { target: { value: 'nonsense' } });
    expect(resume).toHaveProperty('disabled', true);
    fireEvent.change(input, { target: { value: TXID } });
    fireEvent.click(resume);
    expect(onResume).toHaveBeenCalledWith(expect.objectContaining({ id: 'l1', lockTxid: `0x${TXID}` }));
  });
});
