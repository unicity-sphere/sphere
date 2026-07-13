import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/config/subscription', async (orig) => ({
  ...(await orig<typeof import('@/config/subscription')>()),
  SUBSCRIPTION_MOCK: true,
}));

import {
  provisionOrRecoverKey,
  getUtilization,
  getStorePlans,
  createStoreCheckout,
  getOrderStatus,
  ackOrderKeyDelivery,
  getKeyInfo,
} from '@/services/subscriptionApi';

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

  it('returns canned store plans (new PlanInfo shape) without calling fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const plans = await getStorePlans();

    expect(plans.length).toBeGreaterThan(0);
    for (const plan of plans) {
      expect(typeof plan.planId).toBe('number');
      expect(typeof plan.requestsPerMinute).toBe('number');
      expect(typeof plan.priceCents).toBe('number');
      expect(typeof plan.fiatCurrency).toBe('string');
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a canned checkout result (orderId/redirectUrl) without calling fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const checkout = await createStoreCheckout(2, 'a@b.c');

    expect(typeof checkout.orderId).toBe('string');
    expect(typeof checkout.redirectUrl).toBe('string');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a canned order status without calling fetch (new ack contract — no keyShownOnce)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const status = await getOrderStatus('ssc-mock');

    expect(status.status).toBe('paid');
    expect(status.fulfilled).toBe(true);
    expect(status).not.toHaveProperty('keyShownOnce');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('acks key delivery without calling fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(ackOrderKeyDelivery('ssc-mock')).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns canned key info without calling fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const info = await getKeyInfo('sk_mock_free');

    expect(info).not.toBeNull();
    expect(info?.maskedKey).toMatch(/^sk_\.\.\./);
    expect(['active', 'expired', 'inactive']).toContain(info?.subscriptionState);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
