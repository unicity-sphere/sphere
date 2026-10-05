/**
 * A bridge-out burns one token after another, and a burn is final. When a later token
 * fails, the screen reports the tokens already burned together with the failure, so the
 * user is not put back on the form with only an error. When nothing was burned, the form
 * comes back with the failure. Rendered against the real Ethereum USDC asset with the
 * burns stubbed.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const out = vi.hoisted(() => ({
  bridgeOut: vi.fn(),
  tokens: [{ id: 't-1', amount: '1000000' }, { id: 't-2', amount: '2000000' }],
}));

vi.mock('../../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ network: 'testnet2', sphere: null }),
}));
vi.mock('../../../../src/sdk', () => ({ useTokens: () => ({ tokens: [] }) }));
vi.mock('../../../../src/modules/bridge/useBridgeOut', () => ({
  useBridgeOut: () => ({ bridgeOut: out.bridgeOut, returns: [], timing: null, dismiss: vi.fn(), retry: vi.fn(), reset: vi.fn() }),
  useReturnableTokens: () => ({ eligible: out.tokens, ineligible: [], isLoading: false }),
  useReturnFee: () => ({ fee: 50_000n, error: null }),
}));

import { SEPOLIA_USDC_BRIDGE } from '@unicitylabs/bridge-plugin/wallet';

import { BridgeScreen } from '@/modules/bridge/BridgeScreen';
import type { PendingReturn } from '@/modules/bridge/store';

vi.stubEnv('VITE_BRIDGE_RETURN_SERVICE_URL_SEPOLIA_USDC', 'https://sepolia-return.example.test');

const DESTINATION = `0x${'11'.repeat(20)}`;
const FEE_ROSE = 'The return service asks a fee of 60000, above the 50000 allowed for this burn.';

function burn(id: string, amount: string): PendingReturn {
  return {
    id, coinIdHex: SEPOLIA_USDC_BRIDGE.coinIdHex!, assetId: 'eip155:11155111:usdc', burnedTokenHex: '01', reasonBytesHex: '07',
    destination: DESTINATION, amount, fee: '50000', createdAt: 1, status: 'queued',
  };
}

function bridgeOutBothTokens(): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BridgeScreen isOpen onClose={vi.fn()} />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: /Send assets out/ }));
  fireEvent.click(screen.getByRole('button', { name: /USDC Ethereum/ }));
  fireEvent.click(screen.getByRole('button', { name: 'All' }));
  fireEvent.change(screen.getByPlaceholderText('address'), { target: { value: DESTINATION } });
  fireEvent.click(screen.getByRole('button', { name: 'Bridge out 2 tokens' }));
}

afterEach(() => {
  out.bridgeOut.mockReset();
});

describe('BridgeScreen bridge-out that stops partway', () => {
  it('reports the tokens burned before a later token failed, together with the failure', async () => {
    out.bridgeOut.mockResolvedValueOnce([burn('n1', '1000000')]).mockRejectedValueOnce(new Error(FEE_ROSE));
    bridgeOutBothTokens();

    expect(await screen.findByText('Burned on Unicity')).toBeDefined();
    expect(screen.getByText('1 USDC was burned.')).toBeDefined();
    expect(screen.getByText(`1 token was not burned and stays in this wallet. ${FEE_ROSE}`)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Done' })).toBeDefined();
    expect(out.bridgeOut).toHaveBeenCalledTimes(2);
  });

  it('returns to the form with the failure when no token was burned', async () => {
    out.bridgeOut.mockRejectedValueOnce(new Error(FEE_ROSE));
    bridgeOutBothTokens();

    expect(await screen.findByText(FEE_ROSE)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Bridge out 2 tokens' })).toBeDefined();
    expect(screen.queryByText('Burned on Unicity')).toBeNull();
    expect(out.bridgeOut).toHaveBeenCalledTimes(1);
  });

  it('shows the plain burned summary when every token was burned', async () => {
    out.bridgeOut.mockResolvedValueOnce([burn('n1', '1000000')]).mockResolvedValueOnce([burn('n2', '2000000')]);
    bridgeOutBothTokens();

    expect(await screen.findByText('3 USDC was burned.')).toBeDefined();
    expect(screen.queryByText(/not burned/)).toBeNull();
  });
});
