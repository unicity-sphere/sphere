/**
 * Survive a page reload without asking for the password again.
 *
 * WHAT THIS CHANGES. Until now the password lived only in tab memory, so any reload — of the
 * wallet page or, through the popup, of a dApp page — dropped it and the wallet came back
 * locked. That was never a decision about the threat model; it was a consequence of where the
 * key happened to live. The control that actually protects a wallet from someone who reaches
 * the device is the IDLE TIMEOUT, and it is unaffected by any of this.
 *
 * The argument FOR is not convenience. Demanding the password on every reload trains a user to
 * type it at any prompt, which is exactly the habit a phishing overlay exploits. A wallet that
 * asks ten times a day makes a fake prompt indistinguishable from a real one.
 *
 * WHAT IT COSTS, stated plainly: someone who copies the browser profile off the disk AND loads
 * the origin within the same idle window can spend. Before this, disk access yielded nothing
 * usable. The expiry check below is what bounds that, which is why it is not optional.
 *
 * HOW. The password is encrypted under a NON-EXTRACTABLE AES-GCM key held in IndexedDB, and
 * deleting the record revokes it.
 *
 * SCOPE OF THE PROTECTION, so nobody mistakes it for more than it is. Non-extractability keeps
 * the key from being exported and reused elsewhere, and keeps a passive copy of the stored bytes
 * — a backup, a sync, a disk image — inert. It is NOT a boundary against code running on this
 * origin, and it is not meant to be: anything executing here can already reach an unlocked
 * wallet directly.
 *
 * THE INVARIANT THIS RESTS ON, and the reason the expiry is not a tidy-up detail: a record may
 * exist only while the wallet is unlocked or about to be. Every lock path — manual, idle,
 * cross-tab, logout, wallet delete — MUST erase it, and the expiry must stay bounded by the
 * user's own auto-lock timeout. Weaken either and this stops being "a reload does not re-prompt"
 * and becomes "the wallet is open indefinitely", which is a different product with a different
 * risk profile. If a deployment needs the reload itself to require proof of presence, gate the
 * unwrap behind WebAuthn rather than lengthening the window.
 *
 * This does NOT weaken at-rest encryption of the mnemonic: that stays exactly as it was, and a
 * wallet with no password never reaches this module at all.
 *
 * Deliberately IndexedDB rather than sessionStorage: sessionStorage is per browsing context, so
 * it would leave every popup and every framed agent asking for the password separately. One
 * unlock should serve every window of the origin.
 */

const DB_NAME = 'sphere-unlock';
const DB_VERSION = 1;
const STORE = 'unlock';
const RECORD_KEY = 'current';

interface PersistedRecord {
  /** Non-extractable AES-GCM key. Structured-cloneable, so IndexedDB stores it as a key. */
  readonly key: CryptoKey;
  readonly iv: Uint8Array<ArrayBuffer>;
  readonly ciphertext: ArrayBuffer;
  /** Epoch ms of the last observed user activity — NOT of the unlock. See touch(). */
  lastActiveAt: number;
  /**
   * How long this record may outlive that activity. Stored WITH the record because the
   * auto-lock timeout lives in settings that are encrypted with the password — unreadable at
   * the exact moment we need the bound, on a cold load before any unlock.
   */
  readonly maxAgeMs: number;
}

/**
 * Ceiling applied when auto-lock is switched off. "Never lock me while I work" is a reasonable
 * thing to ask for; "let a copied profile spend forever" is not, and only the second is a
 * property of persisting to disk.
 */
const HARD_CAP_MS = 24 * 60 * 60 * 1000;

function supported(): boolean {
  return (
    typeof indexedDB !== 'undefined' &&
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined'
  );
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      }),
  );
}

/**
 * Remember this unlock. Silently does nothing where the crypto or storage APIs are missing —
 * the wallet must keep working, just without the convenience.
 */
export async function savePersistedUnlock(
  password: string,
  autoLockMs: number | null,
): Promise<void> {
  if (!supported() || !password) return;
  try {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ]);
    const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(password),
    );
    const record: PersistedRecord = {
      key,
      iv,
      ciphertext,
      lastActiveAt: Date.now(),
      maxAgeMs: Math.min(autoLockMs ?? HARD_CAP_MS, HARD_CAP_MS),
    };
    await run('readwrite', (s) => s.put(record, RECORD_KEY));
  } catch {
    // A failure here costs a password prompt, never correctness.
  }
}

/**
 * The remembered password, or null.
 *
 * The bound is the one captured at save time — the wallet's own auto-lock timeout — so a reload
 * can never outlive the idle policy the user chose. A stale record is DELETED rather than
 * ignored: leaving it would let a later write resurrect it.
 */
export async function loadPersistedUnlock(): Promise<string | null> {
  if (!supported()) return null;
  try {
    const record = (await run<PersistedRecord | undefined>('readonly', (s) => s.get(RECORD_KEY))) ?? null;
    if (!record) return null;

    if (Date.now() - record.lastActiveAt > record.maxAgeMs) {
      await clearPersistedUnlock();
      return null;
    }

    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: record.iv },
      record.key,
      record.ciphertext,
    );
    return new TextDecoder().decode(plain);
  } catch {
    // Corrupt or undecryptable — treat as absent and start clean.
    await clearPersistedUnlock();
    return null;
  }
}

/**
 * Mark the user as active, so a long working session is not cut short by a reload.
 *
 * Stamping at unlock time instead would mean: unlock, work for half an hour, reload, and get
 * asked for the password even though you never went idle.
 */
export async function touchPersistedUnlock(): Promise<void> {
  if (!supported()) return;
  try {
    const record = (await run<PersistedRecord | undefined>('readonly', (s) => s.get(RECORD_KEY))) ?? null;
    if (!record) return;
    record.lastActiveAt = Date.now();
    await run('readwrite', (s) => s.put(record, RECORD_KEY));
  } catch {
    // Best effort.
  }
}

/** Every lock path calls this: manual lock, idle, cross-tab, logout, wallet delete. */
export async function clearPersistedUnlock(): Promise<void> {
  if (!supported()) return;
  try {
    await run('readwrite', (s) => s.delete(RECORD_KEY));
  } catch {
    // Nothing to do — a failure to delete is reported by the next load returning a stale record,
    // which the expiry check then discards.
  }
}
