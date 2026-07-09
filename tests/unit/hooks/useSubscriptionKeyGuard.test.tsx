import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { SubscriptionKeyStatus } from '@/sdk/subscription/keyStatus';

// The guard reads subscriptionKeyStatus from context and SUBSCRIPTION_ENABLED
// from config — both swappable per test.
let subscriptionKeyStatus: SubscriptionKeyStatus = 'ready';
vi.mock('@/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ subscriptionKeyStatus }),
}));
vi.mock('@/config/subscription', async (orig) => ({
  ...(await orig<typeof import('@/config/subscription')>()),
  SUBSCRIPTION_ENABLED: true,
}));

import { useSubscriptionKeyGuard } from '@/sdk/hooks/subscription/useSubscriptionKeyGuard';
import { SubscriptionNotReadyError } from '@/sdk/subscription/keyStatus';
import * as subscriptionConfig from '@/config/subscription';

beforeEach(() => {
  subscriptionKeyStatus = 'ready';
  (subscriptionConfig as { SUBSCRIPTION_ENABLED: boolean }).SUBSCRIPTION_ENABLED = true;
});

describe('useSubscriptionKeyGuard — the single money-op readiness gate', () => {
  it('ready + assertReady is a no-op when the key is on the oracle', () => {
    subscriptionKeyStatus = 'ready';
    const { result } = renderHook(() => useSubscriptionKeyGuard());
    expect(result.current.ready).toBe(true);
    expect(() => result.current.assertReady()).not.toThrow();
  });

  it('blocks while provisioning: ready=false, assertReady throws SubscriptionNotReadyError', () => {
    subscriptionKeyStatus = 'provisioning';
    const { result } = renderHook(() => useSubscriptionKeyGuard());
    expect(result.current.ready).toBe(false);
    expect(() => result.current.assertReady()).toThrow(SubscriptionNotReadyError);
  });

  it('failed provisioning → assertReady throws with status "failed" (reload hint)', () => {
    subscriptionKeyStatus = 'failed';
    const { result } = renderHook(() => useSubscriptionKeyGuard());
    let err: unknown;
    try {
      result.current.assertReady();
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(SubscriptionNotReadyError);
    expect((err as SubscriptionNotReadyError).status).toBe('failed');
    expect(result.current.ready).toBe(false);
  });

  it('subscriptions off → always ready, never gates (env-key mode)', () => {
    (subscriptionConfig as { SUBSCRIPTION_ENABLED: boolean }).SUBSCRIPTION_ENABLED = false;
    subscriptionKeyStatus = 'provisioning';
    const { result } = renderHook(() => useSubscriptionKeyGuard());
    expect(result.current.ready).toBe(true);
    expect(() => result.current.assertReady()).not.toThrow();
  });
});
