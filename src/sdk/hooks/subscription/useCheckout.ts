import { useMutation } from '@tanstack/react-query';
import { createStoreCheckout } from '../../../services/subscriptionApi';

export function useCheckout() {
  return useMutation({
    mutationFn: ({ planId, email }: { planId: number; email: string }) => createStoreCheckout(planId, email),
  });
}
