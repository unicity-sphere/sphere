/**
 * Plaintext boot cache for the per-wallet SGW subscription key.
 *
 * WHY PER NETWORK: an SGW key is minted per network (its owner is
 * `network:pubkey`) and a key from one network is simply unknown to another's
 * gateway. A single global slot meant that after a network switch the oracle
 * was built with the PREVIOUS network's key and the send gate reported 'ready'
 * on it — sends then failed against a gateway that had never heard of the key.
 * Scoping the slot makes the two networks' keys coexist instead of overwriting
 * each other, which is also what happens when a user switches back and forth.
 *
 * This is only the cache the next provider build reads; the durable, encrypted
 * copy lives in the key vault (src/sdk/subscription/keyVault.ts), already
 * scoped per (network, chainPubkey).
 *
 * Lives here rather than in storageKeys.ts because it needs the active network,
 * and storageKeys.ts is the leaf that network.ts itself imports.
 */
import { STORAGE_KEYS } from './storageKeys';
import { SPHERE_NETWORK } from './network';
import { LEGACY_URL_NETWORK } from './walletApiNetworks';

function slot(network: string): string {
  return `${STORAGE_KEYS.SUBSCRIPTION_API_KEY}.${network}`;
}

/**
 * The key cached for the active network, or null.
 *
 * One-time migration: every deployment predating per-network scoping ran the
 * one network the legacy slot could have belonged to, so an unscoped value is
 * adopted into that network's slot and removed. Safe to delete, unlike the SDK
 * cursors: this slot is app-owned, and the durable copy is in the vault.
 */
export function getStoredSubscriptionKey(): string | null {
  const scoped = localStorage.getItem(slot(SPHERE_NETWORK));
  if (scoped !== null) return scoped;

  const legacy = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_API_KEY);
  if (legacy === null) return null;
  localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_API_KEY);
  if (SPHERE_NETWORK !== LEGACY_URL_NETWORK) return null; // not this network's key
  localStorage.setItem(slot(SPHERE_NETWORK), legacy);
  return legacy;
}

export function setStoredSubscriptionKey(key: string): void {
  localStorage.setItem(slot(SPHERE_NETWORK), key);
}
