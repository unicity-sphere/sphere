import { useQuery } from '@tanstack/react-query';
import { getPayments } from '../../payments';
import { useSphereContext } from '../core/useSphere';
import { SPHERE_KEYS } from '../../queryKeys';
import type { TransactionHistoryEntry } from '@unicitylabs/sphere-sdk';

/**
 * payments.history() is PAGED (newest-first keyset pages) while every consumer
 * — the modal's windowed infinite scroll, accounting-style scans — was built
 * against the legacy complete array. Walk the cursor to completeness here:
 * a wallet with 200+ entries otherwise loses every older transaction (the
 * modal derives hasMore from the array it is handed, so it simply stops).
 * MAX_PAGES bounds a pathological history; hitting it logs rather than
 * silently truncating.
 */
const HISTORY_PAGE_LIMIT = 200;
const MAX_HISTORY_PAGES = 50;

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
      const payments = getPayments(sphere);
      if (!payments) return [];
      const collected: Awaited<ReturnType<typeof payments.history>>['entries'] = [];
      let cursor: string | null = null;
      for (let i = 0; i < MAX_HISTORY_PAGES; i += 1) {
        const page: Awaited<ReturnType<typeof payments.history>> = await payments.history({
          limit: HISTORY_PAGE_LIMIT,
          ...(cursor !== null ? { before: cursor } : {}),
        });
        collected.push(...page.entries);
        if (!page.more || page.cursor === null) break;
        cursor = page.cursor;
        if (i === MAX_HISTORY_PAGES - 1) {
          console.warn('[useTransactionHistory] history exceeds', MAX_HISTORY_PAGES * HISTORY_PAGE_LIMIT, 'entries — older rows not loaded');
        }
      }
      const page = { entries: collected };
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
