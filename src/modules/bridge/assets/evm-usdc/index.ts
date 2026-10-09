import { ETHEREUM_MAINNET_CHAIN_ID, EvmJsonRpcClient, fromHex, SEPOLIA_CHAIN_ID, toEvmAddressHex } from '@unicitylabs/bridge-plugin';
import {
  bridgePresentation,
  bridgeTokenPlugin,
  createSourceAdapter,
  evmWallets,
  findLock,
  loadBridges,
  queryBalance,
  lockFinality,
  owedTo,
  withdrawCall,
  SEPOLIA_USDC_BRIDGE,
  withReturnServiceUrl,
  type DepositWallet,
  type LoadedBridge,
  type SourceSigner,
  type SourceWalletProvider,
} from '@unicitylabs/bridge-plugin/wallet';
import type { ReceiptReader } from '@unicitylabs/bridge-core';

import { readRuntimeConfig } from '../../../../config/runtimeConfig';
import { truncateId } from '../../../../utils/identifiers';
import type { BridgeAsset, BridgeAssetProvider, BridgeChain, BridgeInDeps, BridgeWalletOption } from '../../types';
import { assertOnChain } from '../../bridgeIn';
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
    held: (owner) => queryBalance(rpc, { assetAddress: bridge.plugin.resolvedConfig.assetContractHex, owner }),
    expectedNetwork: m.chainId,
    chainLabel: m.label,
  });

  const discovered = evmWallets();
  const collectWith = async (wallet: SourceWalletProvider, destination: string): Promise<string> => {
    const signer = wallet.create(m.chainId);
    await signer.connect();
    assertOnChain(await signer.getNetwork(), m.chainId, m.label);
    const from = await signer.getAddress();
    if (toEvmAddressHex(from) !== toEvmAddressHex(destination)) {
      throw new Error(`To collect, switch your wallet to the correct account: ${truncateId(destination)}`);
    }
    return signer.sendCall(withdrawCall(bridge));
  };
  const optionFor = (wallet: SourceWalletProvider): BridgeWalletOption => ({
    id: wallet.id,
    name: wallet.name,
    icon: wallet.icon,
    unavailableHint: 'Install an Ethereum browser wallet to sign on Ethereum.',
    isAvailable: () => wallet.isAvailable(),
    open: () => depsFor(wallet.create(m.chainId)),
    collect: (destination) => collectWith(wallet, destination),
  });

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
    wallets: () => discovered.list().map(optionFor),
    resumeDeps: () => ({ adapter: createSourceAdapter(bridge, NEVER_SIGNS, rpc), receipts }),
    findLock: async ({ from, tokenIdHex, createdAt }) => {
      const result = await findLock(bridge, rpc, { fromAddressHex: toEvmAddressHex(from), unicityTokenIdHex: tokenIdHex, startedAtMs: createdAt, nowMs: Date.now() });
      return result.outcome === 'found' ? { outcome: 'found', lockTxid: `0x${result.txid}` } : result;
    },
    out: hasReturnService
      ? bridgeOut(bridge, (destination) => fromHex(toEvmAddressHex(destination)), {
          feeCap: RETURN_FEE_CAP,
          feeRecipient: returnFeeRecipient(),
          payout: { owed: (destination) => owedTo(bridge, rpc, destination) },
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

// The account this deployment pays return fees to, when it names one, read from the same
// place as the service URL: a container's key wins even when empty, the build env is used
// only when no container wrote the config. A service asking for a fee to any other account
// is refused before the burn. Unset, the service's own account is paid.
function returnFeeRecipient(): Uint8Array | undefined {
  const runtime = readRuntimeConfig()?.BRIDGE_RETURN_FEE_RECIPIENT_SEPOLIA_USDC;
  const address = (runtime ?? (import.meta.env.VITE_BRIDGE_RETURN_FEE_RECIPIENT_SEPOLIA_USDC as string | undefined))?.trim();
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
