/**
 * True when an error is the SDK's DECRYPTION_ERROR — i.e. an encrypted wallet
 * was opened with a wrong/missing password. This is a "wallet is locked"
 * signal, not a failure. See #449.
 */
export function isDecryptionError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 'DECRYPTION_ERROR'
  );
}
