import { useQuery } from '@tanstack/react-query';
import { getStorePlans } from '../../../services/subscriptionApi';
import { SPHERE_KEYS } from '../../queryKeys';
import { SUBSCRIPTION_ENABLED } from '../../../config/subscription';

export function usePlans(enabled: boolean = false) {
  return useQuery({
    queryKey: SPHERE_KEYS.subscription.plans,
    queryFn: getStorePlans,
    enabled: enabled && SUBSCRIPTION_ENABLED,
    staleTime: 5 * 60_000,
  });
}
