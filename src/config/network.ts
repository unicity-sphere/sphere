import { NETWORKS } from '@unicitylabs/sphere-sdk';
import type { NetworkType } from '@unicitylabs/sphere-sdk';
import { STORAGE_KEYS } from './storageKeys';

/** The network this build falls back to when no (valid) choice is persisted. */
const BUILD_DEFAULT_NETWORK: NetworkType = 'testnet2';

/** One selectable row in the Settings → Network screen. */
export interface SupportedNetwork {
  readonly id: NetworkType;
  readonly label: string;
  readonly available: boolean;
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
 * Networks the wallet offers in the UI, in display order. `available` derives
 * from the SDK's NETWORKS table: a network is selectable once it carries a
 * canonical `networkId` (only live v2 networks do — see SPHERE_NETWORKS in
 * sphere-sdk/constants.ts). Mainnet therefore lists as "Coming soon" and
 * flips to selectable automatically when the SDK onboards it — nothing to
 * change here.
 */
export const SUPPORTED_NETWORKS: readonly SupportedNetwork[] = (
  ['testnet2', 'mainnet'] as const
).map((id) => {
  const entry: NetworkTableEntry = NETWORKS[id];
  return { id, label: entry.name, available: entry.networkId != null };
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
