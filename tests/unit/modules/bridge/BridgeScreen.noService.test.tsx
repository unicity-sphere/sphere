/**
 * A deployment whose return service is not configured is offered for bridging in only:
 * a burned token no service can take would stay in this browser alone.
 */
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ network: 'testnet2', sphere: null }),
}));
vi.mock('../../../../src/sdk', () => ({ useTokens: () => ({ tokens: [] }) }));

import { BridgeScreen } from '@/modules/bridge/BridgeScreen';

vi.stubEnv('VITE_BRIDGE_RETURN_SERVICE_URL_SEPOLIA_USDC', '');

function openDirection(direction: string) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BridgeScreen isOpen onClose={vi.fn()} />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: new RegExp(direction) }));
}

describe('BridgeScreen without a return service', () => {
  it('offers the asset for bridging in', () => {
    openDirection('Bring assets in');
    expect(screen.getByRole('button', { name: /USDC Ethereum/ })).toHaveProperty('disabled', false);
  });

  it('does not offer it for bridging out', () => {
    openDirection('Send assets out');
    expect(screen.queryByRole('button', { name: /USDC Ethereum/ })).toBeNull();
  });
});
