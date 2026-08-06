// tests/unit/mergeOwnHiddenReplies.test.ts
import { describe, it, expect } from 'vitest';
import { mergeOwnHiddenReplies } from '../../src/components/marketplace/mergeOwnHiddenReplies';

interface PublicReply { _id: string; createdAt: string; comment: string }
interface MyReply { _id: string; createdAt: string; hiddenAt: string | null; comment: string }

function pub(id: string, createdAt: string): PublicReply {
  return { _id: id, createdAt, comment: `public-${id}` };
}

function mine(id: string, createdAt: string, hiddenAt: string | null): MyReply {
  return { _id: id, createdAt, hiddenAt, comment: `mine-${id}` };
}

describe('mergeOwnHiddenReplies', () => {
  it('returns the public thread unchanged when there are no hidden replies of mine', () => {
    const publicReplies = [pub('a', '2026-08-01T00:00:00.000Z'), pub('b', '2026-08-02T00:00:00.000Z')];
    expect(mergeOwnHiddenReplies(publicReplies, [])).toEqual(publicReplies);
  });

  it('does not append an own reply that is not hidden', () => {
    const publicReplies = [pub('a', '2026-08-01T00:00:00.000Z')];
    const mineList = [mine('c', '2026-08-03T00:00:00.000Z', null)];
    expect(mergeOwnHiddenReplies(publicReplies, mineList)).toEqual(publicReplies);
  });

  it('inserts a hidden own reply in date order', () => {
    const publicReplies = [pub('a', '2026-08-01T00:00:00.000Z'), pub('c', '2026-08-03T00:00:00.000Z')];
    const hidden = mine('b', '2026-08-02T00:00:00.000Z', '2026-08-05T00:00:00.000Z');
    const result = mergeOwnHiddenReplies(publicReplies, [hidden]);
    expect(result.map((r) => r._id)).toEqual(['a', 'b', 'c']);
  });

  it('does not duplicate an id that is already present in the public thread', () => {
    const publicReplies = [pub('a', '2026-08-01T00:00:00.000Z')];
    // Same id as a public reply — should never happen in practice (a hidden
    // reply is filtered out of the public read), but the merge must be
    // defensive about it rather than double-render.
    const hidden = mine('a', '2026-08-01T00:00:00.000Z', '2026-08-05T00:00:00.000Z');
    const result = mergeOwnHiddenReplies(publicReplies, [hidden]);
    expect(result).toHaveLength(1);
    expect(result).toEqual(publicReplies);
  });

  it('never surfaces another wallet\'s hidden reply, because the caller only ever passes its own', () => {
    // The helper has no notion of "whose" a reply is beyond what's passed in
    // `mine` — the guarantee that another wallet's hidden replies never
    // appear comes from the caller only ever fetching the caller's own
    // (GET /api/user/rating-replies scopes by JWT). Pin that trust boundary:
    // an empty `mine` (nothing of the caller's is hidden) never manufactures
    // extra entries out of the public thread alone.
    const publicReplies = [pub('a', '2026-08-01T00:00:00.000Z')];
    const result = mergeOwnHiddenReplies(publicReplies, []);
    expect(result).toHaveLength(1);
  });

  it('sorts multiple hidden entries interleaved with the public thread by createdAt ascending', () => {
    const publicReplies = [pub('a', '2026-08-01T00:00:00.000Z'), pub('d', '2026-08-04T00:00:00.000Z')];
    const mineList = [
      mine('c', '2026-08-03T00:00:00.000Z', '2026-08-06T00:00:00.000Z'),
      mine('b', '2026-08-02T00:00:00.000Z', '2026-08-06T00:00:00.000Z'),
    ];
    const result = mergeOwnHiddenReplies(publicReplies, mineList);
    expect(result.map((r) => r._id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('tags appended entries with __ownHidden so callers can discriminate on a field this module owns', () => {
    // The render branch in ReviewReplies must never rely on a NEGATIVE test
    // against a field the public shape happens to lack today (e.g.
    // `userAddress`) — if the public API ever grows that field, a negative
    // structural test would silently stop firing and a moderated reply
    // would render as a normal one again. Pin the positive tag instead.
    const publicReplies = [pub('a', '2026-08-01T00:00:00.000Z')];
    const hidden = mine('b', '2026-08-02T00:00:00.000Z', '2026-08-05T00:00:00.000Z');
    const result = mergeOwnHiddenReplies(publicReplies, [hidden]);

    const appended = result.find((r) => r._id === 'b') as { __ownHidden?: true };
    const untouched = result.find((r) => r._id === 'a') as { __ownHidden?: true };
    expect(appended.__ownHidden).toBe(true);
    expect(untouched.__ownHidden).toBeUndefined();
  });

  it('treats an empty-string hiddenAt as not hidden, matching canAppeal\'s !!mine?.hiddenAt check', () => {
    // moderationAffordances.ts:canAppeal uses `!!mine?.hiddenAt`. If this
    // helper used `hiddenAt !== null` instead, an empty-string hiddenAt
    // would merge in and render "A moderator hid this reply of yours" while
    // canAppeal refused to show the Appeal control for it — a dead-end
    // accusation with nothing to click. Keep both checks in agreement.
    const publicReplies = [pub('a', '2026-08-01T00:00:00.000Z')];
    const mineList = [mine('b', '2026-08-02T00:00:00.000Z', '')];
    expect(mergeOwnHiddenReplies(publicReplies, mineList)).toEqual(publicReplies);
  });

  it('does not mutate the public thread array or its elements', () => {
    // `data?.replies` is the react-query cache array — an implementation
    // that pushed onto it in place (e.g. `publicReplies.push(...); return
    // publicReplies.sort(...)`) would pass every `toEqual` assertion above
    // (they all compare against the same, now-mutated, reference) while
    // corrupting every other consumer of that cached array.
    const publicReplies = [pub('b', '2026-08-02T00:00:00.000Z'), pub('a', '2026-08-01T00:00:00.000Z')];
    const snapshotBefore = publicReplies.map((r) => ({ ...r }));
    const hidden = mine('c', '2026-08-03T00:00:00.000Z', '2026-08-05T00:00:00.000Z');

    const result = mergeOwnHiddenReplies(publicReplies, [hidden]);

    expect(result).not.toBe(publicReplies);
    expect(publicReplies).toEqual(snapshotBefore);
    expect(publicReplies).toHaveLength(2);
  });
});
