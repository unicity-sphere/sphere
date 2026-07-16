import { isSphereError, type SphereErrorCode } from '@unicitylabs/sphere-sdk';

// Friendly overrides for codes where SDK message is too technical.
// For codes NOT listed here, we use the SDK's own err.message (which is
// already user-readable, e.g. "Unicity ID @bob is already taken").
const FRIENDLY_OVERRIDES: Partial<Record<SphereErrorCode, string>> = {
  TRANSPORT_ERROR: 'Connection issue. Check your network',
  TIMEOUT: 'Request timed out. Try again',
  NETWORK_ERROR: 'Network error. Check your connection',
  AGGREGATOR_ERROR: 'Network unavailable. Try again',
  DECRYPTION_ERROR: 'Wrong password',
  STORAGE_ERROR: 'Storage error',
  MODULE_NOT_AVAILABLE: 'Feature not available',
  // #631/#633: a possibly-certified send. useTransfer already converts this to a pending
  // success (so the send path never re-sends); this is a friendly fallback for any other surface.
  CERTIFICATION_UNCONFIRMED: 'Payment sent — confirming on-chain. No need to resend.',
};

/**
 * Turn a raw, non-user-facing error string into something safe to display.
 * Backends (gateways/proxies) sometimes return an HTML error page (e.g. a 503)
 * instead of a structured error; that markup must never reach the UI.
 */
function humanizeRawError(message: string): string {
  const msg = message.trim();
  // Raw HTML/markup error page (gateway 5xx, proxy, etc.): surface the server's
  // OWN text (e.g. "503 Service Unavailable No server is available to handle this
  // request.") rather than a canned line — but never the markup itself.
  if (msg.startsWith('<')) {
    const text = msg
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) return 'Service temporarily unavailable. Try again later';
    return text.length > 200 ? `${text.slice(0, 200)}…` : text;
  }
  if (/\bservice unavailable\b|\b50[234]\b|bad gateway|gateway timeout/i.test(msg)) {
    return 'Service temporarily unavailable. Try again later';
  }
  return message;
}

export function getErrorMessage(err: unknown): string {
  if (isSphereError(err)) {
    return FRIENDLY_OVERRIDES[err.code] ?? humanizeRawError(err.message);
  }
  if (err instanceof Error) return humanizeRawError(err.message);
  return 'Something went wrong';
}

export function getErrorCode(err: unknown): SphereErrorCode | null {
  return isSphereError(err) ? err.code : null;
}

// --- Possibly-committed "keep-open" send codes -----------------------------
//
// The SINGLE source of truth for the send-pipeline error codes that mean the
// spend is (or may be) already committed on-chain and the SDK has kept the
// intent OPEN, so `resumeOpenIntents` completes the ORIGINAL payment under the
// same transferId. Re-issuing send() would consume a DIFFERENT source and
// DOUBLE-PAY the recipient, so every one of these MUST be presented as a
// delivery-PENDING success — never a re-sendable failure. Shared by useTransfer
// (a normal send) and useIncomingPaymentRequests.pay (payPaymentRequest routes
// through the same send()), so the set can never drift between the two paths.
//
// Mirrors the SDK's send-failure catch (PaymentsModule):
//  - the `keepOpen` set, each re-thrown RAW:
//      CERTIFICATION_UNCONFIRMED       ProofUnconfirmedError — submit accepted, proof fetch inconclusive; spend may be final (#631/#633).
//      CHECKPOINT_PERSIST_FAILED       CheckpointPersistFailedError — split burn certified on-chain, checkpoint persist failed; recover on resume (sphere-sdk#501 / E.4).
//      SPLIT_CHECKPOINT_LOST           SplitCheckpointLostError — certified split can't be rebuilt from its checkpoint; HKDF-derived, never a foreign spend; keep-open (E.4).
//      CHECKPOINT_TRUSTBASE_MISMATCH   CheckpointTrustbaseMismatchError — certified split's proof no longer verifies vs the current trust base (validator rotation); keep-open (E.4).
//    The split-checkpoint pair (SPLIT_CHECKPOINT_LOST / CHECKPOINT_TRUSTBASE_MISMATCH)
//    ALSO emits `split:checkpoint-stuck` — bridged to a "funds are safe" toast in
//    useSphereEvents. That toast is ADDITIVE; it is not a substitute for keeping
//    these codes off the re-send path (the SendModal still must present pending).
//  - SEND_SYNC_PENDING (#665): the spend committed but the post-commit wallet-api
//    mirror-sync failed; resume converges the mirror (idempotent apply).
//  - SEND_PARTIALLY_COMPLETED (sdk #681, PartialSendConflictError): a multi-leg
//    send certified + delivered >=1 leg, then could not cover the remainder. Money
//    has irreversibly left the wallet, so it MUST NOT be re-sent in full (that
//    double-pays the delivered legs) — present it as pending, never re-sendable.
//    (A richer "partially sent, remainder X uncovered" UX is a follow-up; the
//    money-safety requirement is only that it stays off the re-send path.)
export const PENDING_COMMIT_CODES: readonly SphereErrorCode[] = [
  'SEND_SYNC_PENDING',
  'CERTIFICATION_UNCONFIRMED',
  'CHECKPOINT_PERSIST_FAILED',
  'SPLIT_CHECKPOINT_LOST',
  'CHECKPOINT_TRUSTBASE_MISMATCH',
  'SEND_PARTIALLY_COMPLETED',
];

