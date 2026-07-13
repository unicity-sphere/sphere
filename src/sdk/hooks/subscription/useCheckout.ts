import { useMutation } from '@tanstack/react-query';
import { createStoreCheckout } from '../../../services/subscriptionApi';

export function useCheckout() {
  return useMutation({
    mutationFn: ({ planId, email, upgradeApiKey }: { planId: number; email: string; upgradeApiKey?: string }) =>
      createStoreCheckout(planId, email, upgradeApiKey),
  });
}
