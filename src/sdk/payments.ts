import type { Sphere } from '@unicitylabs/sphere-sdk';
import type { PaymentsV2 } from '@unicitylabs/sphere-sdk/payments-v2';

/**
 * Read `sphere.payments` with the pre-flip null semantics.
 *
 * Post-flip (sdk 0.14.1) `sphere.payments` is typed non-null and THROWS
 * NOT_INITIALIZED while no payments vertical is running — which happens in
 * real windows this app's hooks and event handlers execute in: the §7
 * stop→start gap of a live address switch, and after destroy() during
 * lock/re-init (in-flight queryFns hold the old instance). The deprecated
 * `sphere.paymentsV2` alias returned `null` in exactly those windows, and
 * every call site here was built on that contract ("no facade → no-op /
 * empty list"). This helper preserves it against the new getter.
 */
export function getPayments(sphere: Sphere | null | undefined): PaymentsV2 | null {
  if (!sphere) return null;
  try {
    return sphere.payments;
  } catch {
    return null;
  }
}
