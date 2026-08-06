/**
 * sphere-quest backend client for user-scoped resources (auth + installed apps).
 *
 * The API base URL matches marketplaceApi (same backend).
 * JWT is obtained lazily via signInWithSphere() — no UX prompt because the
 * Sphere wallet signs in-process via sphere.signMessage().
 */
import type { Sphere } from '@unicitylabs/sphere-sdk';
import type { ProjectType } from '../utils/isStandalone';

const API_BASE = import.meta.env.VITE_SPHERE_API_URL ?? 'http://localhost:3001';
const JWT_KEY = 'sphere_user_jwt';

// ── Types ─────────────────────────────────────────────────────────────

export interface InstalledApp {
  id:           string;
  projectId:    string;
  installedAt:  string;
  lastOpenedAt: string | null;
  pinned:       boolean;
  project: {
    _id:         string;
    type:        ProjectType;
    slug:        string;
    name:        string;
    tagline:     string;
    logoUrl:     string;
    bannerUrl:   string | null;
    category:    string;
    accentColor: string;
    appUrl:      string | null;
    websiteUrl:  string | null;
    repoUrl:     string | null;
    pricing?:    { model: string; priceUCT: number | null };
  };
}

interface AuthChallenge {
  nonce:     string;
  challenge: string;
  expiresAt: string;
}

interface AuthVerifyResponse {
  jwt:       string;
  role:      'USER' | 'ADMIN';
  expiresIn: number;
}

// ── JWT storage ───────────────────────────────────────────────────────

export function getStoredJwt(): string | null {
  return localStorage.getItem(JWT_KEY);
}

export function clearJwt(): void {
  localStorage.removeItem(JWT_KEY);
}

function setStoredJwt(jwt: string): void {
  localStorage.setItem(JWT_KEY, jwt);
}

// ── Sign-in ───────────────────────────────────────────────────────────

let signInPromise: Promise<string> | null = null;

/**
 * Get a valid JWT, signing in via the Sphere wallet if necessary.
 * Concurrent callers share the same in-flight sign-in promise.
 */
export async function ensureJwt(sphere: Sphere): Promise<string> {
  const existing = getStoredJwt();
  if (existing) return existing;
  if (signInPromise) return signInPromise;

  signInPromise = (async () => {
    try {
      const identity = sphere.identity;
      if (!identity?.directAddress || !identity?.chainPubkey) {
        throw new Error('Wallet identity unavailable');
      }

      // X-Client on both legs of the handshake: this pair runs before any JWT
      // exists, so it can't go through authFetch, and without the header the
      // backend attributes the sign-in to nobody.
      const challengeRes = await fetch(
        `${API_BASE}/api/auth/challenge?address=${encodeURIComponent(identity.directAddress)}&pubkey=${identity.chainPubkey}`,
        { headers: { 'x-client': 'sphere' } },
      );
      if (!challengeRes.ok) throw new Error(`Challenge failed: ${challengeRes.status}`);
      const { nonce, challenge } = (await challengeRes.json()) as AuthChallenge;

      const signature = sphere.signMessage(challenge);

      const verifyRes = await fetch(`${API_BASE}/api/auth/verify`, {
        method:  'POST',
        headers: { 'content-type': 'application/json', 'x-client': 'sphere' },
        body:    JSON.stringify({
          directAddress: identity.directAddress,
          chainPubkey:   identity.chainPubkey,
          signature,
          nonce,
          nametag:       identity.nametag ?? undefined,
        }),
      });
      if (!verifyRes.ok) throw new Error(`Verify failed: ${verifyRes.status}`);
      const { jwt } = (await verifyRes.json()) as AuthVerifyResponse;

      setStoredJwt(jwt);
      return jwt;
    } finally {
      signInPromise = null;
    }
  })();

  return signInPromise;
}

// ── Authenticated fetch ───────────────────────────────────────────────

