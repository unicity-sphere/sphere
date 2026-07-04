import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/config/subscription', async (orig) => ({
  ...(await orig<typeof import('@/config/subscription')>()),
  SUBSCRIPTION_MOCK: true,
}));

import { provisionOrRecoverKey, getUtilization } from '@/services/subscriptionApi';

describe('subscriptionApi mock mode', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns a canned provision result without calling fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const sphere = {
      identity: { chainPubkey: '02aa'.padEnd(66, 'b') },
      signMessage: vi.fn(),
    } as unknown as import('@unicitylabs/sphere-sdk').Sphere;

    const result = await provisionOrRecoverKey(sphere);

    expect(result.plan).toBe('free');
    expect(typeof result.plan).toBe('string');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns canned utilization without calling fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const utilization = await getUtilization('key_mock');

    expect(utilization.plan?.name).toBe('free');
    expect(utilization.utilization.maxPerDay).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
