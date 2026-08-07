import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Send, Trash2, ThumbsUp, ThumbsDown, MessageCircle, Flag } from 'lucide-react';
import { useSphereContext } from '../../sdk/hooks/core/useSphere';
import { useProjectRatings } from '../../hooks/useMarketplace';
import {
  getStoredJwt,
  submitRating,
  deleteMyRating,
  fetchMyRatings,
  voteRating,
  unvoteRating,
  submitReport,
  appealRating,
  type HelpfulVote,
  type ReportCategory,
} from '../../services/userApi';
import { stripDirectScheme, truncateId } from '../../utils/identifiers';
import { RecommendBadge } from './RecommendBadge';
import { ReviewReplies } from './ReviewReplies';
import { ReportModal } from './ReportModal';
import { hiddenNoticeFor, type HiddenNotice } from './hiddenReviewNotice';
import { canReport, canAppeal } from './moderationAffordances';

interface ProjectReviewsSectionProps {
  projectId:       string;
  slug:            string;
  canRate:         boolean;
  positivePercent: number;
  positiveCount:   number;
  negativeCount:   number;
  ratingCount:     number;
}

/**
 * Steam-style verdict for a project's positive percentage.
 *
 * This is the original; it now has two deliberate copies, both named
 * `ratingSummaryLabel`:
 *   - sphere-dev-portal/src/lib/ratingSummary.ts
 *   - sphere-backoffice/src/lib/ratingSummary.ts
 * Extracting one pure function into sphere-ui would cost a publish plus a
 * version bump in all three consumers, so the duplication is on purpose — but
 * changing the thresholds or the copy HERE and nowhere else makes the wallet
 * and the two admin surfaces describe the same project differently, silently.
 * Change all three together.
 */
function summaryLabel(pct: number, total: number): string {
  if (total === 0) return 'No reviews yet';
  if (total < 10) {
    return `${pct}% positive · ${total} review${total === 1 ? '' : 's'}`;
  }
  const tag =
    pct >= 95 ? 'Overwhelmingly Positive'
    : pct >= 80 ? 'Very Positive'
    : pct >= 70 ? 'Mostly Positive'
    : pct >= 40 ? 'Mixed'
    : pct >= 20 ? 'Mostly Negative'
    : 'Very Negative';
  return `${tag} · ${pct}% of ${total.toLocaleString()}`;
}

/**
 * Steam-style reviews section: aggregate % positive + list of reviews with
 * helpful voting and Telegram-style reply threads under each one.
 */
