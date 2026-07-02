import { useQuery } from '@tanstack/react-query';
import { getPlans } from '../../../services/subscriptionApi';
import { SPHERE_KEYS } from '../../queryKeys';

export function usePlans() {
  return useQuery({
    queryKey: SPHERE_KEYS.subscription.plans,
    queryFn: getPlans,
    staleTime: 5 * 60_000,
  });
}
