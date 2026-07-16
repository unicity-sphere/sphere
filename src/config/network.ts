import { NETWORKS } from '@unicitylabs/sphere-sdk';
import type { NetworkType } from '@unicitylabs/sphere-sdk';
import { STORAGE_KEYS } from './storageKeys';
import { runtimeFlag } from './runtimeConfig';
import { BUILD_DEFAULT_NETWORK, hasWalletApiUrl, isWalletApiRequired } from './walletApiNetworks';

export { BUILD_DEFAULT_NETWORK };

/** Why a network is not offered — drives honest UI copy, never a lie. */
export type UnavailableReason =
  /** The SDK has not onboarded it (no trust base / networkId yet). */
  | 'not-onboarded'
  /** Live, but THIS deployment has no backend for it. */
  | 'not-served-here'
  /** Live and served, but the rollout switch is still off. */
  | 'not-rolled-out';

/** One row in the Settings → Network screen. */
export interface SupportedNetwork {
  readonly id: NetworkType;
  readonly label: string;
  readonly available: boolean;
  readonly unavailableReason?: UnavailableReason;
}

/**
 * The SDK's NetworkConfig interface is not exported from the package root
 * (only NETWORKS and NetworkType are), so type the fields we read
 * structurally.
 */
interface NetworkTableEntry {
  readonly name: string;
  readonly networkId?: number;
}

/**
 * Deliberate mainnet rollout switch, off unless EXACTLY 'true' — the
 * PAID_PLANS_ENABLED precedent. Without it, mainnet would go live the moment
 * the SDK ships a networkId AND someone sets a URL, turning a routine config
 * change into a launch while money-safety prerequisites are still open.
 */
const MAINNET_ROLLOUT_ENABLED = runtimeFlag(
  'MAINNET_ROLLOUT_ENABLED',
  import.meta.env.VITE_MAINNET_ROLLOUT_ENABLED as string | undefined,
);

/**
 * Why a network cannot be offered, or undefined when it can. Three independent
 * gates, reported in the order they must be fixed:
 *  (a) the SDK must know the network (a canonical networkId marks a live v2
 *      network — see SPHERE_NETWORKS in sphere-sdk/constants.ts);
 *  (b) THIS deployment must be able to serve it — a wallet-api deployment with
 *      no backend URL for a network cannot run it at all (the SDK client is
 *      bound to the network and its sign-in would be refused), so offering the
 *      row would only ever produce a broken wallet;
 *  (c) mainnet additionally waits for the explicit rollout switch.
 */
function unavailableReasonFor(id: NetworkType, entry: NetworkTableEntry): UnavailableReason | undefined {
  if (entry.networkId == null) return 'not-onboarded';
  // Legacy local-custody deployments serve every network locally, so only
  // wallet-api deployments are gated on having a URL.
  if (isWalletApiRequired() && !hasWalletApiUrl(id)) return 'not-served-here';
  if (id === 'mainnet' && !MAINNET_ROLLOUT_ENABLED) return 'not-rolled-out';
  return undefined;
}

/**
 * Networks the wallet offers, in display order. This is the SINGLE predicate
 * behind the UI gate, isSwitchableNetwork, the boot resolve and the
 * setActiveNetwork throw — which is what makes a broken switch impossible: a
 * network this deployment cannot serve is never selectable, and a persisted
 * choice that stops being available falls back to the build default on the
 * next load rather than booting a wallet that cannot work.
 */
export const SUPPORTED_NETWORKS: readonly SupportedNetwork[] = (
  ['testnet2', 'mainnet'] as const
).map((id) => {
  const entry: NetworkTableEntry = NETWORKS[id];
  const unavailableReason = unavailableReasonFor(id, entry);
  return { id, label: entry.name, available: unavailableReason === undefined, unavailableReason };
});

/**
 * True when `id` may be activated at runtime: any UI-available network, plus
 * 'dev' as a developer escape hatch (set via the browser console) — the only
 * other network that constructs providers today; end-to-end switch
 * verification needs it while testnet2 is the single live network.
 */
export function isSwitchableNetwork(id: string): id is NetworkType {
  if (id === 'dev') return true;
  return SUPPORTED_NETWORKS.some((n) => n.id === id && n.available);
}

/**
 * Maps a persisted raw value to the network this session should run on.
 * Anything unknown or unavailable (e.g. 'mainnet' before SDK onboarding, the
 * legacy 'testnet' alias, or a hand-edited garbage value) falls back to the
 * build default, so a bad localStorage value can never brick the app into a
 * network whose providers refuse to construct.
 */
export function resolveActiveNetwork(stored: string | null): NetworkType {
  return stored !== null && isSwitchableNetwork(stored) ? stored : BUILD_DEFAULT_NETWORK;
}

function readStoredNetwork(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_NETWORK);
  } catch {
    return null; // storage blocked (privacy mode) → build default
  }
}

/**
 * The Unicity network this SESSION runs on. Single source of truth — used by
 * SphereProvider (main.tsx) and for deriving per-network service URLs
 * (src/config/subscription.ts, src/services/subscriptionApi.ts). Resolved
 * ONCE at module load: every module-scope const derived from it stays
 * consistent for the whole page lifetime. Switching networks is persist +
 * reload (setActiveNetwork below) — never an in-place re-init.
 */
export const SPHERE_NETWORK: NetworkType = resolveActiveNetwork(readStoredNetwork());

/**
 * Set when the persisted choice could NOT be honoured and this session fell
 * back — e.g. the user picked mainnet and the deployment later stopped serving
 * it, or the SDK has not onboarded it (yet or any more).
 *
 * This MUST be surfaced. Networks are isolated worlds, so a silent fallback
 * shows the user an empty wallet on another network and reads as "my funds are
 * gone". The stored value is deliberately NOT repaired: it is the user's
 * standing intent, so the wallet returns to their network by itself once the
 * deployment can serve it again; the notice is what keeps that from being a
 * surprise in either direction.
 */
export const NETWORK_DOWNGRADED_FROM: string | null = (() => {
  const stored = readStoredNetwork();
  return stored !== null && stored !== SPHERE_NETWORK ? stored : null;
})();

/** BroadcastChannel name used to tell other tabs the active network changed. */
export const NETWORK_BROADCAST_CHANNEL = 'sphere-network';

/** Message posted on NETWORK_BROADCAST_CHANNEL by setActiveNetwork(). */
export interface NetworkChangedMessage {
  type: 'network-changed';
  network: NetworkType;
}

/**
 * Switch the active network: persist the choice, tell other tabs, reload.
 * Throws on a non-switchable id (mainnet until the SDK onboards it) so a
 * caller bug can never persist a network the app cannot boot. `opts.reload`
 * is a test seam — jsdom cannot mock window.location.reload; production
 * callers omit it.
 */
export function setActiveNetwork(id: NetworkType, opts: { reload?: () => void } = {}): void {
  if (!isSwitchableNetwork(id)) {
    throw new Error(`Network "${id}" is not available for switching`);
  }
  if (id === SPHERE_NETWORK) return; // already active — nothing to do

  localStorage.setItem(STORAGE_KEYS.ACTIVE_NETWORK, id);
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(NETWORK_BROADCAST_CHANNEL);
      const message: NetworkChangedMessage = { type: 'network-changed', network: id };
      channel.postMessage(message);
      channel.close();
    }
  } catch {
    // Cross-tab notify is best-effort — the 'storage' event fallback in
    // src/sdk/networkSync.ts still reloads other tabs.
  }
  (opts.reload ?? (() => window.location.reload()))();
}
