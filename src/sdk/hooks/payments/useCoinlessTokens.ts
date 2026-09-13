import { useQuery } from '@tanstack/react-query';
import { getPayments } from '../../payments';
import { useMemo } from 'react';
import { useSphereContext } from '../core/useSphere';
import { useRegistryReady } from './useRegistryReady';
import { SPHERE_KEYS } from '../../queryKeys';
import { TokenRegistry } from '@unicitylabs/sphere-sdk';
import type { CoinlessToken } from '@unicitylabs/sphere-sdk';

export interface UseCoinlessTokensReturn {
  coinless: CoinlessToken[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  coinlessCount: number;
  hasCoinless: boolean;
}

/**
 * Coinless holdings — tokens that name no coin (NFTs). Disjoint from useTokens():
 * an active holding is in exactly one of the two, so nothing is counted twice and
 * an NFT joins no balance.
 *
 * An UNRECOGNISED token type is legitimate and must still be listed — the registry
 * only supplies a display name, never permission to show the token.
 */
export function useCoinlessTokens(): UseCoinlessTokensReturn {
  const { sphere } = useSphereContext();
  const registryReady = useRegistryReady();

  const query = useQuery({
    queryKey: SPHERE_KEYS.payments.tokens.coinless,
    queryFn: async () => {
      const payments = getPayments(sphere);
      if (!payments) return [];
      return payments.coinless();
    },
    enabled: !!sphere,
    staleTime: 30_000,
    structuralSharing: false,
  });

  // Same reason useTokens re-enriches: the SDK resolves class metadata when the
  // row is built, which can be before the registry finished loading.
  const coinless = useMemo(() => {
    const raw = query.data ?? [];
    if (!registryReady) return raw;
    const registry = TokenRegistry.getInstance();
    return raw.map((t) => {
      if (!t.tokenType) return t;
      const meta = registry.getTypeMeta?.(t.tokenType);
      if (!meta) return t;
      return {
        ...t,
        name: meta.name || t.name,
        iconUrl: meta.iconUrl ?? t.iconUrl,
      };
    });
  }, [query.data, registryReady]);

  return {
    coinless,
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => query.refetch(),
    coinlessCount: coinless.length,
    hasCoinless: coinless.length > 0,
  };
}
