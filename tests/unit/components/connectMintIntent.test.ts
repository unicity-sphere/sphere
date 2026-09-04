import { describe, it, expect } from 'vitest';
import { validateIntent } from '../../../src/components/connect/intentValidation';

/**
 * Minting through a dApp is the USER's authority, not a network capability.
 *
 * A subscriber pays for a gateway key; what they mint with it — data, types,
 * asset ids — is their business, and the registry is Sphere-focused
 * standardisation rather than a rule. So the intent must reach the permission
 * machinery (the `mint:request` scope plus an explicit, network-scoped
 * approval) instead of being refused as unsupported before any modal appears.
 *
 * The gate this replaces had NO test, which is why removing it broke nothing.
 * Its absence is pinned here deliberately.
 */
describe('the mint intent is not gated on the network', () => {
  const params = { coinId: 'aa'.repeat(32), amount: '1000' };

  it('accepts a mint intent — mainnet included', () => {
    expect(validateIntent('mint', params)).toBeNull();
  });

  it('still refuses an intent this wallet genuinely does not implement', () => {
    // The guard that IS about capability must keep working.
    const err = validateIntent('teleport', params);
    expect(err).not.toBeNull();
    expect(err?.message).toMatch(/not supported/i);
  });
});
