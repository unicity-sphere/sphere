import { useQuery } from '@tanstack/react-query';
import { getPayments } from '../../payments';
import { useSphereContext } from '../core/useSphere';
import { SPHERE_KEYS } from '../../queryKeys';

export interface UseTokenDataReturn {
  /** Genesis payload as lowercase hex, '' when the token carries none. */
  hex: string | null;
  byteLength: number;
  isLoading: boolean;
  error: Error | null;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * A token's GENESIS payload, fetched on demand.
 *
 * The same call serves both kinds, because it returns whatever the minter put
 * there: for a coinless token that is its data; for a coin token it is the
 * value envelope (CBOR tag 39050), which is why the hex decodes to the coin
 * amounts in any CBOR parser.
 *
 * Never fetched until asked — the blob is a separate round trip per token.
 */
export function useTokenData(tokenId: string | null): UseTokenDataReturn {
  const { sphere } = useSphereContext();

  const query = useQuery({
    queryKey: SPHERE_KEYS.payments.tokens.data(tokenId ?? ''),
    queryFn: async () => {
      const payments = getPayments(sphere);
      if (!payments || tokenId === null) return null;
      const bytes = await payments.tokenData(tokenId);
      return bytes === null ? '' : toHex(bytes);
    },
    enabled: !!sphere && tokenId !== null,
    staleTime: Infinity, // Genesis data is immutable for the life of the token.
  });

  return {
    hex: query.data ?? null,
    byteLength: query.data ? query.data.length / 2 : 0,
    isLoading: query.isLoading,
    error: query.error,
  };
}
