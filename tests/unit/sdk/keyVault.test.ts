import { describe, it, expect, beforeEach } from 'vitest';
import { getPublicKey } from '@unicitylabs/sphere-sdk';
import {
  saveWalletKey,
  saveAddressKey,
  loadWalletKey,
  resolveActiveKey,
  setAddressPreference,
  scopedSubscriptionSlot,
} from '@/sdk/subscription/keyVault';
import { getStoredSubscriptionKey } from '@/config/storageKeys';

const ROOT_PRIV = '1'.repeat(64);
const ROOT_PUBKEY = getPublicKey(ROOT_PRIV);
const ADDR2_PUBKEY = '02' + 'b'.repeat(64);

function fakeSphere(activePubkey: string = ROOT_PUBKEY) {
  const store = new Map<string, string>();
  return {
    deriveAddress: (i: number) => {
      if (i !== 0) throw new Error('fake only derives index 0');
      return { privateKey: ROOT_PRIV };
    },
    identity: { chainPubkey: activePubkey },
    getStorage: () => ({
      get: async (k: string) => store.get(k) ?? null,
      set: async (k: string, v: string) => void store.set(k, v),
      remove: async (k: string) => void store.delete(k),
    }),
    _store: store,
  };
}

describe('keyVault (wallet-level default, per-address opt-out)', () => {
  beforeEach(() => localStorage.clear());

  it('saveWalletKey writes the encrypted ROOT slot regardless of active address + boot cache', async () => {
    const sphere = fakeSphere(ADDR2_PUBKEY); // active on address 2
    await saveWalletKey(sphere as never, 'testnet2', 'sk_wallet');
    expect(sphere._store.get(scopedSubscriptionSlot('testnet2', ROOT_PUBKEY))).toMatch(/^enc1\./);
    expect(sphere._store.has(scopedSubscriptionSlot('testnet2', ADDR2_PUBKEY))).toBe(false);
    expect(getStoredSubscriptionKey()).toBe('sk_wallet');
    await expect(loadWalletKey(sphere as never, 'testnet2')).resolves.toBe('sk_wallet');
  });

  it('saveAddressKey writes the ACTIVE address slot, records the own preference, updates cache', async () => {
    const sphere = fakeSphere(ADDR2_PUBKEY);
    await saveAddressKey(sphere as never, 'testnet2', 'sk_own');
    expect(sphere._store.get(scopedSubscriptionSlot('testnet2', ADDR2_PUBKEY))).toMatch(/^enc1\./);
    expect(getStoredSubscriptionKey()).toBe('sk_own');
    const resolved = await resolveActiveKey(sphere as never, 'testnet2');
    expect(resolved).toEqual({ key: 'sk_own', source: 'own', needsPrompt: false });
  });

  it('resolves the wallet key when active address IS index 0', async () => {
    const sphere = fakeSphere(ROOT_PUBKEY);
    await saveWalletKey(sphere as never, 'testnet2', 'sk_wallet');
    const resolved = await resolveActiveKey(sphere as never, 'testnet2');
    expect(resolved).toEqual({ key: 'sk_wallet', source: 'wallet', needsPrompt: false });
  });

  it('own key WINS over the wallet key for its address', async () => {
    const sphere = fakeSphere(ADDR2_PUBKEY);
    await saveWalletKey(sphere as never, 'testnet2', 'sk_wallet');
    await saveAddressKey(sphere as never, 'testnet2', 'sk_own');
    const resolved = await resolveActiveKey(sphere as never, 'testnet2');
    expect(resolved.key).toBe('sk_own');
    expect(resolved.source).toBe('own');
  });

  it('first visit to a keyless address: inherits wallet key provisionally + needsPrompt', async () => {
    const sphere = fakeSphere(ADDR2_PUBKEY);
    await saveWalletKey(sphere as never, 'testnet2', 'sk_wallet');
    const resolved = await resolveActiveKey(sphere as never, 'testnet2');
    expect(resolved).toEqual({ key: 'sk_wallet', source: 'wallet', needsPrompt: true });
  });

  it('recorded inherit preference silences the prompt', async () => {
    const sphere = fakeSphere(ADDR2_PUBKEY);
    await saveWalletKey(sphere as never, 'testnet2', 'sk_wallet');
    await setAddressPreference(sphere as never, 'testnet2', 'inherit');
    const resolved = await resolveActiveKey(sphere as never, 'testnet2');
    expect(resolved).toEqual({ key: 'sk_wallet', source: 'wallet', needsPrompt: false });
  });

  it('returns null/none for missing or undecryptable entries', async () => {
    const sphere = fakeSphere(ROOT_PUBKEY);
    await expect(loadWalletKey(sphere as never, 'testnet2')).resolves.toBeNull();
    sphere._store.set(scopedSubscriptionSlot('testnet2', ROOT_PUBKEY), 'enc1.garbage');
    await expect(loadWalletKey(sphere as never, 'testnet2')).resolves.toBeNull();
    const resolved = await resolveActiveKey(sphere as never, 'testnet2');
    expect(resolved.key).toBeNull();
    expect(resolved.source).toBe('none');
  });
});
