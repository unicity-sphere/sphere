import { describe, it, expect } from 'vitest';
import { resolveOracleApiKey } from '@/sdk/oracleKey';

describe('resolveOracleApiKey', () => {
  it('uses the per-wallet key when enabled and present', () => {
    expect(resolveOracleApiKey({ storedKey: 'key_sub', envKey: 'sk_env', subscriptionEnabled: true })).toBe('key_sub');
  });
  it('falls back to the env key when no stored key', () => {
    expect(resolveOracleApiKey({ storedKey: null, envKey: 'sk_env', subscriptionEnabled: true })).toBe('sk_env');
  });
  it('ignores the stored key when the flag is off', () => {
    expect(resolveOracleApiKey({ storedKey: 'key_sub', envKey: 'sk_env', subscriptionEnabled: false })).toBe('sk_env');
  });
  it('returns undefined when nothing is available', () => {
    expect(resolveOracleApiKey({ storedKey: null, envKey: undefined, subscriptionEnabled: true })).toBeUndefined();
  });
});
