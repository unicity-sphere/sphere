import { describe, it, expect } from 'vitest';
import { SphereError } from '@unicitylabs/sphere-sdk';
import { isDecryptionError } from '../../../../src/sdk/walletLock/isDecryptionError';

describe('isDecryptionError', () => {
  // The REAL signal thrown by @unicitylabs/sphere-sdk@0.12.0 on a
  // mnemonic-decrypt failure (wrong/missing password on an encrypted wallet).
  // Code-verified in node_modules/@unicitylabs/sphere-sdk/dist/core/index.cjs
  // (loadIdentityFromStorage): `throw new SphereError("Failed to decrypt
  // mnemonic", "STORAGE_ERROR")`. See src/sdk/walletLock/isDecryptionError.ts.
  it('is true for the real SDK signal: SphereError STORAGE_ERROR "Failed to decrypt mnemonic"', () => {
    const e = new SphereError('Failed to decrypt mnemonic', 'STORAGE_ERROR');
    expect(isDecryptionError(e)).toBe(true);
  });

  it('is true regardless of message case (case-insensitive match)', () => {
    const e = new SphereError('FAILED TO DECRYPT MNEMONIC', 'STORAGE_ERROR');
    expect(isDecryptionError(e)).toBe(true);
  });

  // Defensive: kept in case a future SDK version throws this literal code directly.
  it('is true for a literal DECRYPTION_ERROR code (defensive, future-proofing)', () => {
    expect(isDecryptionError({ code: 'DECRYPTION_ERROR' })).toBe(true);
  });
  it('is true for an Error carrying the DECRYPTION_ERROR code property', () => {
    const e = Object.assign(new Error('bad password'), { code: 'DECRYPTION_ERROR' });
    expect(isDecryptionError(e)).toBe(true);
  });

  // CRITICAL: a GENERIC STORAGE_ERROR (real IndexedDB fault, no decrypt-mnemonic
  // message) must NEVER be classified as "locked" — that would mask a genuine
  // storage failure as a solvable password prompt.
  it('is false for a generic STORAGE_ERROR with no decrypt-mnemonic message', () => {
    const e = new SphereError('IndexedDB transaction failed', 'STORAGE_ERROR');
    expect(isDecryptionError(e)).toBe(false);
  });
  it('is false for a plain object with STORAGE_ERROR code (not a real SphereError, no message)', () => {
    expect(isDecryptionError({ code: 'STORAGE_ERROR' })).toBe(false);
  });
  it('is false for a STORAGE_ERROR mentioning "decrypt" but not "mnemonic" (e.g. master key)', () => {
    const e = new SphereError('Failed to decrypt master key', 'STORAGE_ERROR');
    expect(isDecryptionError(e)).toBe(false);
  });
  it('is false for other Sphere errors', () => {
    expect(isDecryptionError(new SphereError('Identity not set', 'NOT_INITIALIZED'))).toBe(false);
  });
  it('is false for non-error values', () => {
    expect(isDecryptionError(null)).toBe(false);
    expect(isDecryptionError('DECRYPTION_ERROR')).toBe(false);
  });
});
