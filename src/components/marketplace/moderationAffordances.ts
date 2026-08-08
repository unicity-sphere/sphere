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
 * Whether the Report control should appear on a project page, reporting the
 * project itself rather than a review or reply.
 *
 * A project has no author in the sense the other two target types do — it's
 * owned by an org, not authored by a wallet address the viewer could be
 * compared against — so there's no honest `authorAddress` to pass to
 * {@link canReport}, and passing a fake one just to satisfy that signature
 * would silently make "reporting your own project" impossible to express
 * here. This only gates on being signed in; the backend still enforces its
 * own 'own-content' rule server-side (see submitReport in userApi.ts), this
 * just decides whether the control renders at all.
 */
export function canReportProject(viewerAddress: string | null): boolean {
  return viewerAddress !== null;
}

/**
 * Whether the Appeal control should appear on the author's own hidden-review
 * banner: only while the content is actually hidden, and only while no
 * appeal is already open for it.
 */
export function canAppeal(mine: { hiddenAt: string | null } | undefined, hasOpenAppeal: boolean): boolean {
  return !!mine?.hiddenAt && !hasOpenAppeal;
}
