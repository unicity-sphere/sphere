/**
 * A bridge-out burns one token after another, and a burn is final. When a later token
 * fails, the screen reports the tokens already burned together with the failure, so the
 * user is not put back on the form with only an error. The failing token keeps its own
 * reason, because its burn may have gone out before the failure; only the tokens after it
 * are said to stay in the wallet. When nothing was burned, the form comes back with the
 * failure. Rendered against the real Ethereum USDC asset with the burns stubbed.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const out = vi.hoisted(() => ({
  bridgeOut: vi.fn(),
  tokens: [{ id: 't-1', amount: '1000000' }, { id: 't-2', amount: '2000000' }, { id: 't-3', amount: '3000000' }],
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
// What burnForReturn throws when the SDK reports the burn as not succeeded; the burn may still go out.
const BURN_UNSURE = 'burn failed for token t-2: aggregator timeout';

function burn(id: string, amount: string): PendingReturn {
  return {
    id, coinIdHex: SEPOLIA_USDC_BRIDGE.coinIdHex!, assetId: 'eip155:11155111:usdc', burnedTokenHex: '01', reasonBytesHex: '07',
    destination: DESTINATION, amount, fee: '50000', createdAt: 1, status: 'queued',
  };
}

function bridgeOutAllTokens(): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BridgeScreen isOpen onClose={vi.fn()} />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: /Send assets out/ }));
  fireEvent.click(screen.getByRole('button', { name: /USDC Ethereum/ }));
  fireEvent.click(screen.getByRole('button', { name: 'All' }));
  fireEvent.change(screen.getByPlaceholderText('address'), { target: { value: DESTINATION } });
  fireEvent.click(screen.getByRole('button', { name: 'Bridge out 3 tokens' }));
}

afterEach(() => {
  out.bridgeOut.mockReset();
});

describe('BridgeScreen bridge-out that stops partway', () => {
  it('reports the tokens burned before a later token failed, where it stopped, and the tokens after it as kept', async () => {
    out.bridgeOut.mockResolvedValueOnce([burn('n1', '1000000')]).mockRejectedValueOnce(new Error(FEE_ROSE));
    bridgeOutAllTokens();

    expect(await screen.findByText('Burned on Unicity')).toBeDefined();
    expect(screen.getByText('1 USDC was burned.')).toBeDefined();
    expect(screen.getByText(`Burning stopped at token 2 of 3: ${FEE_ROSE} The last token was not burned and stays in this wallet.`)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Done' })).toBeDefined();
    expect(out.bridgeOut).toHaveBeenCalledTimes(2);
  });

  it('does not count a token whose own burn failed as kept, since its burn may still go out', async () => {
    out.bridgeOut
      .mockResolvedValueOnce([burn('n1', '1000000')])
      .mockResolvedValueOnce([burn('n2', '2000000')])
      .mockRejectedValueOnce(new Error(BURN_UNSURE));
    bridgeOutAllTokens();

    expect(await screen.findByText('3 USDC was burned.')).toBeDefined();
    expect(screen.getByText(`Burning stopped at token 3 of 3: ${BURN_UNSURE}`)).toBeDefined();
    expect(screen.queryByText(/stays? in this wallet/)).toBeNull();
  });

  it('returns to the form with the failure when no token was burned', async () => {
    out.bridgeOut.mockRejectedValueOnce(new Error(FEE_ROSE));
    bridgeOutAllTokens();

    expect(await screen.findByText(FEE_ROSE)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Bridge out 3 tokens' })).toBeDefined();
    expect(screen.queryByText('Burned on Unicity')).toBeNull();
    expect(out.bridgeOut).toHaveBeenCalledTimes(1);
  });

  it('shows the plain burned summary when every token was burned', async () => {
    out.bridgeOut
      .mockResolvedValueOnce([burn('n1', '1000000')])
      .mockResolvedValueOnce([burn('n2', '2000000')])
      .mockResolvedValueOnce([burn('n3', '3000000')]);
    bridgeOutAllTokens();

    expect(await screen.findByText('6 USDC was burned.')).toBeDefined();
    expect(screen.queryByText(/Burning stopped/)).toBeNull();
  });
});
