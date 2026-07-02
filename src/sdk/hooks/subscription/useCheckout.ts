import { useMutation } from '@tanstack/react-query';
import { createCheckout } from '../../../services/subscriptionApi';
import { getStoredSubscriptionKey } from '../../../config/storageKeys';

export function useCheckout() {
  return useMutation({
    mutationFn: ({ targetPlanId, returnUrl }: { targetPlanId: number; returnUrl?: string }) => {
      const apiKey = getStoredSubscriptionKey();
      if (!apiKey) throw new Error('No subscription key to upgrade');
      return createCheckout(apiKey, targetPlanId, returnUrl);
    },
  });
}
