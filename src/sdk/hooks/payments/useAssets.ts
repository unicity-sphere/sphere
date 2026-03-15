import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { useSphereContext } from '../core/useSphere';
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
  const { adapter } = useSphereContext();
  const [registryReady, setRegistryReady] = useState(
    () => TokenRegistry.getInstance().getAllDefinitions().length > 0,
  );

  // Wait for TokenRegistry to load from remote, then trigger re-render
  // so asset symbols get resolved from the registry.
  useEffect(() => {
    if (registryReady) return;
    let cancelled = false;
    TokenRegistry.waitForReady(15_000).then((loaded) => {
      if (!cancelled && loaded) setRegistryReady(true);
    });
    return () => { cancelled = true; };
  }, [registryReady]);

  const query = useQuery({
    queryKey: SPHERE_KEYS.payments.assets.list,
    queryFn: async (): Promise<Asset[]> => {
      if (!adapter) return [];
      return await adapter.getAssets();
    },
    enabled: !!adapter,
    staleTime: 30_000,
  });

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
