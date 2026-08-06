// src/components/marketplace/mergeOwnHiddenReplies.ts
//
// The public thread omits hidden replies. The author's own hidden ones are
// merged back in so they can see the moderation and appeal it — nobody
// else's hidden replies are ever visible to anyone but a moderator. That
// guarantee lives at the call site (GET /api/user/rating-replies scopes by
// JWT to the caller's own replies) — this helper trusts whatever it's given
// as `mine` and just does the merge/sort, extracted so it can be unit-tested
// without a component harness (ReviewReplies has none — see
// hiddenReviewNotice.ts / moderationAffordances.ts for the precedent).

/** Marks a merged-in entry as the caller's own hidden reply, distinct from anything the public thread returned. */
export interface OwnHiddenTag { __ownHidden: true }

/**
 * Merge the caller's own hidden replies into a public reply thread.
 *
 * Appends only entries whose `hiddenAt` is truthy and whose `_id` is not
 * already present in the public thread, then sorts the result by
 * `createdAt` ascending — same order the public thread is already in.
 *
 * Appended entries are tagged with `__ownHidden: true` so callers can
 * discriminate them by a property this module owns, rather than by testing
 * for the absence of some field the public shape happens to carry today
 * (e.g. `userAddress`) — a field the public API could grow later without
 * anyone noticing this merge depends on its absence, silently letting a
 * moderated reply fall back through to rendering as a normal one. `!!m.hiddenAt`
 * (not `m.hiddenAt !== null`) so this agrees with `canAppeal` in
 * `moderationAffordances.ts`, which also treats `''`/`undefined` as not-hidden.
 *
 * Two type parameters (rather than one, with `mine` typed inline) so the
 * appended entries keep their full shape — `M`'s extra fields (e.g.
 * `hiddenReason`, `comment`) survive into the return type instead of
 * collapsing to just `{ _id, createdAt, hiddenAt }`, which callers need to
 * render the banner.
 */
export function mergeOwnHiddenReplies<
  T extends { _id: string; createdAt: string },
  M extends { _id: string; createdAt: string; hiddenAt: string | null },
>(
  publicReplies: T[],
  mine: M[],
): (T | (M & OwnHiddenTag))[] {
  const presentIds = new Set(publicReplies.map((r) => r._id));
  const toAppend: (M & OwnHiddenTag)[] = mine
    .filter((m) => !!m.hiddenAt && !presentIds.has(m._id))
    .map((m) => ({ ...m, __ownHidden: true as const }));

  return [...publicReplies, ...toAppend].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}
