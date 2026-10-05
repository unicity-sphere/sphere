/**
 * A deployment that can no longer settle is not offered in either direction.
 * Rendered against the real Tron USDT manifest, which is disabled; its tokens
 * still verify and are still described, since the asset stays registered.
 */
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NILE_USDT_BRIDGE } from '@unicitylabs/bridge-plugin/wallet';

vi.mock('../../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ network: 'testnet2', sphere: null }),
}));
vi.mock('../../../../src/sdk', () => ({ useTokens: () => ({ tokens: [] }) }));

import { BridgeScreen } from '@/modules/bridge/BridgeScreen';
import { bridgeAssetByCoin, bridgeAssetsFor } from '@/modules/bridge/assets';

// Sepolia USDC offers bridge-out only with a return service configured.
vi.stubEnv('VITE_BRIDGE_RETURN_SERVICE_URL_SEPOLIA_USDC', 'https://return.example.test');

function renderScreen() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BridgeScreen isOpen onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('BridgeScreen with a disabled asset', () => {
  it.each(['Bring assets in', 'Send assets out'])('%s: the disabled asset is not offered', (direction) => {
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(direction) }));
    expect(screen.queryByRole('button', { name: /USDT Tron/ })).toBeNull();
    expect(screen.getByRole('button', { name: /USDC Ethereum/ })).toHaveProperty('disabled', false);
  });

  it('keeps the disabled asset registered, so its tokens are still described', () => {
    expect(bridgeAssetsFor('testnet2').map((a) => a.symbol)).not.toContain('USDT');
    expect(bridgeAssetByCoin(NILE_USDT_BRIDGE.coinIdHex!)?.symbol).toBe('USDT');
  });
});
