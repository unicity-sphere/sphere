import type { Breadcrumb, BrowserOptions, ErrorEvent } from '@sentry/react';

// Not re-exported by @sentry/react (it lives in @sentry/core, an undeclared
// transitive dep) — derive it from the public option type instead
type TransactionEvent = Parameters<NonNullable<BrowserOptions['beforeSendTransaction']>>[0];

/**
 * Client-side scrubbing for everything Sentry sends. This is a self-custody
 * wallet: mnemonics, private keys, and wallet passwords exist in browser
 * memory, and error messages can interpolate them (the 2022 Slope Wallet
 * drain shipped seed phrases to Sentry through exactly this path). Server-side
 * scrubbing only runs after the data has left the browser, so this layer errs
 * on the side of redacting too much — a mangled error message is recoverable,
 * a leaked seed phrase is not.
 */

// Quantifiers are bounded (RFC 5321 caps anyway): an unbounded [\w.+-]+ prefix
// backtracks quadratically on long hex/base64 blobs — seconds of main-thread
// freeze inside beforeSend
const EMAIL_RE = /[\w.+-]{1,64}@[\w-]{1,255}\.[\w.-]{1,255}/g;
// 64+ hex chars: the shape of a raw private key (also matches sha256/txids —
// privacy wins over debuggability). No \b guards: they let '0x'-prefixed keys
// and hex-followed-by-a-letter escape.
const LONG_HEX_RE = /(?:0x)?[0-9a-fA-F]{64,}/g;
// 12+ consecutive words of 3–8 lowercase letters — the shape of a BIP39
// mnemonic (\s+ so grid/textarea copies separated by newlines still match).
// Prose almost always breaks such a run with short words, capitals, or
// punctuation, so false positives are rare.
const MNEMONIC_RE = /\b[a-z]{3,8}(?:\s+[a-z]{3,8}){11,}\b/g;
// @nametag handles (SDK messages embed them, e.g. "@bob is already taken");
// the lookahead spares npm scopes like @unicitylabs/sphere-sdk — it includes
// '-'/'_' so backtracking can't re-match half a hyphenated scope
const NAMETAG_RE = /@[a-z0-9_-]{2,64}(?![a-z0-9_/-])/gi;

// Key names whose values must never ride along in extra/contexts/tags
const SENSITIVE_KEY_RE = /mnemonic|seed|phrase|private|secret|password|passphrase|entropy|token|key/i;

// Grouping normalization: SDK messages interpolate per-occurrence identifiers,
// so Sentry fingerprints diverge and the SAME defect mints a new issue per
// occurrence (SPHERE-25 split off SPHERE-R over an intent UUID; SPHERE-1Z off
// SPHERE-Y over an agent name). Normalizing here is also privacy-positive.
// Deliberately NOT normalized: HTTP status codes in messages — they carry the
// only diagnostic signal those events have.
const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const SINCE_CURSOR_RE = /([?&]since=)\d+/g;
const QUOTED_RECIPIENT_RE = /(transport pubkey for )"[^"]{1,64}"/g;
const RECIPIENT_IDENTITY_RE = /(Recipient )\S{1,64}( has no published identity)/g;

export function scrubText(text: string): string {
  return text
    .replace(EMAIL_RE, '[email]')
    .replace(LONG_HEX_RE, '[hex]')
    .replace(MNEMONIC_RE, '[possible mnemonic]')
    .replace(NAMETAG_RE, '@[nametag]')
    .replace(UUID_RE, ':id')
    .replace(SINCE_CURSOR_RE, '$1:n')
    .replace(QUOTED_RECIPIENT_RE, '$1"[nametag]"')
    .replace(RECIPIENT_IDENTITY_RE, '$1[nametag]$2');
}

/**
 * Keeps the path and param names, redacts every query AND fragment value —
 * routes carry identifying params (?nametag=, ?join=, ?url=, ?origin=), and
 * OAuth-style flows put tokens in the fragment (#access_token=...).
 */
