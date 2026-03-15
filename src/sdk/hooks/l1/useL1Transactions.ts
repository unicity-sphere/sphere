import { useQuery } from '@tanstack/react-query';
import { useSphereContext } from '../core/useSphere';
import { SPHERE_KEYS } from '../../queryKeys';

export interface L1Transaction {
  txid: string;
  type: 'incoming' | 'outgoing';
  amount: string;
  fee: string;
  confirmations: number;
  timestamp: number;
  address: string;
}

export interface UseL1TransactionsReturn {
  transactions: L1Transaction[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useL1Transactions(): UseL1TransactionsReturn {
  const { adapter } = useSphereContext();

  const query = useQuery({
    queryKey: SPHERE_KEYS.l1.transactions,
    queryFn: async (): Promise<L1Transaction[]> => {
      if (!adapter) return [];
      const txs = await adapter.l1GetTransactions();
      return txs.map((tx) => ({
        txid: tx.txid,
        type: (tx.type === 'receive' ? 'incoming' : 'outgoing') as
          | 'incoming'
          | 'outgoing',
        amount: tx.amount,
        fee: tx.fee ?? '0',
        confirmations: tx.confirmations ?? 0,
        timestamp: tx.timestamp,
        address: tx.address ?? '',
      }));
    },
    enabled: !!adapter,
    staleTime: 30_000,
  });

  return {
    transactions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => query.refetch(),
  };
}
