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

export function scrubText(text: string): string {
  return text
    .replace(EMAIL_RE, '[email]')
    .replace(LONG_HEX_RE, '[hex]')
    .replace(MNEMONIC_RE, '[possible mnemonic]')
    .replace(NAMETAG_RE, '@[nametag]');
}

/**
 * Keeps the path and query param names, redacts every query value — routes
 * carry identifying params (?nametag=, ?join=, ?url=, ?origin=).
 */
export function redactUrl(url: string): string {
  const q = url.indexOf('?');
  if (q === -1) return scrubText(url);
  const query = url.slice(q + 1).replace(/=[^&]*/g, '=[Filtered]');
  // scrub the whole reassembled string: param names and valueless query
  // tokens can carry secrets too
  return scrubText(url.slice(0, q) + '?' + query);
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
