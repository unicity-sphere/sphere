import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { UtilizationInfo } from '@/services/subscriptionApi';

vi.mock('@/services/subscriptionApi', () => ({
  getUtilization: vi.fn(),
}));
vi.mock('@/config/storageKeys', async (orig) => ({
  ...(await orig<typeof import('@/config/storageKeys')>()),
  getStoredSubscriptionKey: vi.fn(),
}));
vi.mock('@/config/subscription', async (orig) => ({
  ...(await orig<typeof import('@/config/subscription')>()),
  SUBSCRIPTION_ENABLED: true,
  SUBSCRIPTION_MOCK: false,
}));

import { checkSendQuota, QuotaBlockedError, SEND_OPS_HEADROOM } from '@/sdk/quotaGate';
import { getUtilization } from '@/services/subscriptionApi';
import { getStoredSubscriptionKey } from '@/config/storageKeys';
import * as subscriptionConfig from '@/config/subscription';

function utilization(overrides: {
  status?: UtilizationInfo['status'];
  availablePerMinute?: number;
  availablePerDay?: number;
}): UtilizationInfo {
  return {
    status: overrides.status ?? 'active',
    plan: { name: 'free', requestsPerMinute: 60, requestsPerDay: 1000 },
    activeUntil: null,
    utilization: {
      consumedPerMinute: 0,
      maxPerMinute: 60,
      availablePerMinute: overrides.availablePerMinute ?? 60,
      utilizationPercentPerMinute: 0,
      consumedPerDay: 0,
      maxPerDay: 1000,
      availablePerDay: overrides.availablePerDay ?? 1000,
      utilizationPercentPerDay: 0,
    },
  };
}

describe('checkSendQuota', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStoredSubscriptionKey).mockReturnValue('key_abc');
    (subscriptionConfig as { SUBSCRIPTION_ENABLED: boolean }).SUBSCRIPTION_ENABLED = true;
    (subscriptionConfig as { SUBSCRIPTION_MOCK: boolean }).SUBSCRIPTION_MOCK = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fails open when the flag is off', async () => {
    (subscriptionConfig as { SUBSCRIPTION_ENABLED: boolean }).SUBSCRIPTION_ENABLED = false;
    const result = await checkSendQuota();
    expect(result).toEqual({ verdict: 'allow' });
    expect(getUtilization).not.toHaveBeenCalled();
  });

  it('fails open in mock mode', async () => {
    (subscriptionConfig as { SUBSCRIPTION_MOCK: boolean }).SUBSCRIPTION_MOCK = true;
    const result = await checkSendQuota();
    expect(result).toEqual({ verdict: 'allow' });
    expect(getUtilization).not.toHaveBeenCalled();
  });

  it('fails open when there is no stored key', async () => {
    vi.mocked(getStoredSubscriptionKey).mockReturnValue(null);
    const result = await checkSendQuota();
    expect(result).toEqual({ verdict: 'allow' });
    expect(getUtilization).not.toHaveBeenCalled();
  });

  it('fails open when getUtilization throws', async () => {
    vi.mocked(getUtilization).mockRejectedValue(new Error('network error'));
    const result = await checkSendQuota();
    expect(result).toEqual({ verdict: 'allow' });
  });

  it('fails open on timeout', async () => {
    vi.useFakeTimers();
    vi.mocked(getUtilization).mockReturnValue(new Promise<UtilizationInfo>(() => {})); // never resolves
    const pending = checkSendQuota({ timeoutMs: 100 });
    await vi.advanceTimersByTimeAsync(100);
    const result = await pending;
    expect(result).toEqual({ verdict: 'allow' });
  });

  it('blocks with reason "expired" when status is expired', async () => {
    const info = utilization({ status: 'expired' });
    vi.mocked(getUtilization).mockResolvedValue(info);
    const result = await checkSendQuota();
    expect(result).toEqual({ verdict: 'block', info });
  });

  it('blocks with reason "exhausted" when availablePerMinute is 0', async () => {
    const info = utilization({ availablePerMinute: 0 });
    vi.mocked(getUtilization).mockResolvedValue(info);
    const result = await checkSendQuota();
    expect(result).toEqual({ verdict: 'block', info });
  });

  it('blocks with reason "exhausted" when availablePerDay is 0', async () => {
    const info = utilization({ availablePerDay: 0 });
    vi.mocked(getUtilization).mockResolvedValue(info);
    const result = await checkSendQuota();
    expect(result).toEqual({ verdict: 'block', info });
  });

  it('warns when availablePerMinute is under the headroom constant', async () => {
    const info = utilization({ availablePerMinute: 5 });
    expect(5).toBeLessThan(SEND_OPS_HEADROOM);
    vi.mocked(getUtilization).mockResolvedValue(info);
    const result = await checkSendQuota();
    expect(result).toEqual({ verdict: 'warn', info });
  });

  it('allows with info when healthy', async () => {
    const info = utilization({ availablePerMinute: 60, availablePerDay: 1000 });
    vi.mocked(getUtilization).mockResolvedValue(info);
    const result = await checkSendQuota();
    expect(result).toEqual({ verdict: 'allow', info });
  });

  it('allows plan-less (inactive) keys without blocking', async () => {
    const info = utilization({ status: 'inactive', availablePerMinute: 0, availablePerDay: 0 });
    vi.mocked(getUtilization).mockResolvedValue(info);
    const result = await checkSendQuota();
    expect(result.verdict).toBe('allow');
  });
});

describe('QuotaBlockedError', () => {
  it('carries reason "expired" and the triggering info', () => {
    const info = utilization({ status: 'expired' });
    const err = new QuotaBlockedError(info);
    expect(err).toBeInstanceOf(Error);
    expect(err.reason).toBe('expired');
    expect(err.info).toBe(info);
  });

  it('carries reason "exhausted" for a non-expired, quota-depleted info', () => {
    const info = utilization({ availablePerMinute: 0 });
    const err = new QuotaBlockedError(info);
    expect(err.reason).toBe('exhausted');
    expect(err.info).toBe(info);
  });
});
