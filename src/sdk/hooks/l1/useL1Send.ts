import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSphereContext } from '../core/useSphere';
import { SPHERE_KEYS } from '../../queryKeys';

export interface L1SendParams {
  toAddress: string;
  amount: string;
  feeRate?: number;
  useVested?: boolean;
}

export interface L1SendResult {
  txHash: string;
  fee: string;
}

export interface L1FeeEstimate {
  fee: string;
  feeRate: number;
}

export interface L1ResolvedAddress {
  address: string;
  nametag?: string;
}

export interface UseL1SendReturn {
  send: (params: L1SendParams) => Promise<L1SendResult>;
  estimateFee: (to: string, amountSats: string) => Promise<L1FeeEstimate>;
  resolveAddress: (destination: string) => Promise<L1ResolvedAddress>;
  isLoading: boolean;
  error: Error | null;
  lastResult: L1SendResult | null;
}

export function useL1Send(): UseL1SendReturn {
  const { adapter } = useSphereContext();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: L1SendParams): Promise<L1SendResult> => {
      if (!adapter) throw new Error('Wallet not initialized');

      const result = await adapter.l1Send({
        to: params.toAddress,
        amount: params.amount,
        feeRate: params.feeRate,
        useVested: params.useVested,
      });

      if (!result.success) {
        throw new Error(result.error ?? 'L1 send failed');
      }

      return {
        txHash: result.txHash ?? '',
        fee: result.fee ?? '0',
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.l1.all });
    },
    // onError inherited from global handler → auto-toast
  });

  const estimateFee = useCallback(
    async (to: string, amountSats: string): Promise<L1FeeEstimate> => {
      if (!adapter) throw new Error('Wallet not initialized');
      return adapter.l1EstimateFee(to, amountSats);
    },
    [adapter],
  );

  const resolveAddress = useCallback(
    async (destination: string): Promise<L1ResolvedAddress> => {
      if (!adapter) throw new Error('Wallet not initialized');

      const isNametag = destination.startsWith('@') ||
        (!destination.startsWith('alpha1') && !destination.startsWith('alphat1'));

      const address = await adapter.l1ResolveAddress(destination);
      return {
        address,
        nametag: isNametag ? destination.replace(/^@/, '') : undefined,
      };
    },
    [adapter],
  );

  return {
    send: mutation.mutateAsync,
    estimateFee,
    resolveAddress,
    isLoading: mutation.isPending,
    error: mutation.error,
    lastResult: mutation.data ?? null,
  };
}
