/**
 * The bridge-in form offers one button per Ethereum wallet on the page, named and shown with
 * the icon each wallet announces for itself (EIP-6963). The browser wallet behind
 * `window.ethereum` is offered beside them only when no announced wallet owns it.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Eip1193Provider, Eip6963ProviderInfo } from '@unicitylabs/bridge-plugin/wallet';

vi.mock('../../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ network: 'testnet2', sphere: null }),
}));
vi.mock('../../../../src/sdk', () => ({ useTokens: () => ({ tokens: [] }) }));

import { resetBridgeAssets } from '@/modules/bridge/assets';
import { BridgeScreen } from '@/modules/bridge/BridgeScreen';

const RABBY: Eip6963ProviderInfo = { uuid: 'rabby-1', name: 'Rabby', icon: 'data:image/svg+xml,rabby', rdns: 'io.rabby' };
const provider: Eip1193Provider = { request: async () => { throw new Error('not called'); } };

function install(wallet: Eip6963ProviderInfo): () => void {
  const reply = () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: { info: wallet, provider } }));
  window.addEventListener('eip6963:requestProvider', reply);
  return () => window.removeEventListener('eip6963:requestProvider', reply);
}

function openEthereumForm(): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BridgeScreen isOpen onClose={vi.fn()} />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: /Bring assets in/ }));
  fireEvent.click(screen.getByRole('button', { name: /USDC Ethereum/ }));
}

const uninstall: (() => void)[] = [];

afterEach(() => {
  uninstall.splice(0).forEach((f) => f());
  delete (window as { ethereum?: unknown }).ethereum;
  resetBridgeAssets();
});

describe('BridgeScreen with an announced Ethereum wallet', () => {
  it('names the announced wallet with its icon and offers no browser wallet when nothing else is injected', () => {
    uninstall.push(install(RABBY));
    openEthereumForm();
    const button = screen.getByRole('button', { name: 'Continue with Rabby' });
    expect(button.querySelector('img')?.getAttribute('src')).toBe(RABBY.icon);
    expect(screen.queryByRole('button', { name: /Browser wallet/ })).toBeNull();
  });

  it('offers the browser wallet beside it when window.ethereum is another provider', () => {
    uninstall.push(install(RABBY));
    (window as { ethereum?: unknown }).ethereum = { request: async () => [] };
    openEthereumForm();
    expect(screen.getByRole('button', { name: 'Continue with Rabby' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Continue with Browser wallet' })).toBeDefined();
  });
});
