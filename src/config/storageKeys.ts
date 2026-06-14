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

  // Nostr peer transport (messaging + token delivery). 'false' = full-offline mode
  // (the wallet boots local-only; peer send/receive unavailable until re-enabled).
  NOSTR_ENABLED: 'sphere_nostr_enabled',

  // Cloud backup & sync (token-api Vault + courier). Holds a JSON
  // VaultStoreSetting ({ mode, customUrl? }) — see config/vaultStore.ts.
  VAULT_STORE: 'sphere_vault_store',

  // Stable per-browser device id for the vault auth session. token-api keys ONE
  // session per (ownerId, deviceId); without a distinct id every browser used the
  // SDK default 'sphere-vault', so a 2nd browser's login rotated the 1st's session
  // and its next /v1/auth/refresh got 401. A persisted UUID = one session/browser.
  VAULT_DEVICE_ID: 'sphere_vault_device_id',

  // Desktop state (open tabs, active tab)
  DESKTOP_STATE: 'sphere_desktop_state',

  // Connected Sites (approved dApp origins)
  CONNECTED_SITES: 'sphere_connected_sites',

  // Dev Settings
  DEV_AGGREGATOR_URL: 'sphere_dev_aggregator_url',
  DEV_SKIP_TRUST_BASE: 'sphere_dev_skip_trust_base',
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
