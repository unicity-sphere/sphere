import { useQuery } from '@tanstack/react-query';
import { useSphereContext } from '../core/useSphere';
import { SPHERE_KEYS } from '../../queryKeys';
import type { TransactionHistoryEntry } from '@unicitylabs/sphere-sdk';

/**
 * paymentsV2.history() is PAGED (newest-first keyset pages). Fetch one
 * generous first page so the hook keeps serving the modal's windowed
 * infinite-scroll UX; wiring the modal to real server pagination
 * (cursor/more) is a follow-up.
 */
const HISTORY_PAGE_LIMIT = 200;

export interface UseTransactionHistoryReturn {
  history: TransactionHistoryEntry[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useTransactionHistory(): UseTransactionHistoryReturn {
  const { sphere } = useSphereContext();

  const query = useQuery({
    queryKey: SPHERE_KEYS.payments.transactions.history,
    queryFn: async (): Promise<TransactionHistoryEntry[]> => {
      const paymentsV2 = sphere?.paymentsV2;
      if (!paymentsV2) return [];
      const page = await paymentsV2.history({ limit: HISTORY_PAGE_LIMIT });
      // Bridge v2 HistoryEntry → the legacy TransactionHistoryEntry shape the
      // consumers were built against (dedupKey/symbol are required there; the
      // v2 per-coin breakdown carries no per-token source).
      return page.entries.map((entry) => ({
        ...entry,
        dedupKey: entry.id,
        symbol: entry.symbol ?? '',
        tokenIds: entry.tokenIds?.map((t) => ({ ...t, source: 'direct' as const })),
      }));
    },
    enabled: !!sphere,
    staleTime: 30_000,
  });

  return {
    history: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => query.refetch(),
  };
}
