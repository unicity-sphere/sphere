/**
 * App-side bridge wiring (06 §W0/§A2). This is the *entire* bridge surface Sphere
 * (the app) owns: it imports the plugin façade + a manifest, asks the façade to
 * build the verifiers, and projects the manifest into the SDK's `SphereBridgeInfo`
 * for the UI. Decision #2: no chain-agnostic bridge logic lives here — every hash
 * / derivation stays in `@unicitylabs/bridge-plugin-tron-usdt`.
 */
import { spherePaymentAmountExtractor } from '@unicitylabs/sphere-sdk/token-engine';
import type { SphereBridgeInfo } from '@unicitylabs/sphere-sdk';
import { TronHttpRpcClient } from '@unicitylabs/bridge-plugin-tron-usdt';
import {
  buildBridgeRegistry,
  createTronSourceAdapter,
  explorerTxUrl,
  isValidTronAddress,
  loadBridges as loadBridgesFacade,
  NILE_USDT_BRIDGE,
  TronLinkSigner,
  withReturnServiceUrl,
  type BridgeManifest,
  type BridgeRegistry,
  type BridgeSourceAdapter,
  type LoadedBridge,
  type TronSigner,
} from '@unicitylabs/bridge-plugin-tron-usdt/lib/wallet/index.js';

import type { BridgeInDeps, ReceiptReader } from './bridgeIn';

export type { BridgeManifest, LoadedBridge };

/**
 * Chain-agnostic UI helpers (08 §8): the modal asks the bridge for its explorer
 * URL / destination validation by `chainId`, instead of hardcoding a Nile URL or
 * the Tron address shape. A second chain's plugin supplies its own.
 */
export function bridgeExplorerTxUrl(chainId: number, txid: string): string {
  return explorerTxUrl(chainId, txid);
}

/** Whether `addr` is a valid destination on the given bridge's source chain. */
export function isValidBridgeDestination(chainId: number, addr: string): boolean {
  void chainId; // single chain today; dispatch on chainId when a second lands
  return isValidTronAddress(addr);
}

/** Resolved bridges: engine verifiers + UI metadata + the indexed plugins (for flows). */
export interface AppBridges {
  /** Forwarded into `Sphere.init({ bridgeJustificationVerifiers })`. */
  readonly bridgeJustificationVerifiers: LoadedBridge['plugin']['verifier'][];
  /** Forwarded into `Sphere.init({ bridges })` — drives the UI badge + flows. */
  readonly bridges: SphereBridgeInfo[];
  /** The resolved bridges, indexed by family+chain+asset / coinId / tokenType. */
  readonly registry: BridgeRegistry;
}

/** The manifests this app ships. Override the return-service URL from env. */
export function appBridgeManifests(): BridgeManifest[] {
  const returnServiceUrl = import.meta.env.VITE_BRIDGE_RETURN_SERVICE_URL as string | undefined;
  const nile = returnServiceUrl ? withReturnServiceUrl(NILE_USDT_BRIDGE, returnServiceUrl) : NILE_USDT_BRIDGE;
  return [nile];
}

/**
 * Resolve the app's bridge manifests into everything `Sphere.init` + the UI need.
 * Throws (loudly, at startup) if a manifest's integrity pin (`configHash` /
 * identifiers) does not match the deployed vault — never silently mis-trust.
 */
export function loadAppBridges(manifests: BridgeManifest[] = appBridgeManifests()): AppBridges {
  const loaded = loadBridgesFacade(manifests, { extractAmount: spherePaymentAmountExtractor });

  const bridges: SphereBridgeInfo[] = loaded.map((l) => ({
    coinIdHex: l.plugin.coinIdHex,
    tokenTypeHex: l.plugin.tokenTypeHex,
    label: l.manifest.label,
    symbol: l.manifest.symbol,
    decimals: l.plugin.decimals,
    confirmations: l.manifest.confirmations,
    chainId: l.manifest.chainId,
    returnServiceUrl: l.manifest.returnServiceUrl,
    vault: l.manifest.vault,
    asset: l.manifest.asset,
  }));

  return {
    bridgeJustificationVerifiers: loaded.map((l) => l.plugin.verifier),
    bridges,
    registry: buildBridgeRegistry(loaded),
  };
}

let cached: AppBridges | null = null;
/** Memoized {loadAppBridges} — the verifiers/plugins are stateless + reusable. */
export function getAppBridges(): AppBridges {
  if (!cached) cached = loadAppBridges();
  return cached;
}

/**
 * Composition root for the chain-neutral bridge-in orchestrator (08 Phase 4). The
 * orchestrator (`runBridgeIn`) contains no Tron; this is where the concrete Tron
 * wiring — the TronLink wallet, the HTTP node client, and the source adapter — is
 * assembled into the neutral {BridgeInDeps} it runs on. A second chain adds its own
 * factory here; nothing in `bridgeIn.ts` changes.
 */
export function createBridgeInDeps(bridge: LoadedBridge, signer?: TronSigner): BridgeInDeps {
  const wallet: TronSigner = signer ?? new TronLinkSigner(undefined, bridge.manifest.chainId);
  const rpc = new TronHttpRpcClient({ baseUrl: bridge.manifest.rpcUrl, apiKey: bridge.manifest.apiKey });
  const adapter = createTronSourceAdapter(bridge, wallet, rpc, { extractAmount: spherePaymentAmountExtractor });
  return {
    wallet,
    receipts: receiptReaderFor(rpc),
    adapter,
    expectedNetwork: bridge.manifest.chainId,
    chainLabel: bridge.manifest.label,
  };
}

/** Recovery deps for `resumeBridgeMint` (decode + mint only — never signs). */
export function createResumeDeps(bridge: LoadedBridge): { adapter: BridgeSourceAdapter; receipts: ReceiptReader } {
  const rpc = new TronHttpRpcClient({ baseUrl: bridge.manifest.rpcUrl, apiKey: bridge.manifest.apiKey });
  const adapter = createTronSourceAdapter(bridge, RESUME_NOOP_WALLET, rpc, { extractAmount: spherePaymentAmountExtractor });
  return { adapter, receipts: receiptReaderFor(rpc) };
}

/** Adapt a Tron node client's `getTransactionInfo` to the neutral {ReceiptReader}. */
function receiptReaderFor(rpc: TronHttpRpcClient): ReceiptReader {
  return { getReceipt: (txid) => rpc.getTransactionInfo(txid) };
}

/** A wallet that never signs — the adapter needs one for decode/mint-only recovery. */
const RESUME_NOOP_WALLET = {
  getAddress: async () => '',
  sendCall: async (): Promise<string> => {
    throw new Error('resumeBridgeMint does not sign');
  },
};
