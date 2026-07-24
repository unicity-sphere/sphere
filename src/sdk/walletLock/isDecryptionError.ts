import { isSphereError } from '@unicitylabs/sphere-sdk';

/**
 * True when an error is a "wallet is locked" signal — i.e. an encrypted
 * wallet was opened with a wrong/missing password — not a failure. See #449.
 *
 * CODE-VERIFIED against @unicitylabs/sphere-sdk@0.12.0
 * (node_modules/@unicitylabs/sphere-sdk/dist/core/index.cjs): a mnemonic
 * decrypt failure does NOT throw `DECRYPTION_ERROR`. `Sphere#decrypt()`
 * swallows the internal DECRYPTION_ERROR itself (`catch { return null }`),
 * and `loadIdentityFromStorage()` (the loader both the passwordless
 * cold-start check AND unlock(password) run through — Sphere.init() delegates
 * to Sphere.load() → loadIdentityFromStorage() for an existing wallet) then
 * re-throws:
 *   throw new SphereError("Failed to decrypt mnemonic", "STORAGE_ERROR");
 * So the REAL signal is a SphereError with code STORAGE_ERROR whose message
 * names a mnemonic-decrypt failure — matched by message text, not code alone,
 * so a GENUINE IndexedDB STORAGE_ERROR (no decrypt-mnemonic message) is never
 * misclassified as "locked".
 *
 * The literal `code === 'DECRYPTION_ERROR'` check is kept too, defensively,
 * in case a future SDK version throws that code directly for this case.
 */
export function isDecryptionError(err: unknown): boolean {
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 'DECRYPTION_ERROR'
  ) {
    return true;
  }
  if (isSphereError(err) && err.code === 'STORAGE_ERROR') {
    return /decrypt/i.test(err.message) && /mnemonic/i.test(err.message);
  }
  return false;
}
