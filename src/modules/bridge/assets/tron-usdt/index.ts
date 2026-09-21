import { TronHttpRpcClient } from '@unicitylabs/bridge-plugin-tron-usdt';
import {
  bridgePresentation,
  bridgeTokenPlugin,
  createTronSourceAdapter,
  loadBridges,
  NILE_USDT_BRIDGE,
  tronLinkProvider,
  type DepositWallet,
  type LoadedBridge,
  type TronSigner,
} from '@unicitylabs/bridge-plugin-tron-usdt/wallet';
import type { ReceiptReader } from '@unicitylabs/bridge-core';

import type { BridgeAsset, BridgeAssetProvider, BridgeInDeps, BridgeWalletOption } from '../../types';
import { devKeySigner } from './devSigner';

const provider: BridgeAssetProvider = {
  id: 'tron-usdt',
  load: () => loadBridges([NILE_USDT_BRIDGE]).map(tronAsset),
};

export default provider;

function tronAsset(bridge: LoadedBridge): BridgeAsset {
  const m = bridge.manifest;
  const rpc = new TronHttpRpcClient({ baseUrl: m.rpcUrl, apiKey: m.apiKey });
  const receipts: ReceiptReader = { getReceipt: (txid) => rpc.getTransactionInfo(txid) };

  const depsFor = (signer: TronSigner): BridgeInDeps => ({
    wallet: signer,
    receipts,
    adapter: createTronSourceAdapter(bridge, signer, rpc),
    expectedNetwork: m.chainId,
    chainLabel: m.label,
  });

  const tronLink = tronLinkProvider();
  const wallets: BridgeWalletOption[] = [
    {
      id: 'tronlink',
      name: 'TronLink',
      unavailableHint: 'Install the TronLink browser extension to sign on Tron.',
      isAvailable: () => tronLink.isAvailable(),
      open: () => depsFor(tronLink.create(m.chainId)),
    },
  ];
  const devKey = devKeySigner(m);
  if (devKey) {
    wallets.push({
      id: 'dev-key',
      name: 'development key',
      isAvailable: () => true,
      open: () => depsFor(devKey()),
    });
  }

  return {
    id: `${m.chainRef}:${m.symbol.toLowerCase()}`,
    label: m.label,
    symbol: m.symbol,
    decimals: bridge.plugin.decimals,
    coinIdHex: bridge.plugin.coinIdHex,
    tokenTypeHex: bridge.plugin.tokenTypeHex,
    chainName: 'Tron',
    confirmations: m.confirmations,
    networks: ['testnet', 'testnet2'],
    tokenPlugin: bridgeTokenPlugin(bridge),
    presentation: bridgePresentation(bridge),
    wallets,
    resumeDeps: () => ({ adapter: createTronSourceAdapter(bridge, NEVER_SIGNS, rpc), receipts }),
  };
}

const NEVER_SIGNS: DepositWallet = {
  getAddress: async () => '',
  sendCall: async () => {
    throw new Error('Resuming a mint never signs.');
  },
};
