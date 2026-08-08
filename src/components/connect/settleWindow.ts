/**
 * Clicks are swallowed for this long after actionable, money-spending UI is
 * first PRESENTED to the user. Every intent modal shares button geometry, so a
 * swap under a stationary cursor is clickjacking without an iframe — and a
 * FIFO queue makes the moment predictable (graceful lock §8.4).
 *
 * It lives alone in this leaf module because it is NOT Connect-only: the
 * wallet's own SendModal arms the same window over its confirm step and its
 * duplicate-payment warning (a user who double-taps their own Send button pays
 * exactly as twice as a dApp that re-issues an intent). One constant, so the
 * two surfaces can never drift into teaching different reflexes.
 */
export const INTENT_SETTLE_MS = 500;
