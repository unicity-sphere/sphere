import { logger } from '@unicitylabs/sphere-sdk';
import type { BridgeAsset, BridgeAssetProvider, BridgeChain } from './types';

const providers = import.meta.glob<{ default: BridgeAssetProvider }>('./assets/*/index.ts', { eager: true });

let cache: readonly BridgeAsset[] | null = null;

export function bridgeAssets(): readonly BridgeAsset[] {
  if (cache) return cache;
  const all: BridgeAsset[] = [];
  const byCoin = new Map<string, string>();
  for (const path of Object.keys(providers).sort()) {
    const provider = providers[path].default;
    let loaded: readonly BridgeAsset[];
    try {
      loaded = provider.load();
    } catch (err) {
      logger.warn('Bridge', `${provider.id}: disabled: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    for (const asset of loaded) {
      const prior = byCoin.get(asset.coinIdHex);
      if (prior) {
        logger.warn('Bridge', `${asset.id}: refused, coin ${asset.coinIdHex} is already provided by ${prior}`);
        continue;
      }
      byCoin.set(asset.coinIdHex, asset.id);
      all.push(asset);
    }
  }
  cache = all;
  return cache;
}

export function bridgeAssetsFor(network: string): BridgeAsset[] {
  return bridgeAssets().filter((a) => a.networks.includes(network));
}

export function bridgeChainsFor(network: string): BridgeChain[] {
  const seen = new Map<string, BridgeChain>();
  for (const a of bridgeAssetsFor(network)) if (!seen.has(a.chain.id)) seen.set(a.chain.id, a.chain);
  return [...seen.values()];
}

export function bridgeAssetByCoin(coinIdHex: string): BridgeAsset | undefined {
  const key = coinIdHex.toLowerCase();
  return bridgeAssets().find((a) => a.coinIdHex === key);
}

export function resetBridgeAssets(): void {
  cache = null;
}
