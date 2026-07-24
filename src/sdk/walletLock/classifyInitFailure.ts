import { isDecryptionError } from './isDecryptionError';

/** A DECRYPTION_ERROR means the wallet is encrypted and locked, not broken. */
export function classifyInitFailure(err: unknown): 'locked' | 'error' {
  return isDecryptionError(err) ? 'locked' : 'error';
}
