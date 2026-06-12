/**
 * Storage Keys Configuration
 *
 * Centralized configuration for all localStorage keys
 * used throughout the Sphere application.
 *
 * All keys use the `sphere_` prefix for:
 * - Easy identification of app-specific data
 * - Bulk cleanup on wallet logout
 * - Avoiding conflicts with other apps
 */

export const STORAGE_KEYS = {
  // Theme preference (light/dark)
  THEME: 'sphere_theme',

  // Tutorial completion flag
  TUTORIAL_COMPLETED: 'sphere_tutorial_completed',

  // Chat UI State
  CHAT_MODE: 'sphere_chat_mode',
  CHAT_SELECTED_GROUP: 'sphere_chat_selected_group',
  CHAT_SELECTED_DM: 'sphere_chat_selected_dm',

  // IPFS
  IPFS_ENABLED: 'sphere_ipfs_enabled',

  // Desktop state (open tabs, active tab)
  DESKTOP_STATE: 'sphere_desktop_state',

  // Connected Sites (approved dApp origins)
  CONNECTED_SITES: 'sphere_connected_sites',

  // Dev Settings
  DEV_AGGREGATOR_URL: 'sphere_dev_aggregator_url',
  DEV_SKIP_TRUST_BASE: 'sphere_dev_skip_trust_base',

  // wallet-api device label — one session row per (owner, device) on the
  // backend; the SDK stores the refresh token under it (ARCHITECTURE §4).
  WALLET_API_DEVICE_ID: 'sphere_wallet_api_device_id',
} as const;

const STORAGE_PREFIX = 'sphere_';

/**
 * Clear all Sphere data from localStorage.
 * Messages are recovered from Nostr relay on next login (self-wrap replay).
 */
export function clearAllSphereData(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
  if (import.meta.env.DEV) console.log(`Cleared ${keysToRemove.length} sphere keys from localStorage`);
}

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

/**
 * Stable per-device label for the wallet-api session (ARCHITECTURE §4: one
 * session row per (owner, device); the refresh token is stored under it).
 * Persisted so reloads reuse the session instead of forcing a fresh
 * challenge sign-in and a new server session row per page load.
 *
 * The key carries the `sphere_` prefix, so `clearAllSphereData()` (wallet
 * deletion) resets the device identity together with everything else.
 */
export function getOrCreateWalletApiDeviceId(): string {
  const existing = localStorage.getItem(STORAGE_KEYS.WALLET_API_DEVICE_ID);
  if (existing) return existing;
  const deviceId = `sphere-web-${crypto.randomUUID()}`;
  localStorage.setItem(STORAGE_KEYS.WALLET_API_DEVICE_ID, deviceId);
  return deviceId;
}
