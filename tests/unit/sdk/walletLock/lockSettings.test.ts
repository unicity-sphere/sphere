import { describe, it, expect } from 'vitest';
import {
  encodeLockSettings, decodeLockSettings, autoLockMs,
  DEFAULT_AUTO_LOCK_MINUTES,
} from '../../../../src/sdk/walletLock/lockSettings';

describe('lockSettings', () => {
  it('round-trips the timeout through password encryption', () => {
    const blob = encodeLockSettings(5, 'pw');
    // Encrypted, not plaintext: the literal plaintext JSON substring must never appear.
    // (A raw `.not.toContain('5')` check is flaky — the encrypted envelope's random
    // iv/salt/ciphertext hex/base64 coincidentally contains the digit '5' most runs.)
    expect(blob).not.toContain('"autoLockMinutes":5');
    expect(decodeLockSettings(blob, 'pw')).toBe(5);
  });
  it('round-trips "never"', () => {
    expect(decodeLockSettings(encodeLockSettings('never', 'pw'), 'pw')).toBe('never');
  });
  it('falls back to the default when decryption fails (wrong password / tampered blob)', () => {
    const blob = encodeLockSettings(5, 'pw');
    expect(decodeLockSettings(blob, 'WRONG')).toBe(DEFAULT_AUTO_LOCK_MINUTES);
    expect(decodeLockSettings('garbage', 'pw')).toBe(DEFAULT_AUTO_LOCK_MINUTES);
  });
  it('falls back to the default for an out-of-range value', () => {
    const blob = encodeLockSettings(999 as unknown as number, 'pw');
    expect(decodeLockSettings(blob, 'pw')).toBe(DEFAULT_AUTO_LOCK_MINUTES);
  });
  it('autoLockMs maps minutes to ms and "never" to null', () => {
    expect(autoLockMs(15)).toBe(15 * 60 * 1000);
    expect(autoLockMs('never')).toBeNull();
  });
});
