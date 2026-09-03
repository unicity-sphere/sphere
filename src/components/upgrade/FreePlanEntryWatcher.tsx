/**
 * Offers the plan line-up on the way into the wallet while the wallet is on
 * the FREE plan (sphere#496): a user who skipped the upgrade during onboarding
 * meets the same screen — the same component — when they come back. A wallet
 * already on a paid plan is never interrupted.
 *
 * Fires at most once per app load; the gate lives in freePlanEntryOffer.ts.
 */
import { useEffect } from 'react';
import { useUtilization } from '../../sdk/hooks/subscription';
import { useSphereContext } from '../../sdk/hooks/core/useSphere';
import { getStoredSubscriptionKey } from '../../config/storageKeys';
import { SUBSCRIPTION_ENABLED, PAID_PLANS_ENABLED } from '../../config/subscription';
import { isFreePlanName } from '../subscription/planFeatures';
import { freePlanEntryOffered, markFreePlanEntryOffered } from './freePlanEntryOffer';
import type { UpgradeReason } from './UpgradeContext';

export function FreePlanEntryWatcher({ openUpgrade }: { openUpgrade: (r?: UpgradeReason) => void }) {
  const { walletExists, isLocked } = useSphereContext();
  const util = useUtilization();
  const planName = util.data?.plan?.name ?? null;

  useEffect(() => {
    // Nothing to sell with the store off — and never over onboarding or the
    // lock screen, which own the viewport until the wallet is really open.
    if (!SUBSCRIPTION_ENABLED || !PAID_PLANS_ENABLED) return;
    if (!walletExists || isLocked || freePlanEntryOffered()) return;
    if (!getStoredSubscriptionKey()) return; // no key yet → nothing to upgrade
    if (!isFreePlanName(planName)) return; // paid (or unknown) → straight in
    markFreePlanEntryOffered();
    openUpgrade('entry');
  }, [walletExists, isLocked, planName, openUpgrade]);

  return null;
}
