import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const mockUtilization = {
  status: 'active' as const,
  plan: { name: 'free', requestsPerMinute: 60, requestsPerDay: 1000 },
  activeUntil: null,
  utilization: {
    consumedPerMinute: 1,
    maxPerMinute: 60,
    availablePerMinute: 59,
    utilizationPercentPerMinute: 2,
    consumedPerDay: 10,
    maxPerDay: 1000,
    availablePerDay: 990,
    utilizationPercentPerDay: 1,
  },
};

vi.mock('@/services/subscriptionApi', () => ({
  getUtilization: vi.fn(async () => mockUtilization),
  getStorePlans: vi.fn(async () => [
    { planId: 2, name: 'basic', requestsPerMinute: 300, requestsPerDay: 50000, priceCents: 500, fiatCurrency: 'USD' },
  ]),
  createStoreCheckout: vi.fn(async () => ({ orderId: 'order_1', redirectUrl: 'https://pay.example.test/gateway?token=abc' })),
}));
vi.mock('@/config/subscriptionKeyCache', async (orig) => ({
  ...(await orig<typeof import('@/config/subscriptionKeyCache')>()),
  getStoredSubscriptionKey: vi.fn(),
}));
vi.mock('@/config/subscription', async (orig) => ({
  ...(await orig<typeof import('@/config/subscription')>()),
  SUBSCRIPTION_ENABLED: true,
}));

import { usePlans, useUtilization, useCheckout } from '@/sdk/hooks/subscription';
import { getStorePlans, createStoreCheckout } from '@/services/subscriptionApi';
import { getStoredSubscriptionKey } from '@/config/subscriptionKeyCache';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('subscription hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStoredSubscriptionKey).mockReturnValue(null);
  });

  it('usePlans returns the plan list', async () => {
    const { result } = renderHook(() => usePlans(true), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].name).toBe('basic');
  });

  it('usePlans stays disabled when the flag is false', () => {
    const { result } = renderHook(() => usePlans(false), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(getStorePlans).not.toHaveBeenCalled();
  });

  it('useUtilization is disabled without a stored key', () => {
    const { result } = renderHook(() => useUtilization(), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.isSuccess).toBe(false);
  });

  it('useUtilization returns data for the stored key', async () => {
    vi.mocked(getStoredSubscriptionKey).mockReturnValue('key_abc');
    const { result } = renderHook(() => useUtilization(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.utilization.consumedPerDay).toBe(10);
  });

  it('useCheckout posts {planId, email} without an upgrade key', async () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    result.current.mutate({ planId: 3, email: 'a@b.com' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(createStoreCheckout).toHaveBeenCalledWith(3, 'a@b.com', undefined);
  });

  it('useCheckout forwards the upgrade key for in-place upgrades', async () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    result.current.mutate({ planId: 3, email: 'a@b.com', upgradeApiKey: 'sk_current' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(createStoreCheckout).toHaveBeenCalledWith(3, 'a@b.com', 'sk_current');
  });
});
