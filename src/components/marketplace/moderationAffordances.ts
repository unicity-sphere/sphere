// src/components/marketplace/moderationAffordances.ts
//
// Pure decisions behind the Report / Appeal controls, extracted so they can
// be unit-tested without a component harness — ProjectReviewsSection and
// ReviewReplies have none (see hiddenReviewNotice.ts, Task 14, for the
// precedent).

/**
 * Whether the Report control should appear for a piece of content.
 * Never your own content — the backend 403s a self-report, and offering an
 * action that always fails is worse than not offering it. A viewer with no
 * wallet identity (not signed in) can't report either.
 */
export function canReport(viewerAddress: string | null, authorAddress: string): boolean {
  return viewerAddress !== null && viewerAddress !== authorAddress;
}

/**
 * Whether the Appeal control should appear on the author's own hidden-review
 * banner: only while the content is actually hidden, and only while no
 * appeal is already open for it.
 */
export function canAppeal(mine: { hiddenAt: string | null } | undefined, hasOpenAppeal: boolean): boolean {
  return !!mine?.hiddenAt && !hasOpenAppeal;
}
