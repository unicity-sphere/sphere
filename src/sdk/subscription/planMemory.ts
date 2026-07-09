/**
 * Remembers the last plan name observed for a subscription key so the wallet
 * can detect the gateway's silent paid→free demotion (a lapsed paid key is
 * lazily demoted to the free tier on its next use — no 401, no 'expired'
 * state survives past the ~60s key cache) and prompt the user once to renew.
 *
 * Slot carries the `sphere_` prefix so `clearAllSphereData()` wipes it with
 * everything else on wallet deletion.
 */
import { STORAGE_KEYS } from '../../config/storageKeys';

const SLOT_PREFIX = `${STORAGE_KEYS.SUBSCRIPTION_API_KEY}.last_plan.`;

export function getLastKnownPlan(apiKey: string): string | null {
  return localStorage.getItem(SLOT_PREFIX + apiKey);
}

export function rememberPlan(apiKey: string, planName: string): void {
  localStorage.setItem(SLOT_PREFIX + apiKey, planName);
}

/**
 * True exactly when a key we previously saw on a PAID plan now reports the
 * free plan with no expiry — the shape the gateway's lazy demotion produces.
 * First observation (no remembered plan) is never a downgrade.
 */
export function isPaidToFreeDowngrade(
  lastPlan: string | null,
  currentPlan: string,
  activeUntil: string | null,
): boolean {
  return (
    lastPlan !== null &&
    lastPlan.toLowerCase() !== 'free' &&
    currentPlan.toLowerCase() === 'free' &&
    activeUntil === null
  );
}
