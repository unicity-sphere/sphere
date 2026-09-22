/**
 * True when the SDK refused to import over the wallet already on this device
 * (`ALREADY_INITIALIZED`, sphere-sdk#801, SDK 0.17.4+). The refusal happens before the
 * SDK touches storage, so that wallet is intact — the destructive cleanup must not run
 * for it, or it destroys exactly what the refusal protected.
 *
 * The code is read structurally, not through `instanceof SphereError`: each dist entry
 * point carries its own `SphereError` class, so an error thrown inside one bundle fails
 * `instanceof` against the class imported from another.
 */
export function isRefusalToOverwrite(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 'ALREADY_INITIALIZED'
  );
}
