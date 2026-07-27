import { encrypt, decryptJson } from '@unicitylabs/sphere-sdk';

/**
 * Auto-lock timeout, persisted encrypted with the wallet password so a
 * cold-storage/localStorage tamper can't silently disable or shorten it. See #449.
 */
export const AUTO_LOCK_OPTIONS = [1, 5, 15, 30, 'never'] as const;
export type AutoLockValue = (typeof AUTO_LOCK_OPTIONS)[number];
export const DEFAULT_AUTO_LOCK_MINUTES = 15;

function isValid(v: unknown): v is AutoLockValue {
  return v === 'never' || (typeof v === 'number' && [1, 5, 15, 30].includes(v));
}

/** Encrypt the timeout with the wallet password so it can't be tampered from cold storage. */
export function encodeLockSettings(minutes: AutoLockValue, password: string): string {
  return JSON.stringify(encrypt({ autoLockMinutes: minutes }, password));
}

/** Decrypt the timeout; any failure or invalid value → the secure default. */
export function decodeLockSettings(blob: string, password: string): AutoLockValue {
  try {
    const data = decryptJson<{ autoLockMinutes: unknown }>(JSON.parse(blob), password);
    return isValid(data.autoLockMinutes) ? data.autoLockMinutes : DEFAULT_AUTO_LOCK_MINUTES;
  } catch {
    return DEFAULT_AUTO_LOCK_MINUTES;
  }
}

export function autoLockMs(minutes: AutoLockValue): number | null {
  return minutes === 'never' ? null : minutes * 60 * 1000;
}
