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

export { isSphereError };
