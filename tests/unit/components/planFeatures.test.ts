import { describe, it, expect } from 'vitest';
import {
  formatPlanPrice,
  isFreePlan,
  isPopularPlan,
  isPlanSelectable,
  planFeatures,
  syntheticCurrentPlan,
} from '@/components/subscription/planFeatures';
import type { PlanInfo } from '@/services/subscriptionApi';

const basic: PlanInfo = {
  planId: 2,
  name: 'basic',
  requestsPerMinute: 300,
  requestsPerDay: 50000,
  priceCents: 500,
  fiatCurrency: 'USD',
};

describe('formatPlanPrice', () => {
  it('formats priceCents as dollars', () => {
    expect(formatPlanPrice(basic)).toBe('$5.00');
    expect(formatPlanPrice({ ...basic, priceCents: 1550 })).toBe('$15.50');
    expect(formatPlanPrice({ ...basic, priceCents: 0 })).toBe('Free');
  });
});

describe('isFreePlan / isPopularPlan', () => {
  it('detects the free plan by priceCents', () => {
    expect(isFreePlan({ ...basic, priceCents: 0 })).toBe(true);
    expect(isFreePlan(basic)).toBe(false);
  });

  it('flags only the standard plan as popular (case-insensitive)', () => {
    expect(isPopularPlan({ ...basic, name: 'Standard' })).toBe(true);
    expect(isPopularPlan({ ...basic, name: 'standard' })).toBe(true);
    expect(isPopularPlan({ ...basic, name: 'premium' })).toBe(false);
  });
});

describe('planFeatures', () => {
  it('derives per-minute feature copy', () => {
    expect(planFeatures(basic)).toEqual([
      '50,000 commitments per day',
      'Up to 300 commitments per minute',
      '30-day subscription',
    ]);
  });

  it('marks the free plan with a no-payment bullet', () => {
    expect(planFeatures({ ...basic, priceCents: 0 })[2]).toBe('Free — no payment required');
  });
});

describe('isPlanSelectable', () => {
  const active = { currentPlanName: 'basic', subscriptionStatus: 'active' as const, paidPlansEnabled: true };

  it('allows buying a different paid plan', () => {
    expect(isPlanSelectable({ ...basic, name: 'premium' }, active)).toBe(true);
  });

  it('blocks re-buying the ACTIVE current plan (nothing to gain — no time carry-over)', () => {
    expect(isPlanSelectable(basic, active)).toBe(false);
    expect(isPlanSelectable({ ...basic, name: 'Basic' }, active)).toBe(false); // case-insensitive
  });

  it('allows renewing the current plan once it is no longer active', () => {
    expect(isPlanSelectable(basic, { ...active, subscriptionStatus: 'expired' })).toBe(true);
    expect(isPlanSelectable(basic, { ...active, subscriptionStatus: 'inactive' })).toBe(true);
    expect(isPlanSelectable(basic, { ...active, subscriptionStatus: null })).toBe(true);
  });

  it('never selects the synthetic/free card (it is not a store product)', () => {
    expect(isPlanSelectable({ ...basic, priceCents: 0 }, { ...active, subscriptionStatus: 'expired' })).toBe(false);
  });

  it('blocks paid plans while purchases are disabled', () => {
    expect(isPlanSelectable({ ...basic, name: 'premium' }, { ...active, paidPlansEnabled: false })).toBe(false);
  });
});

describe('syntheticCurrentPlan', () => {
  it('synthesizes the current free card from utilization', () => {
    const util = {
      status: 'active',
      activeUntil: null,
      plan: { name: 'free', requestsPerMinute: 60, requestsPerDay: 1000 },
      utilization: {},
    } as never;
    expect(syntheticCurrentPlan(util)).toEqual({
      planId: -1,
      name: 'free',
      requestsPerMinute: 60,
      requestsPerDay: 1000,
      priceCents: 0,
      fiatCurrency: 'USD',
    });
  });

  it('returns null when utilization has no plan', () => {
    const util = { status: 'inactive', activeUntil: null, plan: null, utilization: {} } as never;
    expect(syntheticCurrentPlan(util)).toBeNull();
  });
});
