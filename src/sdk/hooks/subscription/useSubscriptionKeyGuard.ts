import { useCallback } from 'react';
import { useSphereContext } from '../core/useSphere';
import { isSubscriptionKeyReady, SubscriptionNotReadyError } from '../../subscription/keyStatus';
import { SUBSCRIPTION_ENABLED } from '../../../config/subscription';

export interface SubscriptionKeyGuard {
  /** True when a money op may proceed (subscriptions off, or the key is on the oracle). */
  readonly ready: boolean;
  /** Throws `SubscriptionNotReadyError` when not `ready` — for throw-style callers. */
  readonly assertReady: () => void;
}

/**
 * Single readiness guard for every L3 money operation (send / pay / mint) while
 * subscriptions are on: until the per-wallet key is on the LIVE oracle, a
 * `certification_request` would go out keyless (→ 401, surfacing as a false
 * "delivery pending"). One source of truth for every certification entry point
 * (see issue #419).
 *
 * Two consumption modes so each caller stays idiomatic:
 * - `assertReady()` throws (useTransfer / payPaymentRequest / self-mint — the
 *   surrounding error UI surfaces the message);
 * - `ready` for callers that reject gracefully instead of throwing (a dApp
 *   Connect intent replies with `rejectIntent`).
 */
export function useSubscriptionKeyGuard(): SubscriptionKeyGuard {
  const { subscriptionKeyStatus } = useSphereContext();
  const ready = !SUBSCRIPTION_ENABLED || isSubscriptionKeyReady(subscriptionKeyStatus);
  const assertReady = useCallback(() => {
    if (!ready) {
      throw new SubscriptionNotReadyError(
        subscriptionKeyStatus === 'failed' ? 'failed' : 'provisioning',
      );
    }
  }, [ready, subscriptionKeyStatus]);
  return { ready, assertReady };
}