/**
 * True when `err` is one of the possibly-committed keep-open send errors (see
 * {@link PENDING_COMMIT_CODES}): the spend may already be on-chain and resume
 * completes it under the same transferId, so the caller MUST present it as
 * pending and MUST NOT offer a re-send (that would double-pay).
 */
export function isPendingCommitCode(err: unknown): boolean {
  const code = getErrorCode(err);
  return code !== null && PENDING_COMMIT_CODES.includes(code);
}

// --- Gateway (SGW) 429/401 classification ---------------------------------
//
// duck-type; JsonRpcNetworkError is NOT exported by sphere-sdk root or
// subpaths (only deep-importable from @unicitylabs/state-transition-sdk/lib/...
// — avoid that coupling per architecture rules). See spec §5 "Duck-typed
// cause detection" risk: a state-transition-sdk bump could rename these
// fields and silently break detection; the gatewayErrors.test.ts contract
// canary pins this shape so such a break fails loudly in CI.
function isJsonRpcNetworkErrorShape(
  value: unknown
): value is { name: 'JsonRpcNetworkError'; status: number } {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { name?: unknown; status?: unknown };
  return candidate.name === 'JsonRpcNetworkError' && typeof candidate.status === 'number';
}

/**
 * Resolve the underlying gateway HTTP status (429/401/403/...) from either:
 *  (a) a SphereError('CERTIFICATION_UNCONFIRMED') whose `cause` duck-types
 *      JsonRpcNetworkError (the reactive path — the submit already left,
 *      per #631/#633 this is annotated on top of the existing pending-success
 *      conversion, never turned into a clean failure); or
 *  (b) a raw error that itself duck-types JsonRpcNetworkError (the
 *      pre-first-submit throw, before useTransfer's wrap applies — also
 *      covers callers that bypass useTransfer entirely, e.g. SwapModal's
 *      mint or ConnectIntentHandler's mint/receive, per spec §3.6).
 * Returns null for anything else. Never matches on message text.
 */
export function getGatewayHttpStatus(err: unknown): number | null {
  if (isSphereError(err) && err.code === 'CERTIFICATION_UNCONFIRMED') {
    return isJsonRpcNetworkErrorShape(err.cause) ? err.cause.status : null;
  }
  return isJsonRpcNetworkErrorShape(err) ? err.status : null;
}

/** True when the gateway rejected the request for quota (SGW rate limit, HTTP 429). */
export function isQuotaRateLimit(err: unknown): boolean {
  return getGatewayHttpStatus(err) === 429;
}

/**
 * True when the gateway rejected the request as unauthenticated/forbidden
 * (HTTP 401 or 403). The proxy 401 is byte-identical for missing/invalid/
 * revoked/expired subscription keys — callers must disambiguate further
 * (see spec §1 "401 branch") via `/api/utilization`.
 */
export function isGatewayAuthError(err: unknown): boolean {
  const status = getGatewayHttpStatus(err);
  return status === 401 || status === 403;
}

export { isSphereError };
