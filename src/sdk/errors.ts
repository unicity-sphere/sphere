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
