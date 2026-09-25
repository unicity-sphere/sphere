import { TRON_MAINNET_CHAIN_ID, TRON_NILE_CHAIN_ID, TronHttpRpcClient } from '@unicitylabs/bridge-plugin';
import {
  bridgePresentation,
  bridgeTokenPlugin,
  createSourceAdapter,
  loadBridges,
  lockFinality,
  NILE_USDT_BRIDGE,
  toEvmAddressHex,
  tronLinkProvider,
  type DepositWallet,
  type LoadedBridge,
  type SourceSigner,
  withReturnServiceUrl,
} from '@unicitylabs/bridge-plugin/wallet';
import type { ReceiptReader } from '@unicitylabs/bridge-core';

import type { BridgeAsset, BridgeAssetProvider, BridgeChain, BridgeInDeps, BridgeWalletOption } from '../../types';
import { bridgeOut } from '../out';

const provider: BridgeAssetProvider = {
  id: 'tron-usdt',
  load: () => loadBridges([withServiceUrl(NILE_USDT_BRIDGE)]).map(tronAsset),
};

export default provider;

function tronAsset(bridge: LoadedBridge): BridgeAsset {
  const m = bridge.manifest;
  if (m.family !== 'tron') throw new Error(`${m.label}: not a Tron manifest`);
  const rpc = new TronHttpRpcClient({ baseUrl: m.rpcUrl, apiKey: m.apiKey });
  const receipts: ReceiptReader = { getReceipt: (txid) => rpc.getTransactionInfo(txid) };

  const depsFor = (signer: SourceSigner): BridgeInDeps => ({
    wallet: signer,
    receipts,
    adapter: createSourceAdapter(bridge, signer, rpc),
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

  return {
    id: `${m.chainRef}:${m.symbol.toLowerCase()}`,
    label: m.label,
    symbol: m.symbol,
    decimals: bridge.plugin.decimals,
    coinIdHex: bridge.plugin.coinIdHex,
    tokenTypeHex: bridge.plugin.tokenTypeHex,
    chain: tronChain(m.chainId, m.chainRef),
    priceUsd: 1,
    confirmations: m.confirmations,
    networks: ['testnet', 'testnet2'],
    tokenPlugin: bridgeTokenPlugin(bridge),
    presentation: bridgePresentation(bridge),
    wallets,
    resumeDeps: () => ({ adapter: createSourceAdapter(bridge, NEVER_SIGNS, rpc), receipts }),
    out: bridgeOut(bridge, (destination) => fromHex(toEvmAddressHex(destination))),
    disabledReason: m.disabledReason,
    settling: (justification) => lockFinality(bridge, justification),
  };
}

function withServiceUrl(m: typeof NILE_USDT_BRIDGE): typeof NILE_USDT_BRIDGE {
  const url = import.meta.env.VITE_BRIDGE_RETURN_SERVICE_URL as string | undefined;
  return url ? withReturnServiceUrl(m, url) : m;
}

function fromHex(hex: string): Uint8Array {
  const s = hex.startsWith('0x') ? hex.slice(2) : hex;
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function tronChain(chainId: number, chainRef: string): BridgeChain {
  const known: Record<number, { networkName: string; testnet: boolean }> = {
    [TRON_MAINNET_CHAIN_ID]: { networkName: 'Mainnet', testnet: false },
    [TRON_NILE_CHAIN_ID]: { networkName: 'Nile testnet', testnet: true },
  };
  const net = known[chainId] ?? { networkName: `network ${chainId}`, testnet: true };
  return { id: chainRef, name: 'Tron', ...net };
}

const NEVER_SIGNS: DepositWallet = {
  getAddress: async () => '',
  sendCall: async () => {
    throw new Error('Resuming a mint never signs.');
  },
};