async function authFetch(
  sphere: Sphere,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const jwt = await ensureJwt(sphere);
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${jwt}`);
  headers.set('x-client', 'sphere');
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 503) {
    const body = await res.clone().json().catch(() => null) as { error?: string; message?: string } | null;
    if (body?.error === 'under_maintenance') {
      window.dispatchEvent(new CustomEvent('maintenance:forced', { detail: { message: body.message } }));
    }
  }
  if (res.status === 401) {
    // JWT expired/invalid — drop it; caller may retry which will re-sign in
    clearJwt();
    throw new Error('Unauthorized');
  }
  return res;
}

// ── Installed-apps endpoints ──────────────────────────────────────────

export async function fetchInstalledApps(
  sphere: Sphere,
  type?: 'app' | 'skill',
): Promise<InstalledApp[]> {
  const qs = type ? `?type=${type}` : '';
  const res = await authFetch(sphere, `/api/user/installed-apps${qs}`);
  if (!res.ok) throw new Error(`fetchInstalledApps: ${res.status}`);
  return res.json();
}

export async function installApp(sphere: Sphere, projectId: string): Promise<void> {
  const res = await authFetch(sphere, '/api/user/installed-apps', {
    method: 'POST',
    body:   JSON.stringify({ projectId }),
  });
  if (!res.ok) throw new Error(`installApp: ${res.status}`);
}

export async function uninstallApp(sphere: Sphere, projectId: string): Promise<void> {
  const res = await authFetch(sphere, `/api/user/installed-apps/${projectId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`uninstallApp: ${res.status}`);
}

export async function pingOpenApp(sphere: Sphere, projectId: string): Promise<void> {
  // Best-effort — failure should never block opening the app
  try {
    await authFetch(sphere, `/api/user/installed-apps/${projectId}/open`, { method: 'POST' });
  } catch {
    /* swallow */
  }
}

// ── Ratings: recommend / helpful voting / replies ────────────────────

export interface MyRating {
  _id:         string;
  projectId:   string;
  recommended: boolean;
  comment:     string | null;
  updatedAt:   string;
  /** Set when a moderator hid this review. The author sees the reason, never who did it. */
  hiddenAt:     string | null;
  hiddenReason: string | null;
}

export async function fetchMyRatings(sphere: Sphere): Promise<MyRating[]> {
  const res = await authFetch(sphere, '/api/user/ratings');
  if (!res.ok) throw new Error(`fetchMyRatings: ${res.status}`);
  return res.json();
}

export async function submitRating(
  sphere: Sphere,
  projectId: string,
  recommended: boolean,
  comment?: string,
): Promise<MyRating> {
  const res = await authFetch(sphere, '/api/user/ratings', {
    method: 'POST',
    body:   JSON.stringify({ projectId, recommended, ...(comment ? { comment } : {}) }),
  });
  if (res.status === 403) throw new Error('not-eligible');
  if (!res.ok) throw new Error(`submitRating: ${res.status}`);
  return res.json();
}

