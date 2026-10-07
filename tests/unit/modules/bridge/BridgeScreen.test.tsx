/**
 * The picker shows every step, so what the wallet supports is visible: the
 * asset and its network in one list, then the form. Rendered against the real
 * Tron USDT and Ethereum USDC assets (no wallet extension, no network calls).
 */
import { describe, it, expect, vi } from 'vitest';
import type { Token } from '@unicitylabs/sphere-sdk';
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
import { BridgeScreen, BurnedSummary, PendingList, ReturnFeeNote, ReturnsList, TokenChoice } from '@/modules/bridge/BridgeScreen';
import type { PendingLock, PendingReturn } from '@/modules/bridge/store';
import { ReturnServiceUnreachable } from '@/modules/bridge/returnFee';

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

  it('walks to the Ethereum USDC form and offers the browser wallet, with an install hint when none is there', () => {
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /Bring assets in/ }));
    fireEvent.click(screen.getByRole('button', { name: /USDC Ethereum/ }));
    expect(screen.getByPlaceholderText('0.00')).toBeDefined();
    expect(screen.getByRole('button', { name: /Continue with Browser wallet/ })).toBeDefined();
    expect(screen.getByText(/Install an Ethereum browser wallet such as MetaMask/)).toBeDefined();
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
        fireEvent.click(screen.getByRole('button', { name: /Continue with Browser wallet/ }));
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

  it('shows the fee a return pays next to the amount sent, and nothing for one that pays none', () => {
    const sent: PendingReturn = { ...failed, coinIdHex: SEPOLIA_USDC_BRIDGE.coinIdHex!, amount: '1000000', status: 'queued', recoverable: undefined, message: undefined };
    const { container, rerender } = render(<ReturnsList returns={[{ ...sent, fee: '50000' }]} timing={null} onDismiss={vi.fn()} onRetry={vi.fn()} />);
    expect(container.textContent).toContain('1 USDC → Ethereum · 0.05 USDC fee');
    rerender(<ReturnsList returns={[sent]} timing={null} onDismiss={vi.fn()} onRetry={vi.fn()} />);
    expect(container.textContent).toContain('1 USDC → Ethereum');
    expect(container.textContent).not.toContain('fee');
    rerender(<ReturnsList returns={[{ ...sent, fee: '0' }]} timing={null} onDismiss={vi.fn()} onRetry={vi.fn()} />);
    expect(container.textContent).not.toContain('fee');
  });

  it('lets a released return be removed', () => {
    render(<ReturnsList returns={[{ ...failed, status: 'settled', recoverable: undefined }]} timing={null} onDismiss={vi.fn()} onRetry={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Remove this record' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Send this burn to the service again' })).toBeNull();
  });
});

describe('BurnedSummary', () => {
  const usdc = () => bridgeAssetsFor('testnet2').find((a) => a.symbol === 'USDC')!;
  const burn = (id: string, amount: string): PendingReturn => ({
    id, coinIdHex: SEPOLIA_USDC_BRIDGE.coinIdHex!, assetId: usdc().id, burnedTokenHex: '01', reasonBytesHex: '07',
    destination: '0x2B00d708fc777F174A248B9bE01c8E8379d69Caf', amount, fee: '50000', createdAt: 1, status: 'proving',
  });

  it('says what was burned, what the service is doing and where to follow it, and nothing else', () => {
    const { container } = render(<BurnedSummary asset={usdc()} burned={[burn('n1', '4950000')]} />);
    expect(container.textContent).toBe(
      'Burned on Unicity' +
        '4.95 USDC was burned.' +
        'The bridge service is generating proof of burn.' +
        'The pending burn is listed under Returns in Bridge view.',
    );
  });

  it('gives the total and one status line per token when several were burned', () => {
    const { container } = render(<BurnedSummary asset={usdc()} burned={[burn('n1', '4950000'), burn('n2', '1000000')]} />);
    expect(container.textContent).toContain('5.95 USDC was burned.');
    expect(container.textContent).toContain('4.95 USDC: The bridge service is generating proof of burn.');
    expect(container.textContent).toContain('1 USDC: The bridge service is generating proof of burn.');
    expect(container.textContent).toContain('The pending burns are listed under Returns in Bridge view.');
  });
});

describe('ReturnFeeNote', () => {
  const usdc = () => bridgeAssetsFor('testnet2').find((a) => a.symbol === 'USDC')!;

  it('says what the bridge service charges per token, and nothing more', () => {
    const { container } = render(<ReturnFeeNote asset={usdc()} fee={50_000n} failure={null} />);
    expect(container.textContent).toBe('The bridge service charges 0.05 USDC of each token as its fee.');
  });

  it('says it is asking while the service has not answered', () => {
    render(<ReturnFeeNote asset={usdc()} fee={undefined} failure={null} />);
    expect(screen.getByText(/Asking the bridge service what it charges/)).toBeDefined();
  });

  it('says the service did not respond and bridging out is disabled when it could not be reached', () => {
    const { container } = render(<ReturnFeeNote asset={usdc()} fee={undefined} failure={new ReturnServiceUnreachable(new TypeError('Failed to fetch'))} />);
    expect(container.textContent?.trim()).toBe('The bridge service did not respond. Bridging out is currently disabled.');
  });

  it('says nothing can be sent out and gives the reason when the service answered with a quote the wallet refuses', () => {
    for (const reason of [
      'The return service asks a fee above what this wallet allows for USDC.',
      'The return service names a fee recipient other than the account this wallet pays.',
    ]) {
      const { container, unmount } = render(<ReturnFeeNote asset={usdc()} fee={undefined} failure={new Error(reason)} />);
      expect(container.textContent?.trim()).toBe(`Nothing can be sent out now. ${reason}`);
      unmount();
    }
  });

  it('adds nothing when the service charges nothing', () => {
    const { container } = render(<ReturnFeeNote asset={usdc()} fee={0n} failure={null} />);
    expect(container.textContent).toBe('');
  });
});

describe('TokenChoice', () => {
  const usdc = () => bridgeAssetsFor('testnet2').find((a) => a.symbol === 'USDC')!;
  const token = (amount: string) => ({ id: 't-1', amount }) as unknown as Token;

  it('cannot be picked when the token is no larger than the fee, and says why', () => {
    const onToggle = vi.fn();
    render(<TokenChoice token={token('10000')} asset={usdc()} checked={false} tooSmall onToggle={onToggle} />);
    const box = screen.getByRole('checkbox');
    expect(box).toHaveProperty('disabled', true);
    expect(box).toHaveProperty('checked', false);
    expect(screen.getByText(/Token is smaller than the charged fee\./)).toBeDefined();
  });

  it('can be picked when it covers the fee', () => {
    const onToggle = vi.fn();
    render(<TokenChoice token={token('1000000')} asset={usdc()} checked={false} tooSmall={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Token is smaller than the charged fee\./)).toBeNull();
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
