import { ArrowLeftRight } from 'lucide-react';
import { mergeBridgeTokenPlugins } from '@unicitylabs/bridge-plugin/wallet';
import type { WalletModule } from '../types';
import { bridgeAssetByCoin, bridgeAssets, bridgeAssetsFor } from './assets';
import { BridgeScreen } from './BridgeScreen';

const bridgeModule: WalletModule = {
  id: 'bridge',

  tokenPlugins: () => {
    const assets = bridgeAssets();
    return assets.length === 0 ? [] : [mergeBridgeTokenPlugins(assets.map((a) => a.tokenPlugin))];
  },

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