export async function deleteMyRating(sphere: Sphere, projectId: string): Promise<void> {
  const res = await authFetch(sphere, `/api/user/ratings/${projectId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`deleteMyRating: ${res.status}`);
}

// ── Helpful voting on a specific rating ──────────────────────────────

export type HelpfulVote = 'helpful' | 'not_helpful';

export async function voteRating(sphere: Sphere, ratingId: string, vote: HelpfulVote): Promise<void> {
  const res = await authFetch(sphere, `/api/user/ratings/${ratingId}/vote`, {
    method: 'POST',
    body:   JSON.stringify({ vote }),
  });
  if (!res.ok) throw new Error(`voteRating: ${res.status}`);
}

export async function unvoteRating(sphere: Sphere, ratingId: string): Promise<void> {
  const res = await authFetch(sphere, `/api/user/ratings/${ratingId}/vote`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`unvoteRating: ${res.status}`);
}

// ── Replies (Telegram-style comments on a review) ────────────────────

export interface MyReply {
  _id:            string;
  ratingId:       string;
  replyToReplyId: string | null;
  comment:        string;
  createdAt:      string;
  /** Set when a moderator hid this reply. The author sees the reason, never who did it. */
  hiddenAt:       string | null;
  hiddenReason:   string | null;
}

/**
 * The caller's own replies to a review, hidden ones included — every public
 * read filters hidden replies out, so this is the only way the author can
 * learn a reply of theirs was moderated.
 */
export async function fetchMyReplies(sphere: Sphere, ratingId: string): Promise<MyReply[]> {
  const res = await authFetch(sphere, `/api/user/rating-replies?ratingId=${ratingId}`);
  if (!res.ok) throw new Error(`fetchMyReplies: ${res.status}`);
  return (await res.json()).replies;
}

export interface PostedReply {
  _id:            string;
  ratingId:       string;
  userAddress:    string;
  replyToReplyId: string | null;
  comment:        string;
  createdAt:      string;
}

export async function postReply(
  sphere: Sphere,
  ratingId: string,
  comment: string,
  replyToReplyId?: string,
): Promise<PostedReply> {
  const res = await authFetch(sphere, `/api/user/ratings/${ratingId}/replies`, {
    method: 'POST',
    body:   JSON.stringify({ comment, ...(replyToReplyId ? { replyToReplyId } : {}) }),
  });
  if (!res.ok) throw new Error(`postReply: ${res.status}`);
  return res.json();
}

export async function deleteReply(sphere: Sphere, ratingId: string, replyId: string): Promise<void> {
  const res = await authFetch(sphere, `/api/user/ratings/${ratingId}/replies/${replyId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`deleteReply: ${res.status}`);
}

// ── Moderation: report content, appeal a hide ────────────────────────

export type ReportTargetType = 'project' | 'rating' | 'rating_reply';
export type ReportCategory = 'spam' | 'abuse' | 'off_topic' | 'illegal' | 'other';

export interface ReportBody {
  targetType: ReportTargetType;
  targetId:   string;
  category:   ReportCategory;
  comment?:   string;
}

/**
 * Flag content for moderator review. Reporting the same target again edits
 * the caller's existing report rather than creating a second one, and never
 * reopens a case a moderator already resolved — both handled server-side.
 *
 * Known failure codes (thrown as Error.message):
 * - 'rate-limited' — 429, more than 10 reports/wallet/hour
 * - 'own-content'  — 403, the target belongs to the caller
 * - 'not-found'    — 404, the target (or its parent project) doesn't exist / isn't published
 */
export async function submitReport(sphere: Sphere, body: ReportBody): Promise<void> {
  const res = await authFetch(sphere, '/api/user/reports', {
    method: 'POST',
    body:   JSON.stringify(body),
  });
  if (res.status === 429) throw new Error('rate-limited');
  if (res.status === 403) throw new Error('own-content');
  if (res.status === 404) throw new Error('not-found');
  if (!res.ok) throw new Error(`submitReport: ${res.status}`);
}

/**
 * Appeal a hidden rating. Only the rating's author may call this, only
 * while it is actually hidden, and only one open appeal is allowed at a
 * time — all enforced server-side.
 *
 * Known failure codes (thrown as Error.message):
 * - 'rate-limited'   — 429, more than 5 appeals/wallet/hour (shared with appealReply)
 * - 'appeal-open'    — 409, an appeal is already open for this rating
 * - 'not-author'     — 403, the caller doesn't own the rating
 * - 'invalid-appeal' — 400, either the rating isn't currently hidden or the
 *   payload failed validation (both are ValidationError server-side and are
 *   indistinguishable from the status code alone — see the body's `code`
 *   field if the two ever need different copy)
 */
export async function appealRating(sphere: Sphere, ratingId: string, comment: string): Promise<void> {
  const res = await authFetch(sphere, `/api/user/ratings/${ratingId}/appeal`, {
    method: 'POST',
    body:   JSON.stringify({ comment }),
  });
  if (res.status === 429) throw new Error('rate-limited');
  if (res.status === 409) throw new Error('appeal-open');
  if (res.status === 403) throw new Error('not-author');
  if (res.status === 400) throw new Error('invalid-appeal');
  if (!res.ok) throw new Error(`appealRating: ${res.status}`);
}

/**
 * Appeal a hidden reply. Same rules as {@link appealRating}, scoped to a
 * rating reply instead of the rating itself.
 */
export async function appealReply(sphere: Sphere, replyId: string, comment: string): Promise<void> {
  const res = await authFetch(sphere, `/api/user/rating-replies/${replyId}/appeal`, {
    method: 'POST',
    body:   JSON.stringify({ comment }),
  });
  if (res.status === 429) throw new Error('rate-limited');
  if (res.status === 409) throw new Error('appeal-open');
  if (res.status === 403) throw new Error('not-author');
  if (res.status === 400) throw new Error('invalid-appeal');
  if (!res.ok) throw new Error(`appealReply: ${res.status}`);
}
