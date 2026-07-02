import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('@/services/subscriptionApi', () => ({
  getPlans: vi.fn(async () => [{ planId: 1, name: 'basic', requestsPerSecond: 5, requestsPerDay: 50000, price: '1000000' }]),
  getUsage: vi.fn(async () => ({ perDay: { limit: 50000, used: 1, remaining: 49999, resetAt: null }, perSecond: { limit: 5, remaining: 5 } })),
  getKeyInfo: vi.fn(async () => ({ status: 'active', expiresAt: null, pricingPlan: null })),
}));
vi.mock('@/config/storageKeys', async (orig) => ({
  ...(await orig<typeof import('@/config/storageKeys')>()),
  getStoredSubscriptionKey: () => 'key_abc',
}));
vi.mock('@/config/subscription', async (orig) => ({
  ...(await orig<typeof import('@/config/subscription')>()),
  SUBSCRIPTION_ENABLED: true,
}));

import { usePlans, useSubscriptionUsage } from '@/sdk/hooks/subscription';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('subscription hooks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('usePlans returns the plan list', async () => {
    const { result } = renderHook(() => usePlans(true), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].name).toBe('basic');
  });

  it('useSubscriptionUsage returns usage for the stored key', async () => {
    const { result } = renderHook(() => useSubscriptionUsage(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.perDay.remaining).toBe(49999);
  });
});
