/**
 * Watches the live utilization snapshot and, when a previously-paid key comes
 * back as free (the gateway lazily demotes lapsed paid subscriptions — the
 * user gets no error, just silently lower limits), opens the Upgrade modal
 * once with the 'expired' banner. Renders nothing.
 *
 * Fires at most once per downgrade event: `rememberPlan` runs after the check,
 * so the next snapshot compares 'free' → 'free' and stays quiet.
 */
import { useEffect } from 'react';
import { useUtilization } from '../../sdk/hooks/subscription';
import { getStoredSubscriptionKey } from '../../config/storageKeys';
import { SUBSCRIPTION_ENABLED } from '../../config/subscription';
import { getLastKnownPlan, rememberPlan, isPaidToFreeDowngrade } from '../../sdk/subscription/planMemory';
import type { UpgradeReason } from './UpgradeContext';

export function PlanDowngradeWatcher({ openUpgrade }: { openUpgrade: (r?: UpgradeReason) => void }) {
  const util = useUtilization();
  const plan = util.data?.plan;
  const activeUntil = util.data?.activeUntil ?? null;

  useEffect(() => {
    if (!SUBSCRIPTION_ENABLED || !plan) return;
    const apiKey = getStoredSubscriptionKey();
    if (!apiKey) return;

    if (isPaidToFreeDowngrade(getLastKnownPlan(apiKey), plan.name, activeUntil)) {
      openUpgrade('expired');
    }
    rememberPlan(apiKey, plan.name);
  }, [plan, activeUntil, openUpgrade]);

  return null;
}
