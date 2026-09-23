import { ArrowLeftRight } from 'lucide-react';
import { mergeBridgeTokenPlugins } from '@unicitylabs/bridge-plugin/wallet';
import type { WalletModule } from '../types';
import type { Token } from '@unicitylabs/sphere-sdk';
import type { TokenHold, TokenHoldContext } from '../types';
import { bridgeAssetByCoin, bridgeAssets, bridgeAssetsFor } from './assets';
import { BridgeScreen } from './BridgeScreen';

const bridgeModule: WalletModule = {
  id: 'bridge',

  tokenPlugins: () => {
    const assets = bridgeAssets();
    return assets.length === 0 ? [] : [mergeBridgeTokenPlugins(assets.map((a) => a.tokenPlugin))];
  },

  tokenHold: (token: Token, ctx: TokenHoldContext) => holdWhileSettling(token, ctx),

  describeCoin: (coinId) => {
    const asset = bridgeAssetByCoin(coinId);
    return asset
      ? { symbol: asset.symbol, name: asset.label, decimals: asset.decimals, badge: asset.chain.name, priceUsd: asset.priceUsd }
      : undefined;
  },

  actions: [
    {
      id: 'bridge',
      label: 'Bridge',
      icon: ArrowLeftRight,
      Screen: BridgeScreen,
      isAvailable: (network) => bridgeAssetsFor(network).length > 0,
    },
  ],
};

export default bridgeModule;

async function holdWhileSettling(token: Token, ctx: TokenHoldContext): Promise<TokenHold | undefined> {
  const asset = bridgeAssetByCoin(token.coinId);
  if (!asset?.settling) return undefined;
  let state: { final: boolean; secondsLeft: number } | null;
  try {
    state = await asset.settling(await ctx.justification(token.id));
  } catch {
    return { reason: `Cannot confirm finality on ${asset.chain.name} right now` };
  }
  if (!state || state.final) return undefined;
  return { reason: `Settling on ${asset.chain.name}, ${timeLeft(state.secondsLeft)}` };
}

function timeLeft(seconds: number): string {
  return seconds < 60 ? 'under a minute left' : `about ${Math.ceil(seconds / 60)} min left`;
}
