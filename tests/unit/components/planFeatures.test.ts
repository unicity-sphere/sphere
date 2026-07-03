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

describe('formatPlanPrice (USD)', () => {
  it('renders USD from priceUsd', () => {
    expect(formatPlanPrice(plan({ priceUsd: '9.99' }))).toBe('$9.99');
    expect(formatPlanPrice(plan({ priceUsd: '4' }))).toBe('$4.00');
    expect(formatPlanPrice(plan({ priceUsd: '29.9' }))).toBe('$29.90');
  });
  it('renders "Free" for a zero/absent USD price', () => {
    expect(formatPlanPrice(plan({ priceUsd: '0' }))).toBe('Free');
    expect(formatPlanPrice(plan({ priceUsd: '', price: '0' }))).toBe('Free');
  });
  it('falls back to the legacy integer price only when priceUsd is absent', () => {
    expect(formatPlanPrice(plan({ priceUsd: undefined, price: '10000000' }))).toBe((10_000_000).toLocaleString());
    expect(formatPlanPrice(plan({ priceUsd: undefined, price: '0' }))).toBe('Free');
  });
});

describe('isFreePlan / isPopularPlan', () => {
  it('detects the free plan by USD price (with legacy fallback)', () => {
    expect(isFreePlan(plan({ priceUsd: '0' }))).toBe(true);
    expect(isFreePlan(plan({ priceUsd: '9.99' }))).toBe(false);
    expect(isFreePlan(plan({ priceUsd: undefined, price: '0' }))).toBe(true);
    expect(isFreePlan(plan({ priceUsd: undefined, price: '1000000' }))).toBe(false);
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
