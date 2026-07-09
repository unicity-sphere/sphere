import { describe, it, expect } from 'vitest';
import { resolveOracleApiKey } from '@/sdk/oracleKey';

describe('resolveOracleApiKey', () => {
  it('uses the per-wallet key when enabled and present', () => {
    expect(resolveOracleApiKey({ storedKey: 'key_sub', envKey: 'sk_env', subscriptionEnabled: true })).toBe('key_sub');
  });
  it('IGNORES the env key when subscriptions are on, even with no stored key', () => {
    // The env key must be completely unused while subscriptions are enabled —
    // return undefined (provisioning sets the key before any send), never fall
    // back to VITE_AGGREGATOR_API_KEY.
    expect(resolveOracleApiKey({ storedKey: null, envKey: 'sk_env', subscriptionEnabled: true })).toBeUndefined();
  });
  it('uses the env key when the flag is off (ignoring any stored key)', () => {
    expect(resolveOracleApiKey({ storedKey: 'key_sub', envKey: 'sk_env', subscriptionEnabled: false })).toBe('sk_env');
  });
  it('returns undefined when nothing is available (flag off, no env key)', () => {
    expect(resolveOracleApiKey({ storedKey: null, envKey: undefined, subscriptionEnabled: false })).toBeUndefined();
  });
});
