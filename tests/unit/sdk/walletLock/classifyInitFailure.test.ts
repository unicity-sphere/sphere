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
  // sphere-sdk#801 (0.17.4+): the SDK refuses to import over an existing wallet without
  // `overwrite: true`, and rejects BEFORE touching storage — so the destructive cleanup
  // must not run for it. Anything but 'error' skips that cleanup.
  it('maps the SDK refusal to overwrite an existing wallet to "refused"', () => {
    const e = new SphereError('A wallet already exists on this storage.', 'ALREADY_INITIALIZED');
    expect(classifyInitFailure(e)).toBe('refused');
    expect(classifyInitFailure({ code: 'ALREADY_INITIALIZED' })).toBe('refused');
  });

  it('maps everything else to "error"', () => {
    expect(classifyInitFailure({ code: 'STORAGE_ERROR' })).toBe('error');
    expect(classifyInitFailure(new Error('x'))).toBe('error');
  });
});
