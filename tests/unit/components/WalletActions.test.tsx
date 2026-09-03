import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// WalletActions reads only `network` from the Sphere context.
const ctx = vi.hoisted(() => ({ network: 'testnet2' as string }));

vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ctx,
}));

import { WalletActions } from '../../../src/components/wallet/L3/components/WalletActions';

function renderActions(sendDisabled = false) {
  return render(
    <WalletActions
      onTopUp={vi.fn()}
      onSwap={vi.fn()}
      onSend={vi.fn()}
      sendDisabled={sendDisabled}
    />,
  );
}

beforeEach(() => {
  ctx.network = 'testnet2';
});

describe('WalletActions — self-mint gating', () => {
  it('offers Top Up and Swap on a test network', () => {
    renderActions();
    expect(screen.getByText('Top Up')).toBeDefined();
    const swap = screen.getByRole('button', { name: /Swap/ }) as HTMLButtonElement;
    expect(swap.disabled).toBe(false);
  });

  it('hides Top Up and disables Swap on mainnet', () => {
    ctx.network = 'mainnet';
    renderActions();

    expect(screen.queryByText('Top Up')).toBeNull();
    const swap = screen.getByRole('button', { name: /Swap/ }) as HTMLButtonElement;
    expect(swap.disabled).toBe(true);
    // Copy changed from 'Not available on Mainnet': the gate is canSelfMint,
    // a fail-closed TEST-network allowlist, so it also denies the dev hatch and
    // every future network name — the tooltip must not name mainnet.
    expect(swap.getAttribute('title')).toBe('Not available on this network');
  });

  it('fails closed on an unknown network', () => {
    ctx.network = 'some-future-network';
    renderActions();

    expect(screen.queryByText('Top Up')).toBeNull();
    const swap = screen.getByRole('button', { name: /Swap/ }) as HTMLButtonElement;
    expect(swap.disabled).toBe(true);
    // The tooltip must describe the gate, not one network: this case is why
    // hardcoding 'Mainnet' was a copy bug.
    expect(swap.getAttribute('title')).toBe('Not available on this network');
  });

  it('keeps Send available regardless of the network', () => {
    ctx.network = 'mainnet';
    renderActions();
    expect((screen.getByRole('button', { name: /Send/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('still honours sendDisabled when there is nothing to send', () => {
    renderActions(true);
    expect((screen.getByRole('button', { name: /Send/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
