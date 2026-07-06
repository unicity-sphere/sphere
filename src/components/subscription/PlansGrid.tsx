/**
 * Responsive grid of plan cards. Auto-fits columns to the available width
 * (1 column on a narrow wallet panel, several side-by-side in a full-screen
 * modal on desktop), regardless of how many plans the SGW returns.
 */
import { PlanCard } from './PlanCard';
import { isPopularPlan } from './planFeatures';
import type { PlanInfo } from '../../services/subscriptionApi';

interface PlansGridProps {
  plans: PlanInfo[];
  /** Name of the wallet's current plan (matched case-insensitively) — utilization exposes no plan id. */
  currentPlanName: string | null;
  /** Provide to make cards selectable (upgrade flow). Omit for an info-only grid. */
  onSelect?: (plan: PlanInfo) => void;
  /** planId currently being processed (shows a spinner on that card's CTA). */
  loadingPlanId?: number | null;
  /** Disable all CTAs (e.g. while another checkout is pending). */
  disabled?: boolean;
}

export function PlansGrid({ plans, currentPlanName, onSelect, loadingPlanId, disabled }: PlansGridProps) {
  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
      {plans.map((plan) => (
        <PlanCard
          key={plan.planId}
          plan={plan}
          current={plan.name.toLowerCase() === (currentPlanName ?? '').toLowerCase()}
          popular={isPopularPlan(plan)}
          onSelect={onSelect}
          loading={loadingPlanId === plan.planId}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
