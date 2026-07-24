import { describe, it, expect } from 'vitest';
import { classifyInitFailure } from '../../../../src/sdk/walletLock/classifyInitFailure';

describe('classifyInitFailure', () => {
  it('maps DECRYPTION_ERROR to "locked" (not a fatal error)', () => {
    expect(classifyInitFailure({ code: 'DECRYPTION_ERROR' })).toBe('locked');
  });
  it('maps everything else to "error"', () => {
    expect(classifyInitFailure({ code: 'STORAGE_ERROR' })).toBe('error');
    expect(classifyInitFailure(new Error('x'))).toBe('error');
  });
});
