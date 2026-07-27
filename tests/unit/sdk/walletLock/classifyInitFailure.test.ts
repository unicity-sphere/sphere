import { describe, it, expect } from 'vitest';
import { SphereError } from '@unicitylabs/sphere-sdk';
import { classifyInitFailure } from '../../../../src/sdk/walletLock/classifyInitFailure';

describe('classifyInitFailure', () => {
  // The REAL SDK signal (@unicitylabs/sphere-sdk@0.12.0, code-verified — see
  // isDecryptionError.test.ts) for "encrypted wallet, wrong/missing password".
  it('maps the real SDK decrypt-mnemonic STORAGE_ERROR to "locked" (not a fatal error)', () => {
    const e = new SphereError('Failed to decrypt mnemonic', 'STORAGE_ERROR');
    expect(classifyInitFailure(e)).toBe('locked');
  });

  // Defensive: kept in case a future SDK version throws this literal code directly.
  it('maps a literal DECRYPTION_ERROR code to "locked" too (defensive)', () => {
    expect(classifyInitFailure({ code: 'DECRYPTION_ERROR' })).toBe('locked');
  });

  // CRITICAL: a genuine IndexedDB STORAGE_ERROR (no decrypt-mnemonic message)
  // must stay "error" so it still hits the real storage retry/error screen —
  // it must NEVER masquerade as a locked wallet.
  it('maps a generic STORAGE_ERROR (real IndexedDB fault) to "error"', () => {
    const e = new SphereError('IndexedDB transaction failed', 'STORAGE_ERROR');
    expect(classifyInitFailure(e)).toBe('error');
  });
  it('maps everything else to "error"', () => {
    expect(classifyInitFailure({ code: 'STORAGE_ERROR' })).toBe('error');
    expect(classifyInitFailure(new Error('x'))).toBe('error');
  });
});
