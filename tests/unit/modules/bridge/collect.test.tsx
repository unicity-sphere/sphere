/**
 * A pull-payment vault keeps one balance per account, so the returns list
 * offers one collect per account it released to, however many returns went
 * there: the amount the vault owes, collected on a click through the wallet
 * the user picks when there are several. The button stays held until the
 * collecting transaction is mined, then the row links it; a reverted collect
 * says so and offers the button again. With no wallet on the page the amount
 * stays visible with the install hint, and a wallet that arrives later gets
 * its button without reopening the screen.
 */
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const payout = {
  account: (destination: string) => destination.toLowerCase(),
  owed: vi.fn<(destination: string) => Promise<bigint>>(),
  confirmed: vi.fn<(txid: string) => Promise<void>>(),
};
const wallet = (id: string, name: string, available = true) => ({
  id,
  name,
  unavailableHint: 'Install an Ethereum browser wallet to sign on Ethereum.',
  isAvailable: () => available,
  open: () => { throw new Error('unused'); },
  collect: vi.fn(),
});
const wallets: ReturnType<typeof wallet>[] = [];
vi.mock('@/modules/bridge/assets', () => ({
  bridgeAssetByCoin: () => ({
    id: 'eip155:11155111:usdc',
    symbol: 'USDC',
    decimals: 6,
    chain: { name: 'Ethereum' },
    presentation: { explorerTxUrl: (txid: string) => `https://sepolia.etherscan.io/tx/${txid}` },
    wallets: () => wallets,
    out: { payout },
  }),
  bridgeAssets: () => [],
  bridgeAssetsFor: () => [],
}));

import { ReturnsList } from '@/modules/bridge/BridgeScreen';
import type { PendingReturn } from '@/modules/bridge/store';

beforeEach(() => {
  wallets.splice(0, wallets.length, wallet('injected-evm', 'Browser wallet'));
  payout.owed.mockReset();
  payout.confirmed.mockReset().mockResolvedValue(undefined);
});

const settled: PendingReturn = {
  id: 'n1',
  coinIdHex: 'bb'.repeat(32),
  assetId: 'eip155:11155111:usdc',
  burnedTokenHex: '',
  reasonBytesHex: '',
  destination: '0x2B00d708fc777F174A248B9bE01c8E8379d69Caf',
  amount: '1000000',
  createdAt: 1,
  status: 'settled',
  settleTxid: '0x' + 'aa'.repeat(32),
};

