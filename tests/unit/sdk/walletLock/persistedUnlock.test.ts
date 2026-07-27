/**
 * The remembered unlock is the one place in the wallet where something that can decrypt the
 * mnemonic touches disk. Everything worth testing here is a BOUNDARY: what expires, what is
 * refused, and what every lock path must erase.
 */
// jsdom implements no IndexedDB, and this module's whole point is that the record outlives the
// page. fake-indexeddb gives the real API semantics — transactions, structured clone of the
// CryptoKey — rather than a hand-rolled stub that would agree with whatever the code does.
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  savePersistedUnlock,
  loadPersistedUnlock,
  clearPersistedUnlock,
  touchPersistedUnlock,
} from '../../../../src/sdk/walletLock/persistedUnlock';

const PASSWORD = 'correct horse battery staple';
const FIFTEEN_MIN = 15 * 60 * 1000;

beforeEach(async () => {
  vi.useRealTimers();
  await clearPersistedUnlock();
});

describe('persisted unlock', () => {
  it('returns nothing when nothing was remembered', async () => {
    expect(await loadPersistedUnlock()).toBeNull();
  });

  it('round-trips the password so a reload does not have to ask again', async () => {
    await savePersistedUnlock(PASSWORD, FIFTEEN_MIN);
    expect(await loadPersistedUnlock()).toBe(PASSWORD);
  });

  it('never writes the password in the clear', async () => {
    await savePersistedUnlock(PASSWORD, FIFTEEN_MIN);

    // Whatever is on disk must not contain the secret. The record holds a CryptoKey and a
    // ciphertext; a serialisation of it should reveal nothing.
    const raw = JSON.stringify(await dumpRecord());
    expect(raw).not.toContain(PASSWORD);
    expect(raw).not.toContain('horse');
  });

  it('EXPIRES with the idle window it was saved under', async () => {
    await savePersistedUnlock(PASSWORD, 50);
    expect(await loadPersistedUnlock()).toBe(PASSWORD);

    await new Promise((r) => setTimeout(r, 80));

    // This is the bound that keeps a copied browser profile from being spendable forever. It
    // is not optional, which is why it is checked before the ciphertext is even touched.
    expect(await loadPersistedUnlock()).toBeNull();
  });

  it('DELETES a stale record rather than leaving it to be resurrected', async () => {
    await savePersistedUnlock(PASSWORD, 20);
    await new Promise((r) => setTimeout(r, 50));
    await loadPersistedUnlock();

    // A later touch must not revive it: the record is gone, so there is nothing to stamp.
    await touchPersistedUnlock();
    expect(await loadPersistedUnlock()).toBeNull();
  });

  it('refreshes the window on activity, so a long session survives a reload', async () => {
    await savePersistedUnlock(PASSWORD, 120);
    await new Promise((r) => setTimeout(r, 80));

    // The user has been working. Expiry runs from the last ACTIVITY, not from the unlock —
    // otherwise half an hour of use followed by a reload would demand the password.
    await touchPersistedUnlock();
    await new Promise((r) => setTimeout(r, 80));

    expect(await loadPersistedUnlock()).toBe(PASSWORD);
  });

  it('is erased by clear(), which every lock path calls', async () => {
    await savePersistedUnlock(PASSWORD, FIFTEEN_MIN);
    await clearPersistedUnlock();
    expect(await loadPersistedUnlock()).toBeNull();
  });

  it('caps the window when auto-lock is switched off', async () => {
    // "Never lock me while I work" is reasonable; "let a copied profile spend forever" is not,
    // and only the second is a property of writing to disk. A null timeout takes the hard cap.
    await savePersistedUnlock(PASSWORD, null);
    const record = await dumpRecord();
    expect(record?.maxAgeMs).toBe(24 * 60 * 60 * 1000);
  });

  it('never caps ABOVE the hard cap, even if asked to', async () => {
    await savePersistedUnlock(PASSWORD, 7 * 24 * 60 * 60 * 1000);
    const record = await dumpRecord();
    expect(record?.maxAgeMs).toBe(24 * 60 * 60 * 1000);
  });

  it('remembers nothing for a wallet with no password', async () => {
    await savePersistedUnlock('', FIFTEEN_MIN);
    expect(await loadPersistedUnlock()).toBeNull();
  });
});

/** Reads the raw record straight out of IndexedDB, bypassing the module. */
function dumpRecord(): Promise<{ maxAgeMs: number; lastActiveAt: number } | undefined> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('sphere-unlock', 1);
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains('unlock')) open.result.createObjectStore('unlock');
    };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const req = db.transaction('unlock', 'readonly').objectStore('unlock').get('current');
      req.onsuccess = () => { resolve(req.result); db.close(); };
      req.onerror = () => { reject(req.error); db.close(); };
    };
  });
}
