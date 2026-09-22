import { isDecryptionError } from './isDecryptionError';
import { isRefusalToOverwrite } from './isRefusalToOverwrite';

/**
 * How an init/import failure should be handled:
 * - `locked`: a DECRYPTION_ERROR — the wallet is encrypted and locked, not broken.
 * - `refused`: the SDK declined to overwrite the wallet already on this device.
 * - `error`: a real failure.
 *
 * Only `error` may run the destructive cleanup; the other two leave a wallet in place.
 */
export function classifyInitFailure(err: unknown): 'locked' | 'refused' | 'error' {
  if (isDecryptionError(err)) return 'locked';
  if (isRefusalToOverwrite(err)) return 'refused';
  return 'error';
}
