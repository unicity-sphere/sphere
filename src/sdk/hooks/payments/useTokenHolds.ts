import { useQuery } from '@tanstack/react-query';
import type { Token } from '@unicitylabs/sphere-sdk';

import { moduleTokenHold } from '../../../modules/registry';
import type { TokenHold } from '../../../modules/types';
import { getPayments } from '../../payments';
import { SPHERE_KEYS } from '../../queryKeys';
import { useSphereContext } from '../core/useSphere';

const NO_HOLDS: ReadonlyMap<string, TokenHold> = new Map();

export function useTokenHolds(tokens: readonly Token[]): ReadonlyMap<string, TokenHold> {
  const { sphere } = useSphereContext();
  const ids = tokens.map((t) => t.id).join(',');
  const query = useQuery({
    queryKey: SPHERE_KEYS.payments.tokens.holds(ids),
    queryFn: async () => {
      const payments = getPayments(sphere);
      const holds = new Map<string, TokenHold>();
      if (!payments) return holds;
      const ctx = { justification: (tokenId: string) => payments.tokenJustification(tokenId) };
      await Promise.all(
        tokens.map(async (t) => {
          const hold = await moduleTokenHold(t, ctx);
          if (hold) holds.set(t.id, hold);
        }),
      );
      return holds;
    },
    enabled: !!sphere && tokens.length > 0,
    refetchInterval: 30_000,
    structuralSharing: false,
  });
  return query.data ?? NO_HOLDS;
}
