import { useQuery } from '@tanstack/react-query';
import { getUtilization } from '../../../services/subscriptionApi';
import { getStoredSubscriptionKey } from '../../../config/subscriptionKeyCache';
import { SUBSCRIPTION_ENABLED } from '../../../config/subscription';
import { SPHERE_KEYS } from '../../queryKeys';

/** Single read model for the subscription UI: plan + limits + usage + status. */
export function useUtilization() {
  const apiKey = getStoredSubscriptionKey();
  return useQuery({
    queryKey: apiKey ? SPHERE_KEYS.subscription.utilization(apiKey) : SPHERE_KEYS.subscription.all,
    queryFn: () => getUtilization(apiKey as string),
    // Gate on the feature flag (like usePlans): a leftover key from a
    // previously-enabled deploy must not keep the SGW polled every 30s once
    // the flag is turned off — the feature ships dormant.
    enabled: !!apiKey && SUBSCRIPTION_ENABLED,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
