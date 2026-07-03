import { describe, it, expect } from 'vitest';
import { formatPlanPrice, planFeatures, isPopularPlan, isFreePlan } from '@/components/subscription/planFeatures';
import type { PlanInfo } from '@/services/subscriptionApi';

const plan = (over: Partial<PlanInfo>): PlanInfo => ({
  planId: 1,
  name: 'basic',
  requestsPerSecond: 5,
  requestsPerDay: 50000,
  price: '1000000',
  ...over,
});

describe('formatPlanPrice', () => {
  it('renders "Free" for zero/empty', () => {
    expect(formatPlanPrice('0')).toBe('Free');
    expect(formatPlanPrice('')).toBe('Free');
  });
  it('groups big decimal-string amounts (beyond Number range)', () => {
    expect(formatPlanPrice('10000000')).toBe((10_000_000).toLocaleString());
    expect(formatPlanPrice('123456789012345678901234567890')).toBe(
      BigInt('123456789012345678901234567890').toLocaleString(),
    );
  });
  it('falls back to the raw string on a non-numeric value', () => {
    expect(formatPlanPrice('abc')).toBe('abc');
  });
});

describe('isFreePlan / isPopularPlan', () => {
  it('detects the free plan by price', () => {
    expect(isFreePlan(plan({ price: '0' }))).toBe(true);
    expect(isFreePlan(plan({ price: '1000000' }))).toBe(false);
  });
  it('flags only the standard plan as popular (case-insensitive)', () => {
    expect(isPopularPlan(plan({ name: 'Standard' }))).toBe(true);
    expect(isPopularPlan(plan({ name: 'standard' }))).toBe(true);
    expect(isPopularPlan(plan({ name: 'premium' }))).toBe(false);
  });
});

describe('planFeatures', () => {
  it('derives commitments-based bullets from plan fields', () => {
    const f = planFeatures(plan({ requestsPerDay: 50000, requestsPerSecond: 5, price: '1000000' }));
    expect(f[0]).toBe(`${(50000).toLocaleString()} commitments per day`);
    expect(f[1]).toBe('Up to 5 commitments per second');
    expect(f[2]).toBe('30-day subscription');
  });
  it('marks the free plan with a no-payment bullet', () => {
    expect(planFeatures(plan({ price: '0' }))[2]).toBe('Free — no payment required');
  });
});