export function redactUrl(url: string): string {
  const cut = url.search(/[?#]/);
  if (cut === -1) return scrubText(url);
  const rest = url.slice(cut).replace(/=[^&#]*/g, '=[Filtered]');
  // scrub the whole reassembled string: param names and valueless tokens
  // can carry secrets too
  return scrubText(url.slice(0, cut) + rest);
}

function deepScrub(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return scrubText(value);
  if (depth >= 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => deepScrub(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = SENSITIVE_KEY_RE.test(k) ? '[Filtered]' : deepScrub(v, depth + 1);
  }
  return out;
}

export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  // console breadcrumbs are disabled at the integration level; drop any that
  // arrive through other paths anyway
  if (breadcrumb.category === 'console') return null;
  if (breadcrumb.message) breadcrumb.message = scrubText(breadcrumb.message);
  const data = breadcrumb.data;
  if (data) {
    for (const key of ['url', 'from', 'to'] as const) {
      if (typeof data[key] === 'string') data[key] = redactUrl(data[key]);
    }
  }
  return breadcrumb;
}

/**
 * Transactions need their own pass: fetch/XHR child spans carry the raw
 * request URL and query string in span attributes (url, http.url, url.full,
 * http.query) that beforeSend never sees — dataCollection.queryParams is only
 * honored by the server-side SDKs.
 */
export function scrubTransactionEvent<E extends TransactionEvent>(event: E): E {
  if (event.request?.url) event.request.url = redactUrl(event.request.url);
  const spanDatas = (event.spans ?? [])
    .map((s): Record<string, unknown> | undefined => s.data)
    .concat(event.contexts?.trace?.data);
  for (const data of spanDatas) {
    if (!data) continue;
    for (const key of ['url', 'http.url', 'url.full']) {
      if (typeof data[key] === 'string') data[key] = redactUrl(data[key] as string);
    }
    delete data['http.query'];
    delete data['http.fragment'];
  }
  return event;
}

// EIP-1193 ProviderRpcError codes (userRejected, unauthorized,
// unsupportedMethod, disconnected, chainDisconnected). Positive 4xxx codes are
// wallet-provider-specific — our own JSON-RPC surfaces (aggregator, wallet-api)
// use -32xxx — so a rejection carrying one cannot have come from our code.
// LATENT COLLISION (documented, currently safe): sphere-sdk's Connect protocol
// reuses 4001/4100/4200 in its own ERROR_CODES — but ConnectClient/ConnectHost
// always reject ConnectError, a real Error, which never produces the
// `__serialized__` plain-object shape this filter requires. If a connect
// surface ever rejects a bare `{code: 4001, ...}` object, this filter would
// eat it — the regression test pins the Error-instance path staying captured.
const EIP1193_CODES = new Set([4001, 4100, 4200, 4900, 4901]);
const EXTENSION_URL_RE = /\b(?:chrome|moz|safari-web)-extension:\/\//;
// chrome.tabs.* error strings relayed by extension background scripts — these
// cannot originate from web-page code (SPHERE-H).
const CHROME_TABS_MSG_RE = /^No tab with id: -?\d+\.?$/;

/**
 * Unhandled promise rejections thrown by injected wallet-extension provider
 * scripts. This app never calls `window.ethereum` — these originate wholly
 * inside extensions whose inpage scripts run in our page context. They reject
 * with PLAIN OBJECTS, so Sentry builds a synthetic event with no stack frames
 * and `denyUrls` (which matches frame URLs) never sees the extension origin.
 * Shapes seen in production, ~49% of all events (SPHERE-9/A/D/H/E):
 *   {code: 4900, message, stack?}                       — EIP-1193 provider
 *   {code: -32603, message, data: {originalError}}      — @metamask/rpc-errors
 *   {message: 'No tab with id: N.'}                     — chrome.tabs relay
 *   {}                                                  — keyless, stripped
 *                                                          crossing the
 *                                                          content-script
 *                                                          boundary
 * Every app/SDK error surface rejects real Error subclasses (SphereError,
 * ConnectError, WalletApiError, JsonRpcNetworkError), which Sentry captures
 * with a real exception and NO `__serialized__` extra — so matching on the
 * serialized plain object is collision-free by construction.
 */
export function isInjectedProviderNoise(event: ErrorEvent): boolean {
  const mechanism = event.exception?.values?.[0]?.mechanism?.type ?? '';
  if (!mechanism.includes('onunhandledrejection')) return false;
  const serialized = (event.extra as Record<string, unknown> | undefined)?.['__serialized__'];
  if (typeof serialized !== 'object' || serialized === null) return false;
  const { code, stack, message, data } = serialized as {
    code?: unknown; stack?: unknown; message?: unknown; data?: unknown;
  };
  if (typeof code === 'number' && EIP1193_CODES.has(code)) return true;
  if (typeof stack === 'string' && EXTENSION_URL_RE.test(stack)) return true;
  // @metamask/rpc-errors serializeError: our surfaces never wrap a rejection
  // in {code: -32603, data: {originalError}} (SPHERE-D, 353 events).
  if (code === -32603 && typeof data === 'object' && data !== null && 'originalError' in data) {
    return true;
  }
  if (typeof message === 'string' && (CHROME_TABS_MSG_RE.test(message) || message === 'Cannot verify request origin')) {
    return true;
  }
  // A keyless object carries zero diagnostic value by construction (SPHERE-E).
  return Object.keys(serialized).length === 0;
}

export function scrubEvent<E extends ErrorEvent>(event: E): E {
  if (event.message) event.message = scrubText(event.message);
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = scrubText(exception.value);
  }
  if (event.request) {
    if (event.request.url) event.request.url = redactUrl(event.request.url);
    delete event.request.query_string;
    delete event.request.cookies;
    delete event.request.headers;
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.flatMap((b) => {
      const scrubbed = scrubBreadcrumb(b);
      return scrubbed ? [scrubbed] : [];
    });
  }
  if (event.extra) event.extra = deepScrub(event.extra, 1) as typeof event.extra;
  if (event.contexts) event.contexts = deepScrub(event.contexts, 1) as typeof event.contexts;
  if (event.tags) event.tags = deepScrub(event.tags, 1) as typeof event.tags;
  return event;
}
