/**
 * Where the deployment names a Reown project, the bridge-in form offers WalletConnect after the
 * browser wallets, and once a WalletConnect session is open it offers to end it, so the user
 * can connect another wallet app.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ network: 'testnet2', sphere: null }),
}));
vi.mock('../../../../src/sdk', () => ({ useTokens: () => ({ tokens: [] }) }));

const ACCOUNT = '0x2B00d708fc777F174A248B9bE01c8E8379d69Caf';

vi.mock('@walletconnect/ethereum-provider', () => ({
  EthereumProvider: {
    init: async () => {
      let session: unknown;
      return {
        get session() {
          return session;
        },
        async enable() {
          session = { namespaces: { eip155: { accounts: [`eip155:11155111:${ACCOUNT}`] } }, peer: { metadata: { name: 'MetaMask Wallet', url: 'https://metamask.io' } } };
          return [ACCOUNT];
        },
        async disconnect() {
          session = undefined;
        },
        async request({ method }: { method: string }) {
          if (method === 'eth_chainId') return 11155111;
          throw new Error(`unexpected ${method}`);
        },
        on() {},
        removeListener() {},
      };
    },
  },
}));

import { bridgeAssetsFor, resetBridgeAssets } from '@/modules/bridge/assets';
import { BridgeScreen } from '@/modules/bridge/BridgeScreen';

function openEthereumForm(): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BridgeScreen isOpen onClose={vi.fn()} />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: /Bring assets in/ }));
  fireEvent.click(screen.getByRole('button', { name: /USDC Ethereum/ }));
}

afterEach(() => {
  vi.unstubAllEnvs();
  resetBridgeAssets();
});

describe('BridgeScreen with WalletConnect', () => {
  it('offers no WalletConnect where the deployment names no project', () => {
    vi.stubEnv('VITE_WALLETCONNECT_PROJECT_ID', '');
    openEthereumForm();
    expect(screen.queryByRole('button', { name: /WalletConnect/ })).toBeNull();
  });

  it('offers WalletConnect after the browser wallet, and a way to end its session once one is open', async () => {
    vi.stubEnv('VITE_WALLETCONNECT_PROJECT_ID', '0123456789abcdef0123456789abcdef');
    openEthereumForm();
    const buttons = screen.getAllByRole('button', { name: /^Continue with / }).map((b) => b.textContent?.trim());
    expect(buttons).toEqual(['Continue with Browser wallet', 'Continue with WalletConnect']);
    expect(screen.queryByRole('button', { name: 'Disconnect WalletConnect' })).toBeNull();

    // A session opened (the form re-reads the wallets every second).
    const option = bridgeAssetsFor('testnet2')
      .find((a) => a.symbol === 'USDC')!
      .wallets()
      .find((w) => w.id === 'walletconnect')!;
    await option.open().wallet.connect();
    fireEvent.click(await screen.findByRole('button', { name: 'Disconnect WalletConnect' }, { timeout: 2_000 }));
    await vi.waitFor(() => expect(screen.queryByRole('button', { name: 'Disconnect WalletConnect' })).toBeNull(), { timeout: 2_000 });
    expect(option.connected?.()).toBe(false);
  });
});
