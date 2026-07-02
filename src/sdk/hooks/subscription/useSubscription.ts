import { useQuery } from '@tanstack/react-query';
import { getKeyInfo } from '../../../services/subscriptionApi';
import { getStoredSubscriptionKey } from '../../../config/storageKeys';
import { SPHERE_KEYS } from '../../queryKeys';

export function useSubscription() {
  const apiKey = getStoredSubscriptionKey();
  return useQuery({
    queryKey: apiKey ? SPHERE_KEYS.subscription.key(apiKey) : SPHERE_KEYS.subscription.all,
    queryFn: () => getKeyInfo(apiKey as string),
    enabled: !!apiKey,
    staleTime: 60_000,
  });
}
