import {
  STORAGE_KEYS_GLOBAL,
  encryptMnemonic,
  decryptMnemonic,
  validateMnemonic,
  type StorageProvider,
} from '@unicitylabs/sphere-sdk';

/**
 * VERIFIED-SAFE in-place re-encryption of the wallet mnemonic (#449 Settings →
 * Security: Set/Change/Remove password). This is the ONLY sanctioned mechanism
 * for changing a wallet's at-rest password — it touches ONLY the mnemonic key
 * at `STORAGE_KEYS_GLOBAL.MNEMONIC`; the token DB, transaction history and
 * everything else are never read or written. There is deliberately NO
 * `Sphere.clear()` / `Sphere.import()` involved (those would wipe the token DB).
 *
 * Why this is safe: the SDK's own `Sphere` class persists the mnemonic as
 * `this.encrypt(mnemonic)`, where internally
 * `encrypt = (data) => password ? encryptSimple(data, password) : data` — i.e.
 * plaintext when there's no password, AES-encrypted (via `encryptSimple`) when
 * there is. The exported `encryptMnemonic`/`decryptMnemonic` are literally
 * `encryptSimple`/`decryptSimple` (see sphere-sdk core/encryption.ts) — the
 * SAME format the SDK reads back on `Sphere.init`/`Sphere.load`. So writing
 * `encryptMnemonic(mnemonic, newPassword)` (or the bare mnemonic when removing
 * the password) to that one key reproduces exactly what the SDK itself would
 * have written, and the wallet loads unchanged next time.
 */
export async function reencryptStoredMnemonic(
  storage: Pick<StorageProvider, 'get' | 'set'>,
  opts: { currentPassword: string | null; newPassword: string | null },
): Promise<void> {
  const stored = await storage.get(STORAGE_KEYS_GLOBAL.MNEMONIC);
  if (!stored) {
    throw new Error('No wallet mnemonic found in storage — nothing to protect');
  }

  // Recover the plaintext mnemonic.
  let mnemonic: string;
  if (opts.currentPassword === null) {
    // No current password: the stored value must already be a plaintext
    // mnemonic (mirrors the SDK's own decrypt() fallback — see
    // core/encryption.ts: no password + validateMnemonic(encrypted) => as-is).
    if (!validateMnemonic(stored)) {
      throw new Error('Wallet is password-protected — the current password is required');
    }
    mnemonic = stored;
  } else {
    let decrypted: string;
    try {
      decrypted = decryptMnemonic(stored, opts.currentPassword);
    } catch {
      throw new Error('Incorrect current password');
    }
    if (!validateMnemonic(decrypted)) {
      throw new Error('Incorrect current password');
    }
    mnemonic = decrypted;
  }

  const newValue = opts.newPassword ? encryptMnemonic(mnemonic, opts.newPassword) : mnemonic;
  await storage.set(STORAGE_KEYS_GLOBAL.MNEMONIC, newValue);

  // READ-BACK VERIFY (wallet-loss safety, non-negotiable): re-read the key we
  // just wrote and confirm it decrypts back to the EXACT SAME mnemonic before
  // trusting the write. If anything about this check fails — a storage layer
  // that silently dropped the write, a corrupted value, a wrong assumption
  // about the on-disk format — RESTORE the original stored value and throw.
  // The mnemonic key must never be left in a state nothing can read back.
  try {
    const readBack = await storage.get(STORAGE_KEYS_GLOBAL.MNEMONIC);
    if (readBack === null) throw new Error('read-back returned no value');
    const recovered = opts.newPassword ? decryptMnemonic(readBack, opts.newPassword) : readBack;
    if (recovered !== mnemonic || !validateMnemonic(recovered)) {
      throw new Error('read-back mnemonic does not match');
    }
  } catch (verifyErr) {
    await storage.set(STORAGE_KEYS_GLOBAL.MNEMONIC, stored);
    const reason = verifyErr instanceof Error ? verifyErr.message : String(verifyErr);
    throw new Error(`Password change verification failed — original wallet data restored (${reason})`);
  }
}
