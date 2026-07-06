import { describe, it, expect, beforeEach } from 'vitest';
import { saveScopedKey, loadScopedKey, scopedSubscriptionSlot } from '../../../src/sdk/subscription/keyVault';
import { getStoredSubscriptionKey } from '../../../src/config/storageKeys';

function fakeSphere() {
  const store = new Map<string, string>();
  return {
    deriveAddress: () => ({ privateKey: '1'.repeat(64) }),
    identity: { chainPubkey: '02' + 'b'.repeat(64) },
    getStorage: () => ({
      get: async (k: string) => store.get(k) ?? null,
      set: async (k: string, v: string) => void store.set(k, v),
      remove: async (k: string) => void store.delete(k),
    }),
    _store: store,
  };
}

describe('keyVault', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips an encrypted scoped key and updates the boot cache', async () => {
    const sphere = fakeSphere();
    await saveScopedKey(sphere as never, 'testnet2', 'sk_secret');
    const slot = scopedSubscriptionSlot('testnet2', sphere.identity.chainPubkey);
    expect(sphere._store.get(slot)).toMatch(/^enc1\./); // encrypted at rest, not plaintext
    expect(getStoredSubscriptionKey()).toBe('sk_secret'); // boot cache
    await expect(loadScopedKey(sphere as never, 'testnet2')).resolves.toBe('sk_secret');
  });

  it('returns null for a missing or undecryptable entry', async () => {
    const sphere = fakeSphere();
    await expect(loadScopedKey(sphere as never, 'testnet2')).resolves.toBeNull();
    sphere._store.set(scopedSubscriptionSlot('testnet2', sphere.identity.chainPubkey), 'enc1.garbage');
    await expect(loadScopedKey(sphere as never, 'testnet2')).resolves.toBeNull();
  });
});
