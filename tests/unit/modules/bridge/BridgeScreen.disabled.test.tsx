/**
 * A deployment that can no longer settle stays listed, with its reason, and
 * cannot be picked in either direction. Rendered against the real Tron USDT
 * manifest, which is disabled.
 */
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ network: 'testnet2', sphere: null }),
}));
vi.mock('../../../../src/sdk', () => ({ useTokens: () => ({ tokens: [] }) }));

import { BridgeScreen } from '@/modules/bridge/BridgeScreen';

function renderScreen() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BridgeScreen isOpen onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('BridgeScreen with a disabled asset', () => {
  it.each(['Bring assets in', 'Send assets out'])('%s: the network whose assets are all disabled is inert, with the reason', (direction) => {
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(direction) }));
    const tron = screen.getByRole('button', { name: /Tron/ });
    expect(tron).toHaveProperty('disabled', true);
    expect(screen.getByText(/80 ms/)).toBeDefined();
    expect(screen.getByRole('button', { name: /Ethereum/ })).toHaveProperty('disabled', false);
    fireEvent.click(tron);
    expect(screen.getByText(/Step 1 of 3/)).toBeDefined();
    expect(screen.queryByText(/Step 2 of 3/)).toBeNull();
  });

  it.each(['Bring assets in', 'Send assets out'])('%s: a disabled asset reached directly is listed with its reason and cannot be picked', (direction) => {
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(direction) }));
    fireEvent.click(screen.getByRole('button', { name: /Ethereum/ }));
    fireEvent.click(screen.getAllByRole('button').find((b) => b.textContent === '')!);
    expect(screen.getByText(/Step 1 of 3/)).toBeDefined();
    const row = screen.getByRole('button', { name: /Tron/ });
    expect(row).toHaveProperty('disabled', true);
    fireEvent.click(row);
    expect(screen.queryByPlaceholderText('0.00')).toBeNull();
  });
});
