import { useQuery } from '@tanstack/react-query';
import { getUsage } from '../../../services/subscriptionApi';
import { getStoredSubscriptionKey } from '../../../config/storageKeys';
import { SPHERE_KEYS } from '../../queryKeys';

export function useSubscriptionUsage() {
  const apiKey = getStoredSubscriptionKey();
  return useQuery({
    queryKey: apiKey ? SPHERE_KEYS.subscription.usage(apiKey) : SPHERE_KEYS.subscription.all,
    queryFn: () => getUsage(apiKey as string),
    enabled: !!apiKey,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
