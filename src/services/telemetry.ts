/**
 * First-party page-view telemetry.
 *
 * Replaces the Google tag that used to run on this origin (removed in #461). A remote
 * script on the origin that holds the mnemonic seed and the private keys has full DOM
 * and storage access and can change without a deploy — and gtag sent `page_location`
 * as the full href, so Google received the Connect popup's `?origin=<dApp>` on every
 * connect, plus `?url=` and `?nametag=`.
 *
 * The rule that makes this safe is one line long: **this module never sends a URL.**
 * It sends the matched route PATTERN and nothing else; sphere-api builds page_location
 * from the pattern plus a trusted origin. So there is no query string to strip and no
 * denylist to keep current — which matters, because external agents deep-link into the
 * wallet with parameters no first-party code produces (see the defensive strips in
 * DMChatSection).
 *
 * Never send: the query string or fragment, a `:param` VALUE, an address, a pubkey, a
 * nametag, a token id, an amount, a tx hash, the JWT, or the subscription key.
 */
import { matchPath } from 'react-router-dom';
import { STORAGE_KEYS } from '../config/storageKeys';
import { detectEnvironment } from '../config/sentry';

/**
 * Route patterns this module may report, mirroring the `path=` props in App.tsx and the
 * allow-list in sphere-api. A path that matches none of these is not sent at all —
 * failing closed, because the alternative is guessing whether an unknown segment is a
 * page name or somebody's nametag.
 */
const ROUTE_PATTERNS: readonly string[] = [
  '/',
  '/about',
  '/agents/:agentId',
  '/apps/:slug',
  '/connect',
  '/developers',
  '/developers/docs',
  '/explore',
  '/explore-agents',
  '/home',
  '/markets',
];

/** GA rolls a session after 30 minutes of inactivity; match it or the numbers disagree. */
const SESSION_IDLE_MS = 30 * 60 * 1000;

const SESSION_ID_KEY   = 'sphere_telemetry_session_id';
const SESSION_SEEN_KEY = 'sphere_telemetry_session_seen';

/**
 * `VITE_SPHERE_API_URL` sed-substitutes to an EMPTY STRING in the Docker image when
 * SPHERE_API_URL is unset, and `??` does not catch `''` — the other consumers fall back
 * to the wallet's own origin and post into the void. Telemetry treats that as "disabled"
 * instead: it is better to lose page views than to POST them at ourselves.
 */
function apiBase(): string | null {
  const raw = import.meta.env.VITE_SPHERE_API_URL as string | undefined;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  return trimmed ? trimmed.replace(/\/+$/, '') : null;
}

/** GA's client-id shape: `<int>.<int>`. */
function mintClientId(): string {
  const rand = Math.floor(Math.random() * 2 ** 31);
  return `${rand}.${Math.floor(Date.now() / 1000)}`;
}

/**
 * The `_ga` cookie is FIRST-PARTY — gtag.js wrote it on our own domain — so it survives
 * the tag's removal and keeps its two-year expiry; it simply stops being refreshed.
 * Adopting it means returning users are not all re-registered as new at the cutover.
 *
 * This is not the rejected "keep gtag running during a migration" idea: no third-party
 * script executes, we only read a value it already left behind. The window is finite —
 * the longer this ships after #461, the fewer users are carried over.
 *
 * Format: `_ga=GA1.1.<random>.<timestamp>`; the client id is the last two parts.
 */
function adoptGaCookie(): string | null {
  const match = /(?:^|;\s*)_ga=([^;]+)/.exec(document.cookie);
  if (!match) return null;
  const parts = match[1].split('.');
  if (parts.length < 4) return null;
  const candidate = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  return /^\d{1,20}\.\d{1,20}$/.test(candidate) ? candidate : null;
}

/**
 * Stable per-browser id. Deliberately random and never derived from the wallet identity:
 * `directAddress` and `chainPubkey` are non-resettable and, against a public ledger,
 * deanonymising. Stored under the `sphere_` prefix so wallet deletion
 * (clearAllSphereData) resets it along with everything else.
 */
export function getOrCreateClientId(): string {
  const existing = localStorage.getItem(STORAGE_KEYS.TELEMETRY_CLIENT_ID);
  if (existing) return existing;

  const id = adoptGaCookie() ?? mintClientId();
  localStorage.setItem(STORAGE_KEYS.TELEMETRY_CLIENT_ID, id);
  return id;
}

function getSessionId(now: number): string {
  const seen = Number(sessionStorage.getItem(SESSION_SEEN_KEY) ?? 0);
  const current = sessionStorage.getItem(SESSION_ID_KEY);

  if (!current || !Number.isFinite(seen) || now - seen > SESSION_IDLE_MS) {
    const fresh = String(Math.floor(now / 1000));
    sessionStorage.setItem(SESSION_ID_KEY, fresh);
    sessionStorage.setItem(SESSION_SEEN_KEY, String(now));
    return fresh;
  }
  sessionStorage.setItem(SESSION_SEEN_KEY, String(now));
  return current;
}

/**
 * Matched pattern for a pathname, or null when nothing matches.
 *
 * Refuses anything carrying a query or fragment. Only the pattern is ever sent, so such
 * an input could not leak on its own — but `matchPath` would happily let `:agentId`
 * swallow `dm?nametag=alice`, and an invariant that depends on a caller's discipline
 * two files away is not one worth relying on.
 */
export function routePatternFor(pathname: string): string | null {
  if (pathname.includes('?') || pathname.includes('#')) return null;
  for (const pattern of ROUTE_PATTERNS) {
    if (matchPath({ path: pattern, end: true }, pathname)) return pattern;
  }
  return null;
}

let lastSentAt = 0;

/**
 * Best-effort, like the existing pingOpenApp: failures are swallowed, because a page
 * view is never worth an error a user can see.
 *
 * `fetch(..., { keepalive: true })` rather than sendBeacon: sphere-api parses
 * application/json only, so a default Blob beacon 415s, and a JSON Blob triggers a
 * preflight whose failure the page cannot observe.
 */
export function trackPageView(pathname: string): void {
  // Production only. The GA property has been mixing localhost, Pages previews and
  // staging with no environment dimension; this is where that stops.
  if (detectEnvironment() !== 'production') return;

  const base = apiBase();
  if (!base) return;

  const route = routePatternFor(pathname);
  if (!route) return;

  const now = Date.now();
  const engagement = lastSentAt ? Math.min(now - lastSentAt, 3_600_000) : 0;
  lastSentAt = now;

  try {
    void fetch(`${base}/api/analytics/collect`, {
      method:    'POST',
      keepalive: true,
      headers:   { 'Content-Type': 'application/json', 'X-Client': 'sphere' },
      body: JSON.stringify({
        client_id:            getOrCreateClientId(),
        session_id:           getSessionId(now),
        route,
        engagement_time_msec: engagement,
      }),
    }).catch(() => {});
  } catch {
    // Storage disabled, quota exhausted, or fetch unavailable — never surface.
  }
}
