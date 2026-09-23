import {
  buildBridgeBackBurnReason,
  burnIdentifiers,
  burnTransitionId,
  decodeBridgeBackReason,
  nullifier,
  TRON_MAINNET_CHAIN_ID,
  TRON_NILE_CHAIN_ID,
  TronHttpRpcClient,
  type BridgeBackReason,
} from '@unicitylabs/bridge-plugin';
import {
  bridgePresentation,
  bridgeTokenPlugin,
  createSourceAdapter,
  loadBridges,
  mintedAgainst,
  NILE_USDT_BRIDGE,
  ReturnServiceClient,
  ReturnServiceError,
  type ReturnRecord,
  toEvmAddressHex,
  tronLinkProvider,
  type DepositWallet,
  type LoadedBridge,
  type SourceSigner,
  withReturnServiceUrl,
} from '@unicitylabs/bridge-plugin/wallet';
import type { ReceiptReader } from '@unicitylabs/bridge-core';

import type { BridgeAsset, BridgeAssetProvider, BridgeChain, BridgeInDeps, BridgeOutSide, BridgeWalletOption, ReturnServiceRecord } from '../../types';
import { devKeySigner } from './devSigner';

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
    chain: tronChain(m.chainId, m.chainRef),
    priceUsd: 1,
    confirmations: m.confirmations,
    networks: ['testnet', 'testnet2'],
    tokenPlugin: bridgeTokenPlugin(bridge),
    presentation: bridgePresentation(bridge),
    wallets,
    resumeDeps: () => ({ adapter: createSourceAdapter(bridge, NEVER_SIGNS, rpc), receipts }),
    out: tronOut(bridge),
    disabledReason: m.disabledReason,
  };
}

function withServiceUrl(m: typeof NILE_USDT_BRIDGE): typeof NILE_USDT_BRIDGE {
  const url = import.meta.env.VITE_BRIDGE_RETURN_SERVICE_URL as string | undefined;
  return url ? withReturnServiceUrl(m, url) : m;
}

const ZERO_ADDRESS = new Uint8Array(20);
const RETURN_DEADLINE_SECONDS = 3600;

function tronOut(bridge: LoadedBridge): BridgeOutSide {
  const cfg = bridge.bridgeConfig;
  const client = new ReturnServiceClient(bridge.manifest.returnServiceUrl);
  return {
    reasonFor: ({ amount, destination }) => {
      const reason: BridgeBackReason = {
        version: 1n,
        recipient: fromHex(toEvmAddressHex(destination)),
        amount,
        feeRecipient: ZERO_ADDRESS,
        feeAmount: 0n,
        deadline: BigInt(Math.floor(Date.now() / 1000) + RETURN_DEADLINE_SECONDS),
      };
      return buildBridgeBackBurnReason(cfg, reason).reasonBytes;
    },
    identify: async (burnedToken) => {
      const ids = await burnIdentifiers(burnedToken);
      let reason;
      try {
        reason = decodeBridgeBackReason(ids.reasonBytes);
      } catch {
        return null;
      }
      if (!bytesEqual(reason.vault, cfg.vault) || !bytesEqual(reason.coinId, cfg.coinId)) return null;
      return {
        nullifierHex: toHex(nullifier(bridge.configHash, burnTransitionId(ids.burnStateId, ids.burnTxHash))),
        destination: `0x${toHex(reason.recipient)}`,
        amount: reason.amount,
      };
    },
    backs: (justification) => mintedAgainst(bridge, justification),
    returns: {
      submit: async (burnedToken, reasonBytes) =>
        serviceRecord(await client.postReturn({ tokenCbor: burnedToken, configHash: bridge.configHash, reasonBytes })),
      status: async (returnId) => {
        try {
          return serviceRecord(await client.getReturn(returnId));
        } catch (err) {
          if (err instanceof Error && /HTTP 404/.test(err.message)) return null;
          throw err;
        }
      },
      refusal: (err) => (err instanceof ReturnServiceError ? { message: err.message, recoverable: err.recoverable } : null),
      timing: async () => {
        try {
          const health = await client.getHealth();
          return { provingSinceMs: health.provingSinceMs ?? undefined, averageProofMs: health.averageProofMs ?? undefined };
        } catch {
          return null;
        }
      },
    },
  };
}

function serviceRecord(rec: ReturnRecord): ReturnServiceRecord {
  return {
    returnId: rec.returnId,
    status: rec.status,
    settleTxid: rec.settleTxid,
    message: rec.message,
    recoverable: rec.failure?.recoverable,
    queuePosition: rec.queuePosition ?? undefined,
    sinceMs: rec.updatedAtMs,
  };
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function toHex(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s;
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
