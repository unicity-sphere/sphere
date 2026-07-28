/**
 * Group invite links, built and parsed in one place so the two cannot drift.
 *
 * They already had: the builder emitted `…/current/path#/agents/group-chat?join=…`
 * while the reader used `searchParams.get('join')`. The router is a BrowserRouter, so
 * it never parses the fragment — every invite link the app produced was dead, and the
 * failure was silent because the recipient simply landed on the group page with no
 * invite prefilled.
 *
 * Two things the old builder got wrong beyond the fragment:
 *   - `window.location.pathname` is the CURRENT route, not the app base, so a link
 *     copied from /agents/dm pointed at /agents/dm.
 *   - the base must be `import.meta.env.BASE_URL`, which is exactly what
 *     `<BrowserRouter basename>` is given. It is '/' in production and a subpath on
 *     GitHub Pages previews.
 */

/** Route that reads the `join` param (see App.tsx and GroupChatSection). */
const INVITE_ROUTE = 'agents/group-chat';

export interface GroupInvite {
  groupId: string;
  code: string;
}

/**
 * Absolute invite URL. `origin` and `base` are injectable so this is testable without
 * a DOM; both default to the running app's values.
 *
 * BASE_URL always carries a trailing slash, hence no separator before INVITE_ROUTE.
 */
export function buildGroupInviteLink(
  invite: GroupInvite,
  origin: string = window.location.origin,
  base: string = import.meta.env.BASE_URL,
): string {
  // The whole `id/code` pair is encoded as one value: URLSearchParams decodes %2F back
  // to '/', so parseGroupInvite still sees the separator, and a code containing '&' or
  // '#' cannot truncate the URL.
  const value = encodeURIComponent(`${invite.groupId}/${invite.code}`);
  return `${origin}${base}${INVITE_ROUTE}?join=${value}`;
}

/**
 * Split a `groupId/inviteCode` value. Splits on the FIRST slash only — invite codes are
 * opaque and may contain one.
 */
export function parseGroupInvite(value: string): GroupInvite | null {
  const trimmed = value.trim();
  const slash = trimmed.indexOf('/');
  if (slash <= 0 || slash === trimmed.length - 1) return null;
  return {
    groupId: trimmed.slice(0, slash),
    code: trimmed.slice(slash + 1),
  };
}

/** The `join` value carried by a built link, or null. Exists so a test can prove the
 *  builder and the parser are inverse rather than merely both plausible. */
export function readJoinParam(url: string): string | null {
  try {
    return new URL(url).searchParams.get('join');
  } catch {
    return null;
  }
}
