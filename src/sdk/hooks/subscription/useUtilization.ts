import { useQuery } from '@tanstack/react-query';
import { getUtilization } from '../../../services/subscriptionApi';
import { getStoredSubscriptionKey } from '../../../config/storageKeys';
import { SPHERE_KEYS } from '../../queryKeys';

/** Single read model for the subscription UI: plan + limits + usage + status. */
export function useUtilization() {
  const apiKey = getStoredSubscriptionKey();
  return useQuery({
    queryKey: apiKey ? SPHERE_KEYS.subscription.utilization(apiKey) : SPHERE_KEYS.subscription.all,
    queryFn: () => getUtilization(apiKey as string),
    enabled: !!apiKey,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
