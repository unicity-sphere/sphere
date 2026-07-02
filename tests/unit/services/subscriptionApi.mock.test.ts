import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/config/subscription', async (orig) => ({
  ...(await orig<typeof import('@/config/subscription')>()),
  SUBSCRIPTION_MOCK: true,
}));

import { getPlans, getUsage } from '@/services/subscriptionApi';

describe('subscriptionApi mock mode', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns canned plans without calling fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const plans = await getPlans();
    expect(plans.length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns canned usage without calling fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const usage = await getUsage('key_mock');
    expect(usage.perDay.limit).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