function renderList(returns: PendingReturn[]) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ReturnsList returns={returns} timing={null} onDismiss={vi.fn()} onRetry={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('collecting a pull-payment payout', () => {
  it('offers to collect what the vault owes, then links the collecting transaction', async () => {
    payout.owed.mockResolvedValue(1_000_000n);
    wallets[0].collect.mockResolvedValue('0x' + 'cc'.repeat(32));
    renderList([settled]);
    const button = await screen.findByRole('button', { name: 'Collect 1 USDC' });
    fireEvent.click(button);
    await waitFor(() => expect(wallets[0].collect).toHaveBeenCalledWith(settled.destination));
    const link = await screen.findByText('collected');
    expect(link.closest('a')?.getAttribute('href')).toBe('https://sepolia.etherscan.io/tx/0x' + 'cc'.repeat(32));
    expect(screen.queryByRole('button', { name: /Collect/ })).toBeNull();
  });

  it('puts the collect buttons on their own line, never beside the destination (#545)', async () => {
    payout.owed.mockResolvedValue(35_000_000n);
    wallets.splice(0, wallets.length, wallet('rabby', 'Rabby Wallet'), wallet('coinbase', 'Coinbase Wallet'));
    renderList([settled]);
    const buttons = await screen.findAllByRole('button', { name: /^Collect 35 USDC with / });
    expect(buttons).toHaveLength(2);
    // The address shows on the collect row and on the return's own row; the buttons sit beside neither.
    const lines = screen.getAllByText(settled.destination).map((address) => address.closest('div'));
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(line).not.toBeNull();
      for (const button of buttons) expect(line!.contains(button)).toBe(false);
    }
  });

  it('offers one collect per account, however many returns the vault released to it', async () => {
    const other = '0x32984BdCB769a01A0175145538CC9594bdd1baF7';
    payout.owed.mockImplementation(async (destination) => (destination.toLowerCase() === other.toLowerCase() ? 100_000_000n : 1_000_000n));
    renderList([
      { ...settled, id: 'a1', destination: other, amount: '10000000' },
      { ...settled, id: 'a2', destination: other, amount: '15000000' },
      { ...settled, id: 'a3', destination: other.toLowerCase(), amount: '5000000' },
      { ...settled, id: 'a4', destination: other, amount: '100000000' },
      { ...settled, id: 'b1' },
      { ...settled, id: 'b2', status: 'proving' },
    ]);
    await screen.findByRole('button', { name: 'Collect 100 USDC' });
    expect(screen.getAllByRole('button', { name: /^Collect / }).map((b) => b.textContent)).toEqual(['Collect 100 USDC', 'Collect 1 USDC']);
    expect(payout.owed).toHaveBeenCalledTimes(2);
  });

  it('holds the button until the collecting transaction is mined, without reading the balance it is taking', async () => {
    let mined!: () => void;
    payout.confirmed.mockReturnValue(new Promise<void>((resolve) => { mined = resolve; }));
    payout.owed.mockResolvedValue(1_000_000n);
    wallets[0].collect.mockResolvedValue('0x' + 'cc'.repeat(32));
    renderList([settled, { ...settled, id: 'n0', amount: '2000000' }]);
    fireEvent.click(await screen.findByRole('button', { name: 'Collect 1 USDC' }));
    await waitFor(() => expect(payout.confirmed).toHaveBeenCalledWith('0x' + 'cc'.repeat(32)));
    expect(screen.getByRole('button', { name: 'Collecting…' })).toHaveProperty('disabled', true);
    expect(screen.queryByText('collected')).toBeNull();
    expect(screen.getByText('waiting for the transaction').closest('a')?.getAttribute('href')).toBe('https://sepolia.etherscan.io/tx/0x' + 'cc'.repeat(32));

    mined();
    expect(await screen.findByText('collected')).toBeDefined();
    expect(screen.queryByRole('button', { name: /Collect/ })).toBeNull();
    // The balance the vault still reported before the withdraw was mined never comes back.
    expect(payout.owed).toHaveBeenCalledTimes(1);
  });

  it('says when the collecting transaction reverted, and offers the button again', async () => {
    payout.confirmed.mockRejectedValue(new Error('The "collect" transaction reverted. Please try again.'));
    payout.owed.mockResolvedValue(1_000_000n);
    wallets[0].collect.mockResolvedValue('0x' + 'dd'.repeat(32));
    renderList([settled]);
    fireEvent.click(await screen.findByRole('button', { name: 'Collect 1 USDC' }));
    expect(await screen.findByText(/The "collect" transaction reverted/)).toBeDefined();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Collect 1 USDC' })).toHaveProperty('disabled', false));
    expect(screen.queryByText('collected')).toBeNull();
    // The sent transaction stays linked next to the return's own release link.
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toContain('https://sepolia.etherscan.io/tx/0x' + 'dd'.repeat(32));
    await waitFor(() => expect(payout.owed).toHaveBeenCalledTimes(2));
  });

  it('shows nothing to collect when the vault owes nothing', async () => {
    payout.owed.mockResolvedValue(0n);
    renderList([settled]);
    await waitFor(() => expect(payout.owed).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /Collect/ })).toBeNull();
  });

  it('keeps the button and shows the reason when collecting fails', async () => {
    payout.owed.mockResolvedValue(2_500_000n);
    wallets[0].collect.mockRejectedValue(new Error('To collect, switch your wallet to account 0x2B00...9Caf and connect it to this site.'));
    renderList([{ ...settled, id: 'n2' }]);
    fireEvent.click(await screen.findByRole('button', { name: 'Collect 2.5 USDC' }));
    expect(await screen.findByText(/switch your wallet to account 0x2B00...9Caf and connect it to this site/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Collect 2.5 USDC' })).toBeDefined();
  });

  it('offers one collect button per wallet on the page, named when there are several', async () => {
    wallets.splice(0, wallets.length, wallet('io.metamask', 'MetaMask'), wallet('io.rabby', 'Rabby'));
    payout.owed.mockResolvedValue(1_000_000n);
    wallets[1].collect.mockResolvedValue('0x' + 'cc'.repeat(32));
    renderList([{ ...settled, id: 'n3' }]);
    expect(await screen.findByRole('button', { name: 'Collect 1 USDC with MetaMask' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Collect 1 USDC with Rabby' }));
    await waitFor(() => expect(wallets[1].collect).toHaveBeenCalledWith(settled.destination));
    expect(wallets[0].collect).not.toHaveBeenCalled();
  });

  it('keeps the amount in view with the install hint when no wallet is on the page', async () => {
    wallets.splice(0, wallets.length, wallet('injected-evm', 'Browser wallet', false));
    payout.owed.mockResolvedValue(1_000_000n);
    renderList([{ ...settled, id: 'n4' }]);
    const button = await screen.findByRole('button', { name: 'Collect 1 USDC' });
    expect(button).toHaveProperty('disabled', true);
    expect(screen.getByText(/Install an Ethereum browser wallet/)).toBeDefined();
  });

  it('offers a wallet that arrives after the row rendered, without reopening the screen', async () => {
    wallets.splice(0, wallets.length, wallet('injected-evm', 'Browser wallet', false));
    payout.owed.mockResolvedValue(1_000_000n);
    renderList([{ ...settled, id: 'n5' }]);
    expect(await screen.findByRole('button', { name: 'Collect 1 USDC' })).toHaveProperty('disabled', true);
    wallets.splice(0, wallets.length, wallet('io.metamask', 'MetaMask'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Collect 1 USDC' })).toHaveProperty('disabled', false));
    expect(screen.queryByText(/Install an Ethereum browser wallet/)).toBeNull();
  });
});
