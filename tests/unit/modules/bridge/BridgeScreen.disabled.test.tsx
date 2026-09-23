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
  it.each(['Bring assets in', 'Send assets out'])('%s: lists the asset with its reason and does not open the form', (direction) => {
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(direction) }));
    fireEvent.click(screen.getByRole('button', { name: /Tron/ }));
    const row = screen.getByRole('button', { name: /USDT/ });
    expect(row).toHaveProperty('disabled', true);
    expect(screen.getByText(/80 ms/)).toBeDefined();
    fireEvent.click(row);
    expect(screen.queryByPlaceholderText('0.00')).toBeNull();
    expect(screen.queryByText(/^To/)).toBeNull();
  });
});
