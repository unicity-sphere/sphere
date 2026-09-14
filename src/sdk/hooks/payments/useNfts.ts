import { useQuery } from '@tanstack/react-query';
import type { NftView } from '@unicitylabs/sphere-sdk';
import { getPayments } from '../../payments';
import { useSphereContext } from '../core/useSphere';
import { SPHERE_KEYS } from '../../queryKeys';

export interface UseNftsReturn {
  /** Id → NFT reading. An absent id is not a recognised NFT (or not held). */
  views: ReadonlyMap<string, NftView>;
  isLoading: boolean;
}

const EMPTY: ReadonlyMap<string, NftView> = new Map();

interface NftReadings {
  /** The address these readings were read for — placeholder data never crosses addresses. */
  chainPubkey: string;
  views: ReadonlyMap<string, NftView>;
}

/**
 * Coinless holdings read as NFTs (#785), batched for list views.
 *
 * Cached under `nft.*`, outside `payments.*`: useSphereEvents invalidates that
 * subtree on every payment event, and a token's genesis payload never changes,
 * so a refetch would only download the same blobs again. The chain pubkey is in
 * the key because `nfts()` answers for the active address's holdings.
 */
export function useNfts(tokenIds: readonly string[]): UseNftsReturn {
  const { sphere } = useSphereContext();
  const chainPubkey = sphere?.identity?.chainPubkey ?? '';
  // One cache entry per SET of ids, whatever order the caller lists them in.
  const ids = [...new Set(tokenIds)].sort();

  const query = useQuery({
    queryKey: SPHERE_KEYS.nft.views(chainPubkey, ids),
    queryFn: async (): Promise<NftReadings> => {
      const payments = getPayments(sphere);
      // Thrown, not answered with an empty map: with staleTime Infinity an empty
      // SUCCESS would pin "no NFTs" for these ids until the page reloads.
      if (!payments) throw new Error('Payments are not running');
      return { chainPubkey, views: await payments.nfts(ids) };
    },
    enabled: !!sphere && ids.length > 0,
    staleTime: Infinity,
    structuralSharing: false, // views carry Uint8Array media
    // Every send or receive changes the id set, and so the key. Keep the last readings
    // on screen while the new set loads — a reading never changes for a token id — so
    // rows do not flash back to registry names. Never across addresses.
    placeholderData: (previous) => (previous?.chainPubkey === chainPubkey ? previous : undefined),
  });

  return { views: query.data?.views ?? EMPTY, isLoading: query.isLoading };
}
