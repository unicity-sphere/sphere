/**
 * Pure helpers for rendering plan cards. The SGW plan object only carries
 * planId/name/requestsPerSecond/requestsPerDay/price — the card's feature
 * bullets are DERIVED from those fields (no hardcoded marketing copy), so they
 * never drift from admin-configured plans.
 */
import type { PlanInfo } from '../../services/subscriptionApi';

/** Plan (matched by name, case-insensitive) that gets the "Popular" badge. */
export const POPULAR_PLAN_NAME = 'standard';

export function isPopularPlan(plan: PlanInfo): boolean {
  return plan.name.trim().toLowerCase() === POPULAR_PLAN_NAME;
}

export function isFreePlan(plan: PlanInfo): boolean {
  return !plan.price || plan.price === '0';
}

/**
 * The big price shown on a card. `price` is a decimal string (possibly huge —
 * it can exceed Number range), so group it via BigInt. `"0"`/empty → "Free".
 */
export function formatPlanPrice(price: string): string {
  if (!price || price === '0') return 'Free';
  try {
    return BigInt(price).toLocaleString();
  } catch {
    return price;
  }
}

/** Feature checklist derived purely from the plan's fields. */
export function planFeatures(plan: PlanInfo): string[] {
  return [
    `${plan.requestsPerDay.toLocaleString()} commitments per day`,
    `Up to ${plan.requestsPerSecond.toLocaleString()} commitments per second`,
    isFreePlan(plan) ? 'Free — no payment required' : '30-day subscription',
  ];
}
