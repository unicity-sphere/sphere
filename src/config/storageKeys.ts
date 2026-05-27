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

  // Wallet token-storage mode preference ('legacy' | 'profile').
  // Read at boot to decide which providers to construct. When unset
  // and IS_UXF_BUILD, the legacy-→Profile boot migration controls
  // the choice; once a user clicks a switch button we persist their
  // preference here so reloads honor it.
  WALLET_MODE_PREFERENCE: 'sphere_wallet_mode_preference',

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
