/**
 * Per-identity persistence for the SGW subscription key.
 * - Boot cache (localStorage, plaintext, sync) feeds getActiveOracleApiKey() at
 *   provider-build time — it always holds the ACTIVE identity's key.
 * - Scoped entries (sphere.getStorage(), XChaCha20-Poly1305 via the SDK's
 *   field-encryption, key derived deterministically from the seed) are the
 *   per-(network, chainPubkey) truth — they survive wallet/network switches and
 *   any restored device can decrypt them.
 */
import type { Sphere } from '@unicitylabs/sphere-sdk';
import { deriveFieldEncryptionKey, encryptField, decryptField } from '@unicitylabs/sphere-sdk';
import { STORAGE_KEYS, setStoredSubscriptionKey } from '../../config/storageKeys';

export function scopedSubscriptionSlot(network: string, chainPubkey: string): string {
  return `${STORAGE_KEYS.SUBSCRIPTION_API_KEY}.${network}.${chainPubkey}`;
}

function encryptionKey(sphere: Sphere): Uint8Array {
  // Fixed derivation index — the key must not change with the active address.
  return deriveFieldEncryptionKey(sphere.deriveAddress(0).privateKey);
}

export async function saveScopedKey(sphere: Sphere, network: string, apiKey: string): Promise<void> {
  const pubkey = sphere.identity?.chainPubkey;
  if (!pubkey) throw new Error('Wallet identity unavailable');
  await sphere.getStorage().set(scopedSubscriptionSlot(network, pubkey), encryptField(encryptionKey(sphere), apiKey));
  setStoredSubscriptionKey(apiKey); // boot cache for the next provider build
}

export async function loadScopedKey(sphere: Sphere, network: string): Promise<string | null> {
  const pubkey = sphere.identity?.chainPubkey;
  if (!pubkey) return null;
  const blob = await sphere.getStorage().get(scopedSubscriptionSlot(network, pubkey));
  if (!blob) return null;
  try {
    return decryptField(encryptionKey(sphere), blob);
  } catch {
    return null; // corrupt/foreign blob — caller falls back to re-provisioning
  }
}
