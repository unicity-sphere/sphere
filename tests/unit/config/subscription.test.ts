import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { STORAGE_KEYS, getStoredSubscriptionKey, setStoredSubscriptionKey } from '@/config/storageKeys';

describe('subscription storage key', () => {
  beforeEach(() => localStorage.clear());

  it('uses the sphere_ prefix', () => {
    expect(STORAGE_KEYS.SUBSCRIPTION_API_KEY).toBe('sphere_subscription_api_key');
  });

  it('round-trips the stored key', () => {
    expect(getStoredSubscriptionKey()).toBeNull();
    setStoredSubscriptionKey('key_abc123');
    expect(getStoredSubscriptionKey()).toBe('key_abc123');
  });
});

// The module reads window.__SPHERE_RUNTIME_CONFIG__ at import time (that's
// how the Docker image swaps values per environment without a rebuild), so
// each case resets the module registry and re-imports.
describe('runtime config global (window.__SPHERE_RUNTIME_CONFIG__)', () => {
  type RuntimeWindow = typeof window & {
    __SPHERE_RUNTIME_CONFIG__?: Record<string, string>;
  };

  afterEach(() => {
    delete (window as RuntimeWindow).__SPHERE_RUNTIME_CONFIG__;
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('runtime values win over build-time env', async () => {
    vi.stubEnv('VITE_SUBSCRIPTION_ENABLED', 'false');
    vi.stubEnv('VITE_PAID_PLANS_ENABLED', 'false');
    vi.stubEnv('VITE_SUBSCRIPTION_API_URL', '/env-sgw');
    (window as RuntimeWindow).__SPHERE_RUNTIME_CONFIG__ = {
      SUBSCRIPTION_ENABLED: 'true',
      PAID_PLANS_ENABLED: 'true',
      SUBSCRIPTION_API_URL: '/runtime-sgw',
    };
    vi.resetModules();
    const cfg = await import('@/config/subscription');
    expect(cfg.SUBSCRIPTION_ENABLED).toBe(true);
    expect(cfg.PAID_PLANS_ENABLED).toBe(true);
    expect(cfg.SUBSCRIPTION_API_URL).toBe('/runtime-sgw');
  });

  it('empty runtime values (unset container env) fall back to build-time env', async () => {
    vi.stubEnv('VITE_SUBSCRIPTION_ENABLED', 'true');
    vi.stubEnv('VITE_PAID_PLANS_ENABLED', ''); // pin: ambient env must not leak in
    (window as RuntimeWindow).__SPHERE_RUNTIME_CONFIG__ = {
      SUBSCRIPTION_ENABLED: '',
      SUBSCRIPTION_API_URL: '',
      PAID_PLANS_ENABLED: '',
    };
    vi.resetModules();
    const cfg = await import('@/config/subscription');
    expect(cfg.SUBSCRIPTION_ENABLED).toBe(true);
    expect(cfg.PAID_PLANS_ENABLED).toBe(false);
  });

  it('only exactly "true" enables the flags', async () => {
    (window as RuntimeWindow).__SPHERE_RUNTIME_CONFIG__ = {
      SUBSCRIPTION_ENABLED: 'TRUE',
      PAID_PLANS_ENABLED: '1',
    };
    vi.resetModules();
    const cfg = await import('@/config/subscription');
    expect(cfg.SUBSCRIPTION_ENABLED).toBe(false);
    expect(cfg.PAID_PLANS_ENABLED).toBe(false);
  });

  it('defaults SUBSCRIPTION_API_URL to /sgw when nothing is set anywhere', async () => {
    vi.stubEnv('VITE_SUBSCRIPTION_API_URL', '');
    vi.resetModules();
    const cfg = await import('@/config/subscription');
    expect(cfg.SUBSCRIPTION_API_URL).toBe('/sgw');
  });
});
