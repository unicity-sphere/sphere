import { fromHex, TRON_MAINNET_CHAIN_ID, TRON_NILE_CHAIN_ID, TronHttpRpcClient } from '@unicitylabs/bridge-plugin';
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

// The Nile deployment is paused and its service charges nothing, so any fee it quotes is refused.
const RETURN_FEE_CAP = 0n;

const provider: BridgeAssetProvider = {
  id: 'tron-usdt',
  load: () => {
    const serviceUrl = returnServiceUrl();
    const manifest = serviceUrl ? withReturnServiceUrl(NILE_USDT_BRIDGE, serviceUrl) : NILE_USDT_BRIDGE;
    return loadBridges([manifest]).map((bridge) => tronAsset(bridge, serviceUrl !== undefined));
  },
};

export default provider;

function tronAsset(bridge: LoadedBridge, hasReturnService: boolean): BridgeAsset {
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
    wallets: () => wallets,
    resumeDeps: () => ({ adapter: createSourceAdapter(bridge, NEVER_SIGNS, rpc), receipts }),
    out: hasReturnService ? bridgeOut(bridge, (destination) => fromHex(toEvmAddressHex(destination)), { feeCap: RETURN_FEE_CAP }) : undefined,
    disabledReason: m.disabledReason,
    settling: (justification) => lockFinality(bridge, justification),
  };
}

// No return service is deployed for this deployment; a local build can name one. Without one
// the asset is offered for bridging in only, as for Sepolia USDC.
function returnServiceUrl(): string | undefined {
  return (import.meta.env.VITE_BRIDGE_RETURN_SERVICE_URL_NILE_USDT as string | undefined)?.trim() || undefined;
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
