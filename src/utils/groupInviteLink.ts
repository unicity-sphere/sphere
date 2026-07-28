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
 * Accepts either a `groupId/inviteCode` value or a full invite URL.
 *
 * Both, because the app asks for both: the copy button puts a URL on the
 * clipboard while the manual field is labelled "invite link", so pasting that
 * URL is the obvious move — and taking only the bare form rejected a link the
 * app itself had just produced.
 *
 * A URL is recognised by parsing, not by string sniffing, and one WITHOUT a
 * `join` value is rejected outright: falling through to the slash split would
 * read "https:" as a group id, which is a confident wrong answer rather than a
 * refusal the user can act on.
 *
 * The bare form splits on the FIRST slash only — invite codes are opaque and
 * may contain one.
 */
export function parseGroupInvite(value: string): GroupInvite | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  let candidate = trimmed;
  try {
    // Throws for anything that is not an absolute URL, which is the bare form.
    const url = new URL(trimmed);
    const join = url.searchParams.get('join');
    if (!join) return null;
    candidate = join.trim();
  } catch {
    // Not a URL — treat as the bare groupId/code form.
  }

  const slash = candidate.indexOf('/');
  if (slash <= 0 || slash === candidate.length - 1) return null;
  return {
    groupId: candidate.slice(0, slash),
    code: candidate.slice(slash + 1),
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
