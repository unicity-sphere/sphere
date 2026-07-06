import { describe, it, expect, beforeEach } from 'vitest';
import { getLastKnownPlan, rememberPlan, isPaidToFreeDowngrade } from '@/sdk/subscription/planMemory';

describe('planMemory', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips the last known plan per key', () => {
    expect(getLastKnownPlan('sk_a')).toBeNull();
    rememberPlan('sk_a', 'standard');
    rememberPlan('sk_b', 'free');
    expect(getLastKnownPlan('sk_a')).toBe('standard');
    expect(getLastKnownPlan('sk_b')).toBe('free');
  });

  it('uses a sphere_-prefixed slot (wiped by clearAllSphereData)', () => {
    rememberPlan('sk_a', 'basic');
    const keys = Object.keys(localStorage);
    expect(keys.some((k) => k.startsWith('sphere_') && k.includes('sk_a'))).toBe(true);
  });
});

describe('isPaidToFreeDowngrade', () => {
  it('detects paid → free with cleared expiry (the gateway demotion shape)', () => {
    expect(isPaidToFreeDowngrade('standard', 'free', null)).toBe(true);
    expect(isPaidToFreeDowngrade('Premium', 'FREE', null)).toBe(true); // case-insensitive
  });

  it('never fires on first observation (nothing remembered)', () => {
    expect(isPaidToFreeDowngrade(null, 'free', null)).toBe(false);
  });

  it('never fires for free → free or paid → paid', () => {
    expect(isPaidToFreeDowngrade('free', 'free', null)).toBe(false);
    expect(isPaidToFreeDowngrade('basic', 'standard', '2026-08-01T00:00:00Z')).toBe(false);
  });

  it('never fires when the free plan still carries an expiry (not the demotion shape)', () => {
    expect(isPaidToFreeDowngrade('basic', 'free', '2026-08-01T00:00:00Z')).toBe(false);
  });
});
