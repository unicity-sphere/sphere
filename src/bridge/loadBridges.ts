/**
 * App-side bridge wiring (06 §W0/§A2). This is the *entire* bridge surface Sphere
 * (the app) owns: it imports the plugin façade + a manifest, asks the façade to
 * build the verifiers, and projects the manifest into the SDK's `SphereBridgeInfo`
 * for the UI. Decision #2: no chain-agnostic bridge logic lives here — every hash
 * / derivation stays in `@unicitylabs/bridge-plugin-tron-usdt`.
 */
import { spherePaymentAmountExtractor } from '@unicitylabs/sphere-sdk/token-engine';
import type { SphereBridgeInfo } from '@unicitylabs/sphere-sdk';
import {
  explorerTxUrl,
  isValidTronAddress,
  loadBridges as loadBridgesFacade,
  NILE_USDT_BRIDGE,
  withReturnServiceUrl,
  type BridgeManifest,
  type LoadedBridge,
} from '@unicitylabs/bridge-plugin-tron-usdt/lib/wallet/index.js';

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

/** Resolved bridges: engine verifiers + UI metadata + the loaded plugins (for flows). */
export interface AppBridges {
  /** Forwarded into `Sphere.init({ bridgeJustificationVerifiers })`. */
  readonly bridgeJustificationVerifiers: LoadedBridge['plugin']['verifier'][];
  /** Forwarded into `Sphere.init({ bridges })` — drives the UI badge + flows. */
  readonly bridges: SphereBridgeInfo[];
  /** The resolved plugins keyed by coinIdHex — the in/out flows use these. */
  readonly loaded: readonly LoadedBridge[];
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
    loaded,
  };
}

let cached: AppBridges | null = null;
/** Memoized {loadAppBridges} — the verifiers/plugins are stateless + reusable. */
export function getAppBridges(): AppBridges {
  if (!cached) cached = loadAppBridges();
  return cached;
}
