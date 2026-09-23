import { ETHEREUM_MAINNET_CHAIN_ID, EvmJsonRpcClient, SEPOLIA_CHAIN_ID, toEvmAddressHex } from '@unicitylabs/bridge-plugin';
import {
  bridgePresentation,
  bridgeTokenPlugin,
  createSourceAdapter,
  injectedEvmProvider,
  loadBridges,
  SEPOLIA_USDC_BRIDGE,
  withReturnServiceUrl,
  type DepositWallet,
  type EvmBridgeManifest,
  type LoadedBridge,
  type SourceSigner,
} from '@unicitylabs/bridge-plugin/wallet';
import type { ReceiptReader } from '@unicitylabs/bridge-core';

import type { BridgeAsset, BridgeAssetProvider, BridgeChain, BridgeInDeps, BridgeWalletOption } from '../../types';
import { bridgeOut } from '../out';

const provider: BridgeAssetProvider = {
  id: 'evm-usdc',
  load: () => loadBridges([withServiceUrl(SEPOLIA_USDC_BRIDGE)]).map(evmAsset),
};

export default provider;

function evmAsset(bridge: LoadedBridge): BridgeAsset {
  const m = bridge.manifest;
  if (m.family !== 'eip155') throw new Error(`${m.label}: not an Ethereum manifest`);
  const rpc = new EvmJsonRpcClient({ rpcUrl: m.rpcUrl });
  const receipts: ReceiptReader = { getReceipt: (txid) => rpc.getTransactionInfo(txid) };

  const depsFor = (signer: SourceSigner): BridgeInDeps => ({
    wallet: signer,
    receipts,
    adapter: createSourceAdapter(bridge, signer, rpc),
    expectedNetwork: m.chainId,
    chainLabel: m.label,
  });

  const injected = injectedEvmProvider();
  const wallets: BridgeWalletOption[] = [
    {
      id: injected.id,
      name: injected.name,
      unavailableHint: 'Install the MetaMask browser extension to sign on Ethereum.',
      isAvailable: () => injected.isAvailable(),
      open: () => depsFor(injected.create(m.chainId)),
    },
  ];

  return {
    id: `${m.chainRef}:${m.symbol.toLowerCase()}`,
    label: m.label,
    symbol: m.symbol,
    decimals: bridge.plugin.decimals,
    coinIdHex: bridge.plugin.coinIdHex,
    tokenTypeHex: bridge.plugin.tokenTypeHex,
    chain: evmChain(m.chainId, m.chainRef),
    priceUsd: 1,
    confirmations: m.confirmations,
    networks: ['testnet', 'testnet2'],
    tokenPlugin: bridgeTokenPlugin(bridge),
    presentation: bridgePresentation(bridge),
    wallets,
    resumeDeps: () => ({ adapter: createSourceAdapter(bridge, NEVER_SIGNS, rpc), receipts }),
    out: bridgeOut(bridge, (destination) => fromHex(toEvmAddressHex(destination))),
    disabledReason: m.disabledReason,
  };
}

function withServiceUrl(m: EvmBridgeManifest): EvmBridgeManifest {
  const url = import.meta.env.VITE_BRIDGE_RETURN_SERVICE_URL as string | undefined;
  return url ? withReturnServiceUrl(m, url) : m;
}

function evmChain(chainId: number, chainRef: string): BridgeChain {
  const known: Record<number, { networkName: string; testnet: boolean }> = {
    [ETHEREUM_MAINNET_CHAIN_ID]: { networkName: 'Mainnet', testnet: false },
    [SEPOLIA_CHAIN_ID]: { networkName: 'Sepolia testnet', testnet: true },
  };
  const net = known[chainId] ?? { networkName: `chain ${chainId}`, testnet: true };
  return { id: chainRef, name: 'Ethereum', ...net };
}

const NEVER_SIGNS: DepositWallet = {
  getAddress: async () => '',
  sendCall: async () => {
    throw new Error('Resuming a mint never signs.');
  },
};

function fromHex(hex: string): Uint8Array {
  const s = hex.startsWith('0x') ? hex.slice(2) : hex;
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}
