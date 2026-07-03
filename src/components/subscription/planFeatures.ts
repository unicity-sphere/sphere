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
  if (plan.priceUsd != null && plan.priceUsd !== '') {
    const n = Number(plan.priceUsd);
    return !Number.isFinite(n) || n <= 0;
  }
  return !plan.price || plan.price === '0';
}

/**
 * The big price shown on a card, in USD ("$9.99"), from `priceUsd`. `"0"`/absent
 * → "Free". Falls back to the legacy on-chain `price` (grouped integer) only if
 * the backend hasn't populated `priceUsd` yet — see docs/subscription-integration-handoff.md.
 */
export function formatPlanPrice(plan: PlanInfo): string {
  if (plan.priceUsd != null && plan.priceUsd !== '') {
    const n = Number(plan.priceUsd);
    if (!Number.isFinite(n) || n <= 0) return 'Free';
    return `$${n.toFixed(2)}`;
  }
  // Fallback until the backend adds priceUsd: legacy integer price (UCT units).
  if (!plan.price || plan.price === '0') return 'Free';
  try {
    return BigInt(plan.price).toLocaleString();
  } catch {
    return plan.price;
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
