/**
 * TDD for the VERIFIED-SAFE in-place mnemonic re-encryption mechanism used by
 * Settings → Security "Set/Change/Remove password" (#449 Task 8b). This
 * exercises REAL SDK crypto (encryptMnemonic/decryptMnemonic/validateMnemonic)
 * against a fake in-memory storage — no mocking of the crypto itself, since the
 * whole point is that the on-disk format must be byte-for-byte what Sphere
 * itself reads on load.
 */
import { describe, it, expect } from 'vitest';
import {
  generateMnemonic,
  STORAGE_KEYS_GLOBAL,
  encryptMnemonic,
  decryptMnemonic,
} from '@unicitylabs/sphere-sdk';
import { reencryptStoredMnemonic } from '../../../../src/sdk/walletLock/reencryptMnemonic';

/** Minimal in-memory fake of the StorageProvider surface this helper touches. */
function makeFakeStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe('reencryptStoredMnemonic', () => {
  it('sets a password on a plaintext wallet (null -> pw): result decrypts with pw', async () => {
    const mnemonic = generateMnemonic();
    const storage = makeFakeStorage({ [STORAGE_KEYS_GLOBAL.MNEMONIC]: mnemonic });

    await reencryptStoredMnemonic(storage, { currentPassword: null, newPassword: 'correct horse' });

    const stored = storage.store.get(STORAGE_KEYS_GLOBAL.MNEMONIC)!;
    expect(stored).not.toBe(mnemonic);
    expect(decryptMnemonic(stored, 'correct horse')).toBe(mnemonic);
  }, 20000);

  it('changes the password on an encrypted wallet (pw -> pw2)', async () => {
    const mnemonic = generateMnemonic();
    const storage = makeFakeStorage({
      [STORAGE_KEYS_GLOBAL.MNEMONIC]: encryptMnemonic(mnemonic, 'old-pw'),
    });

    await reencryptStoredMnemonic(storage, { currentPassword: 'old-pw', newPassword: 'new-pw' });

    const stored = storage.store.get(STORAGE_KEYS_GLOBAL.MNEMONIC)!;
    expect(decryptMnemonic(stored, 'new-pw')).toBe(mnemonic);
    expect(() => decryptMnemonic(stored, 'old-pw')).toThrow();
  }, 20000);

  it('removes the password (pw -> null): result is a plaintext mnemonic', async () => {
    const mnemonic = generateMnemonic();
    const storage = makeFakeStorage({
      [STORAGE_KEYS_GLOBAL.MNEMONIC]: encryptMnemonic(mnemonic, 'old-pw'),
    });

    await reencryptStoredMnemonic(storage, { currentPassword: 'old-pw', newPassword: null });

    const stored = storage.store.get(STORAGE_KEYS_GLOBAL.MNEMONIC)!;
    expect(stored).toBe(mnemonic);
  }, 20000);

  it('throws on a wrong current password and does NOT modify storage', async () => {
    const mnemonic = generateMnemonic();
    const encrypted = encryptMnemonic(mnemonic, 'old-pw');
    const storage = makeFakeStorage({ [STORAGE_KEYS_GLOBAL.MNEMONIC]: encrypted });

    await expect(
      reencryptStoredMnemonic(storage, { currentPassword: 'WRONG', newPassword: 'new-pw' }),
    ).rejects.toThrow();

    expect(storage.store.get(STORAGE_KEYS_GLOBAL.MNEMONIC)).toBe(encrypted);
  }, 20000);

  it('throws when there is no stored mnemonic (nothing to protect)', async () => {
    const storage = makeFakeStorage({});

    await expect(
      reencryptStoredMnemonic(storage, { currentPassword: null, newPassword: 'pw' }),
    ).rejects.toThrow();
  });

  it('throws if currentPassword is null but the stored value is not a valid plaintext mnemonic', async () => {
    const mnemonic = generateMnemonic();
    const storage = makeFakeStorage({
      [STORAGE_KEYS_GLOBAL.MNEMONIC]: encryptMnemonic(mnemonic, 'old-pw'),
    });

    await expect(
      reencryptStoredMnemonic(storage, { currentPassword: null, newPassword: 'new-pw' }),
    ).rejects.toThrow();
  }, 20000);

  it('restores the original value if the read-back verification would fail (storage lies about the write)', async () => {
    const mnemonic = generateMnemonic();
    const original = mnemonic;
    const store = new Map([[STORAGE_KEYS_GLOBAL.MNEMONIC, original]]);
    let getCalls = 0;
    const lyingStorage = {
      get: async (key: string) => {
        getCalls++;
        // First get(): the initial read (real value). Second get(): the
        // read-back after set() — return corrupted garbage to simulate a
        // storage layer that silently failed to persist the write.
        if (getCalls >= 2) return 'not-a-real-encrypted-value';
        return store.get(key) ?? null;
      },
      set: async (key: string, value: string) => {
        store.set(key, value);
      },
    };

    await expect(
      reencryptStoredMnemonic(lyingStorage, { currentPassword: null, newPassword: 'new-pw' }),
    ).rejects.toThrow();

    // The helper must have restored the ORIGINAL value via set(), even though
    // get() keeps lying — check what was actually written to the underlying map.
    expect(store.get(STORAGE_KEYS_GLOBAL.MNEMONIC)).toBe(original);
  }, 20000);
});
