import { useQuery } from '@tanstack/react-query';
import { useSphereContext } from '../core/useSphere';
import { SPHERE_KEYS } from '../../queryKeys';
import type { TransactionHistoryEntry } from '@unicitylabs/sphere-sdk';

export interface UseTransactionHistoryReturn {
  history: TransactionHistoryEntry[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useTransactionHistory(): UseTransactionHistoryReturn {
  const { adapter } = useSphereContext();

  const query = useQuery({
    queryKey: SPHERE_KEYS.payments.transactions.history,
    queryFn: async (): Promise<TransactionHistoryEntry[]> => {
      if (!adapter) return [];
      return adapter.getTransactionHistory();
    },
    enabled: !!adapter,
    staleTime: 30_000,
  });

  return {
    history: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => query.refetch(),
  };
}
