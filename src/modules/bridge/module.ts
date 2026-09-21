import { ArrowLeftRight } from 'lucide-react';
import type { TokenPlugin } from '@unicitylabs/sphere-sdk';
import type { WalletModule } from '../types';
import { bridgeAssetByCoin, bridgeAssets, bridgeAssetsFor } from './assets';
import { BridgeScreen } from './BridgeScreen';

const bridgeModule: WalletModule = {
  id: 'bridge',

  tokenPlugins: () => bridgeAssets().map((a): TokenPlugin => a.tokenPlugin),

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
