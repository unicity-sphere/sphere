/**
 * "Your wallet doesn't have a subscription key" is true of two very different
 * wallets: one that never asked, and one that asked and could not reach the
 * gateway. Only the first is an invitation; the second is an outage, and the
 * screen used to describe it as if nothing had happened — while sends were
 * silently blocked on it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const ctx = vi.hoisted(() => ({ keyStatus: 'provisioning' as string }));

vi.mock('../../../src/sdk/hooks/subscription', () => ({
  usePlans: () => ({ data: [], isLoading: false, isError: false }),
  useUtilization: () => ({ data: null, isLoading: false, isError: false }),
}));

vi.mock('../../../src/sdk/subscription/pendingOrder', () => ({
  hasStoredOrders: () => false,
}));

vi.mock('../../../src/config/subscriptionKeyCache', () => ({
  getStoredSubscriptionKey: () => null, // the state under test: no key
}));

vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({
    sphere: {},
    network: 'testnet2',
    applySubscriptionKey: vi.fn(),
    subscriptionKeyStatus: ctx.keyStatus,
  }),
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { SubscriptionModal } from '../../../src/components/wallet/L3/modals/SubscriptionModal';

function Wrapper({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const renderModal = () => render(<SubscriptionModal isOpen onClose={vi.fn()} />, { wrapper: Wrapper });

beforeEach(() => {
  ctx.keyStatus = 'provisioning';
});

describe('Subscription screen with no key', () => {
  it('invites a wallet that has simply never asked', () => {
    renderModal();
    expect(screen.getByText(/no plan yet/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /activate free plan/i })).toBeDefined();
  });

  it('says the setup FAILED instead of pretending it never ran', () => {
    ctx.keyStatus = 'failed';
    renderModal();
    expect(screen.queryByText(/no plan yet/i)).toBeNull();
    expect(screen.getByText(/couldn't set up/i)).toBeDefined();
  });

  it('explains that sends are blocked by it, which is the symptom people report', () => {
    ctx.keyStatus = 'failed';
    renderModal();
    expect(screen.getByText(/sending is blocked/i)).toBeDefined();
  });

  it('offers a retry rather than an invitation', () => {
    ctx.keyStatus = 'failed';
    renderModal();
    expect(screen.getByRole('button', { name: /try again/i })).toBeDefined();
  });
});
