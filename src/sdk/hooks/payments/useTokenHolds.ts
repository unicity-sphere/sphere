import { useQuery } from '@tanstack/react-query';
import type { Token } from '@unicitylabs/sphere-sdk';

import { moduleTokenHold } from '../../../modules/registry';
import type { TokenHold } from '../../../modules/types';
import { getPayments } from '../../payments';
import { SPHERE_KEYS } from '../../queryKeys';
import { useSphereContext } from '../core/useSphere';

const NO_HOLDS: ReadonlyMap<string, TokenHold> = new Map();
const POLL_MS = 30_000;

export function holdPollInterval(holds: ReadonlyMap<string, TokenHold> | undefined): number | false {
  return holds === undefined || holds.size > 0 ? POLL_MS : false;
}

export function useTokenHolds(tokens: readonly Token[]): ReadonlyMap<string, TokenHold> {
  const { sphere } = useSphereContext();
  const ids = tokens.map((t) => t.id).join(',');
  const query = useQuery({
    queryKey: SPHERE_KEYS.payments.tokens.holds(ids),
    queryFn: async () => {
      const payments = getPayments(sphere);
      if (!payments) throw new Error('The wallet is restarting; token holds are not known yet.');
      const holds = new Map<string, TokenHold>();
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
    refetchInterval: (query) => holdPollInterval(query.state.data),
    structuralSharing: false,
  });
  return query.data ?? NO_HOLDS;
}
