import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSphereContext } from '../core/useSphere';
import { SPHERE_KEYS } from '../../queryKeys';
import type { TransferResult } from '@unicitylabs/sphere-sdk';

export interface TransferParams {
  coinId: string;
  amount: string;
  recipient: string;
  memo?: string;
}

export interface UseTransferReturn {
  transfer: (params: TransferParams) => Promise<TransferResult>;
  isLoading: boolean;
  error: Error | null;
  lastResult: TransferResult | null;
  reset: () => void;
}

export function useTransfer(): UseTransferReturn {
  const { adapter } = useSphereContext();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: TransferParams): Promise<TransferResult> => {
      if (!adapter) throw new Error('Wallet not initialized');
      return adapter.send({
        coinId: params.coinId,
        amount: params.amount,
        recipient: params.recipient,
        memo: params.memo,
      });
    },
    onSuccess: () => {
      // Force refetch all payment queries with fresh data.
      // Use refetchQueries (not invalidateQueries) to guarantee a new fetch
      // even if a previous refetch from the transfer:confirmed event is in-flight.
      queryClient.refetchQueries({ queryKey: SPHERE_KEYS.payments.tokens.all });
      queryClient.refetchQueries({ queryKey: SPHERE_KEYS.payments.balance.all });
      queryClient.refetchQueries({ queryKey: SPHERE_KEYS.payments.assets.all });
      queryClient.refetchQueries({ queryKey: SPHERE_KEYS.payments.transactions.all });
    },
    // onError inherited from global QueryClient handler → auto-toast
  });

  return {
    transfer: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    lastResult: mutation.data ?? null,
    reset: mutation.reset,
  };
}
