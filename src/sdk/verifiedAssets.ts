import type { Asset } from '@unicitylabs/sphere-sdk';

export function assetKey(asset: Asset): string {
  return asset.unverified ? `${asset.coinId}:${asset.unverified}` : asset.coinId;
}

export function verifiedAssets(assets: readonly Asset[]): Asset[] {
  return assets.filter((asset) => !asset.unverified);
}
