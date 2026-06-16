import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { useSphereContext } from '../core/useSphere';
import { useRegistryReady } from './useRegistryReady';
import { SPHERE_KEYS } from '../../queryKeys';
import { TokenRegistry, toHumanReadable } from '@unicitylabs/sphere-sdk';
import type { Asset } from '../..';

/**
 * Hardcoded fallback prices (USD) for tokens not yet listed on CoinGecko.
 * Key = token registry name (lowercased).
 */
const FALLBACK_PRICES: Record<string, { priceUsd: number; priceEur: number }> = {
  unicity:       { priceUsd: 1.0, priceEur: 0.92 },  // UCT
  'unicity-usd': { priceUsd: 1.0, priceEur: 0.92 },  // USDU
};

export interface UseAssetsReturn {
  assets: Asset[];
  isLoading: boolean;
  error: Error | null;
  assetCount: number;
}

export function useAssets(): UseAssetsReturn {
  const { sphere, walletApiEnabled } = useSphereContext();
  const registryReady = useRegistryReady();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: SPHERE_KEYS.payments.assets.list,
    queryFn: async (): Promise<Asset[]> => {
      if (!sphere) return [];
      return await sphere.payments.getAssets();
    },
    enabled: !!sphere,
    staleTime: 30_000,
    // wallet-api mode: refetch on focus so a tab backgrounded with a dead wake
    // socket refreshes on return (realtime invalidation is the primary path;
    // TanStack dedupes). Local-only mode keeps the global default (no server).
    refetchOnWindowFocus: walletApiEnabled,
  });

  // If the token registry finishes loading AFTER the first getAssets() call,
  // the SDK may have returned price-less assets (getAssets skips getPrices when
  // it can't yet resolve coinIds → definitions). Refetch once on the
  // not-ready → ready transition so prices populate without waiting for an
  // unrelated invalidation (transfer/sync). The ref guard avoids a redundant
  // refetch when the registry was already loaded at mount (returning user).
  const wasRegistryReady = useRef(registryReady);
  useEffect(() => {
    if (registryReady && !wasRegistryReady.current) {
      queryClient.refetchQueries({ queryKey: SPHERE_KEYS.payments.assets.all });
    }
    wasRegistryReady.current = registryReady;
  }, [registryReady, queryClient]);

  // Enrich assets with registry data — SDK bakes symbol at token creation
  // time before the registry has loaded, so we override here.
  // Also applies fallback prices for tokens not yet listed on CoinGecko.
  const assets = useMemo(() => {
    const rawAssets = query.data ?? [];
    if (!registryReady) return rawAssets;
    const registry = TokenRegistry.getInstance();
    return rawAssets.map((a) => {
      const def = registry.getDefinition(a.coinId);
      const enriched = def
        ? {
            ...a,
            symbol: def.symbol || a.symbol,
            name: def.name
              ? def.name.charAt(0).toUpperCase() + def.name.slice(1)
              : a.name,
            decimals: def.decimals ?? a.decimals,
            iconUrl: registry.getIconUrl(a.coinId) || a.iconUrl,
          }
        : a;

      // Apply fallback prices for tokens missing CoinGecko data
      const tokenName = (def?.name ?? enriched.name ?? '').toLowerCase();
      const fallback = FALLBACK_PRICES[tokenName];
      if (fallback && !enriched.priceUsd) {
        const decimals = enriched.decimals ?? 0;
        const amount = Number(toHumanReadable(enriched.totalAmount, decimals));
        return {
          ...enriched,
          priceUsd: fallback.priceUsd,
          priceEur: fallback.priceEur,
          fiatValueUsd: amount * fallback.priceUsd,
          fiatValueEur: amount * fallback.priceEur,
        };
      }
      return enriched;
    });
  }, [query.data, registryReady]);

  return {
    assets,
    isLoading: query.isLoading,
    error: query.error,
    assetCount: assets.length,
  };
}
