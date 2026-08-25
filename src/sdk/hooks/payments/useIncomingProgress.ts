import { useQuery } from '@tanstack/react-query';

import { SPHERE_KEYS } from '../../queryKeys';

export interface IncomingProgress {
  /** Running total received so far in this burst, already human-formatted. */
  amount: string;
  symbol: string;
  /** Display name of the counterparty, e.g. `@alice`. */
  sender: string;
  at: number;
}

/**
 * Live progress of an in-flight receive.
 *
 * A multi-token payment arrives one `transfer:incoming` event per token, but
 * the confirmed balance cannot move until the drain flushes its acks and the
 * server inventory is re-pulled — once, at the end. Without this the wallet
 * sits at its old value for the whole receive and then jumps, which reads as
 * the money not arriving.
 *
 * `useSphereEvents` writes the running total here as the tokens land, and
 * clears it once the burst goes quiet and the real balance has caught up.
 */
export function useIncomingProgress(): IncomingProgress | null {
  const { data } = useQuery<IncomingProgress | null>({
    queryKey: SPHERE_KEYS.incoming.progress,
    // Event-driven only — the receive path pushes via setQueryData. The fetch
    // is DISABLED rather than stubbed: a queryFn resolving `null` would race
    // the pushed value and blank it out on mount.
    queryFn: () => null,
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return data ?? null;
}
