import { logger, toHumanReadable, type Asset, type Token, type TokenPlugin } from '@unicitylabs/sphere-sdk';
import type { CoinPresentation, WalletModule, WalletModuleAction } from './types';

const discovered = import.meta.glob<{ default: WalletModule }>('./*/module.ts', { eager: true });

export const WALLET_MODULES: readonly WalletModule[] = Object.keys(discovered)
  .sort()
  .map((path) => discovered[path].default);

export function moduleTokenPlugins(): TokenPlugin[] {
  const plugins: TokenPlugin[] = [];
  for (const m of WALLET_MODULES) {
    if (!m.tokenPlugins) continue;
    try {
      plugins.push(...m.tokenPlugins());
    } catch (err) {
      logger.warn('Modules', `${m.id}: token plugins disabled: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return plugins;
}

export function describeCoin(coinId: string): CoinPresentation | undefined {
  for (const m of WALLET_MODULES) {
    const p = m.describeCoin?.(coinId);
    if (p) return p;
  }
  return undefined;
}

export function moduleAssetView(asset: Asset): Asset {
  const known = describeCoin(asset.coinId);
  if (!known) return asset;
  const view: Asset = { ...asset, symbol: known.symbol, name: known.name, decimals: known.decimals };
  if (known.priceUsd === undefined || view.priceUsd != null) return view;
  const amount = Number(toHumanReadable(view.totalAmount, view.decimals));
  return { ...view, priceUsd: known.priceUsd, fiatValueUsd: amount * known.priceUsd };
}

export function moduleTokenView(token: Token): Token {
  const known = describeCoin(token.coinId);
  return known ? { ...token, symbol: known.symbol, name: known.name, decimals: known.decimals } : token;
}

export function moduleActions(network: string): WalletModuleAction[] {
  return WALLET_MODULES.flatMap((m) => m.actions ?? []).filter((a) => a.isAvailable?.(network) ?? true);
}
