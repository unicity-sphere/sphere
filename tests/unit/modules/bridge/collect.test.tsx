/**
 * A settled return on a pull-payment vault shows what the vault owes the
 * destination and collects it on a click, through the wallet the user picks
 * when there are several; once sent, the row links the collecting transaction
 * instead of offering the button again.
 */
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const payout = { owed: vi.fn(), collect: vi.fn() };
const wallet = (id: string, name: string, available = true) => ({ id, name, isAvailable: () => available, open: () => { throw new Error('unused'); } });
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
    payout.collect.mockResolvedValue('0x' + 'cc'.repeat(32));
    renderList([settled]);
    const button = await screen.findByRole('button', { name: 'Collect 1 USDC' });
    fireEvent.click(button);
    await waitFor(() => expect(payout.collect).toHaveBeenCalledWith(settled.destination, expect.objectContaining({ id: 'injected-evm' })));
    const link = await screen.findByText('collected');
    expect(link.closest('a')?.getAttribute('href')).toBe('https://sepolia.etherscan.io/tx/0x' + 'cc'.repeat(32));
    expect(screen.queryByRole('button', { name: /Collect/ })).toBeNull();
  });

  it('shows nothing to collect when the vault owes nothing', async () => {
    payout.owed.mockResolvedValue(0n);
    renderList([settled]);
    await waitFor(() => expect(payout.owed).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /Collect/ })).toBeNull();
  });

  it('keeps the button and shows the reason when collecting fails', async () => {
    payout.owed.mockResolvedValue(2_500_000n);
    payout.collect.mockRejectedValue(new Error('Switch Browser wallet to 0x2B00… to collect.'));
    renderList([{ ...settled, id: 'n2' }]);
    fireEvent.click(await screen.findByRole('button', { name: 'Collect 2.5 USDC' }));
    expect(await screen.findByText(/Switch Browser wallet/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Collect 2.5 USDC' })).toBeDefined();
  });

  it('offers one collect button per wallet on the page, named when there are several', async () => {
    wallets.splice(0, wallets.length, wallet('io.metamask', 'MetaMask'), wallet('io.rabby', 'Rabby'), wallet('injected-evm', 'Browser wallet', false));
    payout.owed.mockResolvedValue(1_000_000n);
    payout.collect.mockResolvedValue('0x' + 'cc'.repeat(32));
    renderList([{ ...settled, id: 'n3' }]);
    expect(await screen.findByRole('button', { name: 'Collect 1 USDC with MetaMask' })).toBeDefined();
    expect(screen.queryByRole('button', { name: /Browser wallet/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Collect 1 USDC with Rabby' }));
    await waitFor(() => expect(payout.collect).toHaveBeenCalledWith(settled.destination, expect.objectContaining({ id: 'io.rabby' })));
  });
});
