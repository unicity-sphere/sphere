import { describe, it, expect } from 'vitest';
import { resolveCheckoutOutcome } from '@/sdk/subscription/checkoutOutcome';

describe('resolveCheckoutOutcome', () => {
  it('maps an in-place upgrade to "upgraded" (never adopts, even if a key sneaks in)', () => {
    expect(
      resolveCheckoutOutcome({ outcome: 'paid', upgrade: true, maskedKey: 'sk_...abcd', planName: 'premium' }),
    ).toEqual({ kind: 'upgraded', maskedKey: 'sk_...abcd', planName: 'premium' });
  });

  it('maps a fresh-key purchase to "adopt"', () => {
    expect(resolveCheckoutOutcome({ outcome: 'paid', apiKey: 'sk_new', upgrade: false })).toEqual({
      kind: 'adopt',
      apiKey: 'sk_new',
    });
  });

  it('maps paid-without-key (pre-ack gateway consumed the reveal) to the claim fallback', () => {
    expect(resolveCheckoutOutcome({ outcome: 'paid', upgrade: false })).toEqual({ kind: 'claim' });
  });

  it('passes terminal outcomes through', () => {
    expect(resolveCheckoutOutcome({ outcome: 'failed' })).toEqual({ kind: 'failed' });
    expect(resolveCheckoutOutcome({ outcome: 'timeout' })).toEqual({ kind: 'timeout' });
    expect(resolveCheckoutOutcome({ outcome: 'cancelled' })).toEqual({ kind: 'cancelled' });
  });
});
