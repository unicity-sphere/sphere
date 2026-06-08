import { useEffect, useMemo, useState } from 'react';
import { TokenRegistry } from '@unicitylabs/sphere-sdk';
import type { CoinId } from '../types/agent';
import { getMockPrice } from '../utils/mockTokenPrices';

const SUPPORTED_NAMES = new Set([
  'unicity',
  'bitcoin',
  'ethereum',
  'solana',
  'tether',
  'usd-coin',
  'unicity-usd',
]);

export interface SupportedToken {
  coinId: CoinId;
  name: string;
  symbol: string;
  decimals: number;
  iconUrl: string | null;
  priceUsd: number;
}

function readRegistry(): SupportedToken[] {
  const registry = TokenRegistry.getInstance();
  const defs = registry.getAllDefinitions();
  const seen = new Set<string>();
  const result: SupportedToken[] = [];
  for (const def of defs) {
    if (def.assetKind !== 'fungible') continue;
    if (!SUPPORTED_NAMES.has(def.name.toLowerCase())) continue;
    if (seen.has(def.id)) continue;
    seen.add(def.id);
    result.push({
      coinId: def.id,
      name: def.name,
      symbol: def.symbol ?? def.name.toUpperCase().slice(0, 4),
      decimals: def.decimals ?? 6,
      iconUrl: registry.getIconUrl(def.id),
      priceUsd: getMockPrice(def.name),
    });
  }
  return result;
}

/**
 * Discovers supported fungible tokens via TokenRegistry. Waits for the
 * registry to fetch its remote definitions before returning the full list.
 */
export function useAgentSupportedTokens(): {
  tokens: SupportedToken[];
  byCoinId: Record<CoinId, SupportedToken>;
  isReady: boolean;
} {
  const [registryReady, setRegistryReady] = useState(
    () => TokenRegistry.getInstance().getAllDefinitions().length > 0,
  );

  useEffect(() => {
    if (registryReady) return;
    let cancelled = false;
    TokenRegistry.waitForReady(15_000).then((loaded) => {
      if (!cancelled && loaded) setRegistryReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [registryReady]);

  return useMemo(() => {
    const tokens = registryReady ? readRegistry() : [];
    const byCoinId = tokens.reduce<Record<CoinId, SupportedToken>>((acc, t) => {
      acc[t.coinId] = t;
      return acc;
    }, {});
    return { tokens, byCoinId, isReady: registryReady };
  }, [registryReady]);
}

/**
 * Synchronous lookup of a single token's metadata. Returns null if the
 * registry hasn't loaded yet or the coinId isn't recognised.
 */
export function getSupportedToken(coinId: CoinId): SupportedToken | null {
  const registry = TokenRegistry.getInstance();
  const def = registry.getDefinition(coinId);
  if (!def || def.assetKind !== 'fungible') return null;
  return {
    coinId: def.id,
    name: def.name,
    symbol: def.symbol ?? def.name.toUpperCase().slice(0, 4),
    decimals: def.decimals ?? 6,
    iconUrl: registry.getIconUrl(def.id),
    priceUsd: getMockPrice(def.name),
  };
}