export function ProjectReviewsSection({ projectId, slug, canRate, positivePercent, positiveCount, negativeCount, ratingCount }: ProjectReviewsSectionProps) {
  const { sphere } = useSphereContext();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<'helpful' | 'recent'>('helpful');
  const { data: ratings } = useProjectRatings(slug, 1, sort);
  const [recommended, setRecommended] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<HiddenNotice | null>(null);
  const [myRatingId, setMyRatingId] = useState<string | null>(null);
  const [reportedRatingIds, setReportedRatingIds] = useState<Set<string>>(new Set());
  const [reportTarget, setReportTarget] = useState<{ id: string } | null>(null);
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealComment, setAppealComment] = useState('');
  // Session-local: the backend doesn't expose "is there already an open appeal for
  // this rating" on GET /api/user/ratings, so this starts false and flips true
  // either on a successful submit or when the server itself reports one already
  // exists (409) — see appealMutation.onError below.
  const [appealSubmitted, setAppealSubmitted] = useState(false);
  const [appealError, setAppealError] = useState<string | null>(null);

  const myAddress = sphere?.identity?.directAddress ?? null;

  // Pre-fill the rater with my existing rating on this project (if any)
  useEffect(() => {
    if (!sphere || !getStoredJwt()) return;
    fetchMyRatings(sphere)
      .then((list) => {
        const mine = list.find((r) => String(r.projectId) === projectId);
        if (mine) {
          setRecommended(mine.recommended);
          setComment(mine.comment ?? '');
          setHidden(hiddenNoticeFor(mine));
          setMyRatingId(mine._id);
        }
      })
      .catch(() => { /* not signed in yet — ignore */ });
  }, [sphere, projectId]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!sphere) throw new Error('wallet-unavailable');
      if (recommended === null) throw new Error('thumb-required');
      return submitRating(sphere, projectId, recommended, comment.trim() || undefined);
    },
    onSuccess: (mine) => {
      setError(null);
      // An edit does not unhide a review — refresh the banner from what the
      // server actually returned instead of assuming success means "visible again".
      setHidden(hiddenNoticeFor(mine));
      setMyRatingId(mine._id);
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'ratings', slug] });
      queryClient.invalidateQueries({ queryKey: ['metrics', 'project', projectId] });
    },
    onError: (e: Error) => {
      if (e.message === 'not-eligible') setError('You must install or complete a quest in this project before rating it.');
      else if (e.message === 'thumb-required') setError('Choose Recommend or Not Recommend.');
      else setError('Failed to submit rating.');
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!sphere) throw new Error('wallet-unavailable');
      await deleteMyRating(sphere, projectId);
    },
    onSuccess: () => {
      setRecommended(null);
      setComment('');
      setError(null);
      setHidden(null);
      setMyRatingId(null);
      setAppealOpen(false);
      setAppealComment('');
      setAppealSubmitted(false);
      setAppealError(null);
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'ratings', slug] });
      queryClient.invalidateQueries({ queryKey: ['metrics', 'project', projectId] });
    },
    onError: (e: Error) => {
      // The server refuses to delete a review while it is hidden — deleting
      // would free the unique (wallet, project) slot and let the same text be
      // re-posted as a fresh, fully public row. Say so, rather than letting
      // Remove look like a no-op: the appeal control is right below.
      if (e.message.endsWith('403')) {
        setError('A hidden review cannot be removed while it is under moderation. Appeal the decision instead.');
      } else {
        setError('Failed to remove your review.');
      }
    },
  });

  const appealMutation = useMutation({
    mutationFn: async () => {
      if (!sphere || !myRatingId) throw new Error('wallet-unavailable');
      if (appealComment.trim().length === 0) throw new Error('empty-comment');
      await appealRating(sphere, myRatingId, appealComment.trim());
    },
    onSuccess: () => {
      setAppealSubmitted(true);
      setAppealOpen(false);
      setAppealComment('');
      setAppealError(null);
    },
    onError: (e: Error) => {
      if (e.message === 'rate-limited') setAppealError("You've submitted too many appeals recently. Try again later.");
      else if (e.message === 'appeal-open') {
        // The server disagrees with our session-local guess — trust it and
        // switch to "submitted" so the control stops offering a doomed retry.
        // Still surface *why*, and overwrite any earlier error (e.g. a stale
        // rate-limit message from a previous attempt) so the two can't coexist.
        setAppealSubmitted(true);
        setAppealOpen(false);
        setAppealError('An appeal is already open for this review.');
      }
      else if (e.message === 'invalid-appeal') setAppealError("This appeal couldn't be submitted.");
      else if (e.message === 'not-author') setAppealError('You can only appeal your own review.');
      else if (e.message === 'empty-comment') setAppealError('Explain why you think this was a mistake.');
      else setAppealError('Failed to submit appeal.');
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ ratingId, vote }: { ratingId: string; vote: HelpfulVote | null }) => {
      if (!sphere) throw new Error('wallet-unavailable');
      if (vote === null) await unvoteRating(sphere, ratingId);
      else               await voteRating(sphere, ratingId, vote);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'ratings', slug] });
    },
  });

  const toggleReplies = (ratingId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(ratingId)) next.delete(ratingId);
      else next.add(ratingId);
      return next;
    });
  };

  return (
    <section className="px-4 sm:px-6 pb-8">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-lg font-semibold mb-4">
          Reviews <span className="text-neutral-400 dark:text-white/35 font-normal">({ratingCount})</span>
        </h2>

        {/* Aggregate bar */}
        <div className="mb-5 no-text-shadow rounded-2xl border border-neutral-200 dark:border-white/8 p-4 bg-neutral-50 dark:bg-white/4 dark:backdrop-blur-2xl">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="text-sm font-semibold">{summaryLabel(positivePercent, ratingCount)}</span>
            {ratingCount > 0 && (
              <>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
                  <ThumbsUp className="w-3 h-3" /> {positiveCount}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-rose-400">
                  <ThumbsDown className="w-3 h-3" /> {negativeCount}
                </span>
              </>
            )}
          </div>
          {ratingCount > 0 && (
            <div className="h-2 rounded-full bg-neutral-200 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${positivePercent}%` }}
              />
            </div>
          )}
        </div>

        {/* Rater */}
        {canRate && sphere && (
          <div className="mb-6 no-text-shadow rounded-2xl border border-neutral-200 dark:border-white/8 bg-neutral-50 dark:bg-white/4 dark:backdrop-blur-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Your review</span>
              {recommended !== null && !submitMutation.isPending && (
                <button
                  type="button"
                  onClick={() => removeMutation.mutate()}
                  disabled={removeMutation.isPending}
                  className="text-xs text-neutral-400 dark:text-white/35 hover:text-red-500 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              )}
            </div>
            {hidden && (
              <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  A moderator hid this review from the marketplace.
                </p>
                {hidden.reason && (
                  <p className="text-xs text-neutral-500 dark:text-white/45 mt-0.5">
                    Reason: {hidden.reason}
                  </p>
                )}
                <p className="text-xs text-neutral-500 dark:text-white/45 mt-0.5">
                  Editing it will not restore it. Contact support if you think this was a mistake.
                </p>
                {canAppeal({ hiddenAt: hidden.at }, appealSubmitted) ? (
                  appealOpen ? (
                    <div className="mt-2 space-y-1.5">
                      <textarea
                        value={appealComment}
                        onChange={(e) => setAppealComment(e.target.value.slice(0, 1000))}
                        placeholder="Explain why you think this was a mistake…"
                        rows={2}
                        maxLength={1000}
                        className="w-full text-xs rounded-lg bg-white dark:bg-white/6 border border-amber-500/30 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => appealMutation.mutate()}
                          disabled={appealMutation.isPending || appealComment.trim().length === 0}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {appealMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                          Submit appeal
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAppealOpen(false); setAppealError(null); }}
                          disabled={appealMutation.isPending}
                          className="text-xs text-neutral-400 dark:text-white/35 hover:text-neutral-600 dark:hover:text-white/60"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAppealOpen(true)}
                      className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400 underline hover:no-underline"
                    >
                      Appeal this decision
                    </button>
                  )
                ) : appealSubmitted && (
                  <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">Appeal submitted</p>
                )}
                {appealError && <p className="mt-1 text-xs text-red-500">{appealError}</p>}
              </div>
            )}
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setRecommended(true)}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                  recommended === true
                    ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/40'
                    : 'bg-white dark:bg-white/6 text-neutral-600 dark:text-white/55 border-neutral-200 dark:border-white/8 hover:border-emerald-500/30'
                }`}
              >
                <ThumbsUp className="w-4 h-4" fill={recommended === true ? 'currentColor' : 'none'} />
                Recommend
              </button>
              <button
                type="button"
                onClick={() => setRecommended(false)}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                  recommended === false
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/40'
                    : 'bg-white dark:bg-white/6 text-neutral-600 dark:text-white/55 border-neutral-200 dark:border-white/8 hover:border-rose-500/30'
                }`}
              >
                <ThumbsDown className="w-4 h-4" fill={recommended === false ? 'currentColor' : 'none'} />
                Not Recommended
              </button>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 2000))}
              placeholder="Share your thoughts (optional)"
              rows={3}
              maxLength={2000}
              className="w-full text-sm rounded-xl bg-white dark:bg-white/6 border border-neutral-200 dark:border-white/8 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50"
            />
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            <button
              type="button"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || recommended === null}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Post review
            </button>
          </div>
        )}
        {!canRate && sphere && (
          <p className="text-xs text-neutral-400 dark:text-white/35 mb-6">
            Install this project or complete a quest in it to leave a review.
          </p>
        )}

        {/* Sort tabs */}
        {ratingCount > 0 && (
          <div className="flex items-center gap-1 mb-4">
            {(['helpful', 'recent'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setSort(opt)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  sort === opt
                    ? 'bg-orange-500 text-white'
                    : 'bg-neutral-100 dark:bg-white/6 text-neutral-500 dark:text-white/55 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {opt === 'helpful' ? 'Most helpful' : 'Most recent'}
              </button>
            ))}
          </div>
        )}

        {/* Reviews list */}
        {ratings && ratings.ratings.length > 0 ? (
          <ul className="space-y-3">
            {ratings.ratings.map((r) => {
              const isOwn = myAddress === r.userAddress;
              const label = r.userNametag ? `@${r.userNametag}` : truncateId(stripDirectScheme(r.userAddress));
              const expanded = expandedReplies.has(r._id);
              return (
                <li key={r._id} className="no-text-shadow rounded-xl border border-neutral-200 dark:border-white/8 p-4 bg-white dark:bg-white/4 dark:backdrop-blur-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <RecommendBadge recommended={r.recommended} />
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-neutral-400 dark:text-white/35">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                      {canReport(myAddress, r.userAddress) && (
                        reportedRatingIds.has(r._id) ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400 dark:text-white/35">
                            <Flag className="w-3 h-3" /> Reported
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setReportTarget({ id: r._id })}
                            title="Report this review"
                            className="inline-flex items-center gap-1 text-[11px] text-neutral-400 dark:text-white/35 hover:text-red-500"
                          >
                            <Flag className="w-3 h-3" /> Report
                          </button>
                        )
                      )}
                    </div>
                  </div>
                  {r.comment && (
                    <p className="text-sm text-neutral-600 dark:text-white/55 whitespace-pre-line break-words mb-3">
                      {r.comment}
                    </p>
                  )}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-neutral-400 dark:text-white/45">Helpful?</span>
                    <button
                      type="button"
                      disabled={isOwn || !sphere || voteMutation.isPending}
                      onClick={() => voteMutation.mutate({ ratingId: r._id, vote: 'helpful' })}
                      title={isOwn ? "You can't vote on your own review" : 'Mark as helpful'}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-neutral-100 dark:bg-white/6 hover:bg-emerald-500/15 hover:text-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ThumbsUp className="w-3 h-3" /> {r.helpfulCount}
                    </button>
                    <button
                      type="button"
                      disabled={isOwn || !sphere || voteMutation.isPending}
                      onClick={() => voteMutation.mutate({ ratingId: r._id, vote: 'not_helpful' })}
                      title={isOwn ? "You can't vote on your own review" : 'Mark as not helpful'}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-neutral-100 dark:bg-white/6 hover:bg-rose-500/15 hover:text-rose-400 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ThumbsDown className="w-3 h-3" /> {r.notHelpfulCount}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleReplies(r._id)}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-neutral-100 dark:bg-white/6 hover:bg-orange-500/15 hover:text-orange-500 ml-auto"
                    >
                      <MessageCircle className="w-3 h-3" /> {r.replyCount} {r.replyCount === 1 ? 'reply' : 'replies'}
                    </button>
                  </div>
                  {expanded && <ReviewReplies ratingId={r._id} />}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-neutral-400 dark:text-white/35">No reviews yet.</p>
        )}
      </div>

      <ReportModal
        isOpen={reportTarget !== null}
        onClose={() => setReportTarget(null)}
        onSubmit={async (category: ReportCategory, comment?: string) => {
          if (!sphere || !reportTarget) throw new Error('wallet-unavailable');
          const targetId = reportTarget.id;
          await submitReport(sphere, { targetType: 'rating', targetId, category, comment });
          setReportedRatingIds((prev) => new Set(prev).add(targetId));
        }}
      />
    </section>
  );
}
