import type { Asset, Token } from '@unicitylabs/sphere-sdk';

export function assetKey(asset: Asset): string {
  return asset.unverified ? `${asset.coinId}:${asset.unverified}` : asset.coinId;
}

export function verifiedAssets(assets: readonly Asset[]): Asset[] {
  return assets.filter((asset) => !asset.unverified);
}

interface HeldReads {
  assets(): Promise<Asset[]>;
  unverifiedAssets(): Promise<Asset[]>;
  tokens(): Token[];
  unverifiedTokens(): Token[];
}

export async function shownAssets(payments: Pick<HeldReads, 'assets' | 'unverifiedAssets'>): Promise<Asset[]> {
  return [...(await payments.assets()), ...(await payments.unverifiedAssets())];
}

export function shownTokens(payments: Pick<HeldReads, 'tokens' | 'unverifiedTokens'>): Token[] {
  return [...payments.tokens(), ...payments.unverifiedTokens()];
}
