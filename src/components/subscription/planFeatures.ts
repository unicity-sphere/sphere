/**
 * Pure helpers for rendering plan cards. The store's plan object only carries
 * planId/name/requestsPerMinute/requestsPerDay/priceCents/fiatCurrency — the
 * card's feature bullets are DERIVED from those fields (no hardcoded marketing
 * copy), so they never drift from admin-configured plans.
 */
import type { PlanInfo, UtilizationInfo } from '../../services/subscriptionApi';

/** Plan (matched by name, case-insensitive) that gets the "Popular" badge. */
export const POPULAR_PLAN_NAME = 'standard';

export function isPopularPlan(plan: PlanInfo): boolean {
  return plan.name.trim().toLowerCase() === POPULAR_PLAN_NAME;
}

export function isFreePlan(plan: PlanInfo): boolean {
  return plan.priceCents <= 0;
}

/** Card price from the store's fiat cents: 500 → "$5.00"; 0 → "Free". */
export function formatPlanPrice(plan: PlanInfo): string {
  if (plan.priceCents <= 0) return 'Free';
  return `$${(plan.priceCents / 100).toFixed(2)}`;
}

/** Feature checklist derived purely from the plan's fields. */
export function planFeatures(plan: PlanInfo): string[] {
  return [
    `${plan.requestsPerDay.toLocaleString()} commitments per day`,
    `Up to ${plan.requestsPerMinute.toLocaleString()} commitments per minute`,
    isFreePlan(plan) ? 'Free — no payment required' : '30-day subscription',
  ];
}

/**
 * Whether a plan card is a valid purchase target right now. The synthetic
 * current card (priceCents 0) is informational only. Re-buying the current
 * plan is blocked while it's ACTIVE — the gateway resets the window to
 * now+30d with no time carry-over, so an early re-buy only loses time — but
 * allowed once the subscription lapses ('expired'/'inactive'/unknown): that
 * is the renew path (same key, fresh 30 days).
 */
export function isPlanSelectable(
  plan: PlanInfo,
  opts: {
    currentPlanName: string | null;
    subscriptionStatus: 'active' | 'expired' | 'inactive' | null;
    paidPlansEnabled: boolean;
  },
): boolean {
  if (plan.priceCents <= 0) return false;
  if (!opts.paidPlansEnabled) return false;
  const isCurrent = plan.name.toLowerCase() === (opts.currentPlanName ?? '').toLowerCase();
  return !(isCurrent && opts.subscriptionStatus === 'active');
}

/**
 * The store list excludes the free plan, so the user's current (free) plan card
 * is synthesized from utilization data. planId -1 is never a store id.
 */
export function syntheticCurrentPlan(util: UtilizationInfo): PlanInfo | null {
  if (!util.plan) return null;
  return {
    planId: -1,
    name: util.plan.name,
    requestsPerMinute: util.plan.requestsPerMinute,
    requestsPerDay: util.plan.requestsPerDay,
    priceCents: 0,
    fiatCurrency: 'USD',
  };
}
