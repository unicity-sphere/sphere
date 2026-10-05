import { ETHEREUM_MAINNET_CHAIN_ID, EvmJsonRpcClient, fromHex, SEPOLIA_CHAIN_ID, toEvmAddressHex } from '@unicitylabs/bridge-plugin';
import {
  bridgePresentation,
  bridgeTokenPlugin,
  createSourceAdapter,
  injectedEvmProvider,
  loadBridges,
  lockFinality,
  owedTo,
  withdrawCall,
  SEPOLIA_USDC_BRIDGE,
  withReturnServiceUrl,
  type DepositWallet,
  type LoadedBridge,
  type SourceSigner,
} from '@unicitylabs/bridge-plugin/wallet';
import type { ReceiptReader } from '@unicitylabs/bridge-core';

import { readRuntimeConfig } from '../../../../config/runtimeConfig';
import type { BridgeAsset, BridgeAssetProvider, BridgeChain, BridgeInDeps, BridgeWalletOption } from '../../types';
import { bridgeOut } from '../out';

// 5 USDC. A return service that asks more of one token is refused before anything is burned.
const RETURN_FEE_CAP = 5_000_000n;

const provider: BridgeAssetProvider = {
  id: 'evm-usdc',
  load: () => {
    const serviceUrl = returnServiceUrl();
    const manifest = serviceUrl ? withReturnServiceUrl(SEPOLIA_USDC_BRIDGE, serviceUrl) : SEPOLIA_USDC_BRIDGE;
    return loadBridges([manifest]).map((bridge) => evmAsset(bridge, serviceUrl !== undefined));
  },
};

export default provider;

function evmAsset(bridge: LoadedBridge, hasReturnService: boolean): BridgeAsset {
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
    out: hasReturnService
      ? bridgeOut(bridge, (destination) => fromHex(toEvmAddressHex(destination)), {
          feeCap: RETURN_FEE_CAP,
          feeRecipient: returnFeeRecipient(),
          payout: {
            owed: (destination) => owedTo(bridge, rpc, destination),
            collect: async (destination) => {
              const signer = injected.create(m.chainId);
              await signer.connect();
              const from = await signer.getAddress();
              if (toEvmAddressHex(from) !== toEvmAddressHex(destination)) {
                throw new Error(`Switch MetaMask to ${destination} to collect.`);
              }
              return signer.sendCall(withdrawCall(bridge));
            },
          },
        })
      : undefined,
    disabledReason: m.disabledReason,
    settling: (justification) => lockFinality(bridge, justification),
  };
}

// The deployment's return service, from its runtime config or the build env. Without one the
// asset is offered for bridging in only: a burned token no service can take stays in this
// browser alone. A container writes every key, so its empty value means "none here" and,
// unlike runtimeSetting(), does not fall back to a URL baked at build time.
function returnServiceUrl(): string | undefined {
  const runtime = readRuntimeConfig()?.BRIDGE_RETURN_SERVICE_URL_SEPOLIA_USDC;
  const url = runtime ?? (import.meta.env.VITE_BRIDGE_RETURN_SERVICE_URL_SEPOLIA_USDC as string | undefined);
  return url?.trim() || undefined;
}

// The account this build pays return fees to, when it names one. A service asking for a fee
// to any other account is refused before the burn. Unset, the service's own account is paid.
function returnFeeRecipient(): Uint8Array | undefined {
  const address = (import.meta.env.VITE_BRIDGE_RETURN_FEE_RECIPIENT_SEPOLIA_USDC as string | undefined)?.trim();
  return address ? fromHex(toEvmAddressHex(address)) : undefined;
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
