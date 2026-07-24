import { describe, it, expect } from 'vitest';
import { isDecryptionError } from '../../../../src/sdk/walletLock/isDecryptionError';

describe('isDecryptionError', () => {
  it('is true for a Sphere DECRYPTION_ERROR', () => {
    expect(isDecryptionError({ code: 'DECRYPTION_ERROR' })).toBe(true);
  });
  it('is true for an Error carrying the code property', () => {
    const e = Object.assign(new Error('bad password'), { code: 'DECRYPTION_ERROR' });
    expect(isDecryptionError(e)).toBe(true);
  });
  it('is false for other Sphere errors', () => {
    expect(isDecryptionError({ code: 'STORAGE_ERROR' })).toBe(false);
  });
  it('is false for non-error values', () => {
    expect(isDecryptionError(null)).toBe(false);
    expect(isDecryptionError('DECRYPTION_ERROR')).toBe(false);
  });
});
