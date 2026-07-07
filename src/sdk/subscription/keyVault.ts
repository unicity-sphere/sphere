/**
 * Wallet-side bookkeeping of SGW subscription keys (gateway-side, keys are
 * bearer tokens — nothing is address-bound there; see docs/API.md).
 *
 * Model (wallet-level default, per-address opt-out):
 * - The WALLET key lives in a slot keyed by the index-0 root pubkey — stable
 *   across active-address switches. The free key is provisioned/recovered
 *   against index 0, and by default every address inherits this key.
 * - An address may hold its OWN key (entered or purchased while active on
 *   it) in a slot keyed by that address's pubkey, plus a persisted
 *   preference: 'own' | 'inherit'. No preference and no own key means the
 *   address was never asked — the UI shows a one-time prompt.
 * - The boot cache (localStorage, plaintext, sync) feeds
 *   getActiveOracleApiKey() at provider-build time with whatever key the
 *   resolver picked for the active address.
 *
 * All key values are encrypted at rest (XChaCha20-Poly1305; key derived
 * deterministically from the seed via the index-0 private key, so any
 * restored device can decrypt). Preferences are plain strings (not secret).
 */
import type { Sphere } from '@unicitylabs/sphere-sdk';
import { deriveFieldEncryptionKey, encryptField, decryptField, getPublicKey } from '@unicitylabs/sphere-sdk';
import { STORAGE_KEYS, setStoredSubscriptionKey } from '../../config/storageKeys';

export type AddressKeyPreference = 'own' | 'inherit';

export interface ResolvedKey {
  key: string | null;
  /** 'own' = the address's key; 'wallet' = inherited root key; 'none' = nothing stored. */
  source: 'own' | 'wallet' | 'none';
  /** True when this address never made a choice — the UI should prompt once. */
  needsPrompt: boolean;
}

export function scopedSubscriptionSlot(network: string, pubkey: string): string {
  return `${STORAGE_KEYS.SUBSCRIPTION_API_KEY}.${network}.${pubkey}`;
}

function preferenceSlot(network: string, pubkey: string): string {
  return `${STORAGE_KEYS.SUBSCRIPTION_API_KEY}.pref.${network}.${pubkey}`;
}

/**
 * The wallet's subscription identity: the index-0 address keypair — fixed
 * derivation index so neither the wallet slot nor the encryption key changes
 * with the active address.
 */
function rootIdentity(sphere: Sphere): { privateKey: string; pubkey: string } {
  const { privateKey } = sphere.deriveAddress(0);
  return { privateKey, pubkey: getPublicKey(privateKey) };
}

async function readKeySlot(sphere: Sphere, network: string, pubkey: string): Promise<string | null> {
  try {
    const blob = await sphere.getStorage().get(scopedSubscriptionSlot(network, pubkey));
    if (!blob) return null;
    return decryptField(deriveFieldEncryptionKey(rootIdentity(sphere).privateKey), blob);
  } catch {
    // Not initialized / corrupt / foreign blob — caller falls back to
    // re-provisioning or the prompt (idempotent on the gateway).
    return null;
  }
}

async function writeKeySlot(sphere: Sphere, network: string, pubkey: string, apiKey: string): Promise<void> {
  await sphere
    .getStorage()
    .set(scopedSubscriptionSlot(network, pubkey), encryptField(deriveFieldEncryptionKey(rootIdentity(sphere).privateKey), apiKey));
}

/** Persist the WALLET-wide key (root slot) and make it the active oracle key. */
export async function saveWalletKey(sphere: Sphere, network: string, apiKey: string): Promise<void> {
  await writeKeySlot(sphere, network, rootIdentity(sphere).pubkey, apiKey);
  setStoredSubscriptionKey(apiKey); // boot cache for the next provider build
}

/**
 * Persist a key as the ACTIVE address's OWN key (records the 'own'
 * preference) and make it the active oracle key.
 */
export async function saveAddressKey(sphere: Sphere, network: string, apiKey: string): Promise<void> {
  const pubkey = sphere.identity?.chainPubkey;
  if (!pubkey) throw new Error('Wallet identity unavailable');
  await writeKeySlot(sphere, network, pubkey, apiKey);
  await setAddressPreference(sphere, network, 'own');
  setStoredSubscriptionKey(apiKey);
}

export async function setAddressPreference(sphere: Sphere, network: string, pref: AddressKeyPreference): Promise<void> {
  const pubkey = sphere.identity?.chainPubkey;
  if (!pubkey) throw new Error('Wallet identity unavailable');
  await sphere.getStorage().set(preferenceSlot(network, pubkey), pref);
}

async function getAddressPreference(sphere: Sphere, network: string, pubkey: string): Promise<AddressKeyPreference | null> {
  try {
    const v = await sphere.getStorage().get(preferenceSlot(network, pubkey));
    return v === 'own' || v === 'inherit' ? v : null;
  } catch {
    return null;
  }
}

/** The wallet-wide key (root slot), if any. */
export function loadWalletKey(sphere: Sphere, network: string): Promise<string | null> {
  try {
    return readKeySlot(sphere, network, rootIdentity(sphere).pubkey);
  } catch {
    return Promise.resolve(null);
  }
}

/**
 * Picks the key the ACTIVE address should use:
 * - active address IS index 0 → the wallet key;
 * - address has its own key → it wins;
 * - preference 'inherit' (or 'own' with a lost slot) → the wallet key;
 * - no own key and no preference → wallet key provisionally + needsPrompt
 *   (the one-time "buy / enter / use wallet key" prompt).
 */
export async function resolveActiveKey(sphere: Sphere, network: string): Promise<ResolvedKey> {
  try {
    const root = rootIdentity(sphere);
    const active = sphere.identity?.chainPubkey;
    const walletKey = await readKeySlot(sphere, network, root.pubkey);

    if (!active || active === root.pubkey) {
      return { key: walletKey, source: walletKey ? 'wallet' : 'none', needsPrompt: false };
    }

    const own = await readKeySlot(sphere, network, active);
    if (own) return { key: own, source: 'own', needsPrompt: false };

    const pref = await getAddressPreference(sphere, network, active);
    if (pref !== null) {
      return { key: walletKey, source: walletKey ? 'wallet' : 'none', needsPrompt: false };
    }
    return { key: walletKey, source: walletKey ? 'wallet' : 'none', needsPrompt: true };
  } catch {
    return { key: null, source: 'none', needsPrompt: false };
  }
}
