import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Send, Trash2, CornerDownRight, X, Flag } from 'lucide-react';
import { useSphereContext } from '../../sdk/hooks/core/useSphere';
import { useRatingReplies } from '../../hooks/useMarketplace';
import {
  postReply, deleteReply, getStoredJwt, submitReport, appealReply, fetchMyReplies,
  type ReportCategory, type MyReply,
} from '../../services/userApi';
import { stripDirectScheme, truncateId } from '../../utils/identifiers';
import type { RatingReplyEntry } from '../../services/marketplaceApi';
import { ReportModal } from './ReportModal';
import { canReport, canAppeal } from './moderationAffordances';
import { mergeOwnHiddenReplies, type OwnHiddenTag } from './mergeOwnHiddenReplies';

interface ReviewRepliesProps {
  ratingId: string;
}

/**
 * Replies thread under a review, Telegram-group style:
 * - Flat list, ascending by createdAt
 * - Click "Reply" on any reply to quote it; the new reply shows a quote block
 * - Author can delete their own reply
 */
export function ReviewReplies({ ratingId }: ReviewRepliesProps) {
  const { sphere } = useSphereContext();
  const queryClient = useQueryClient();
  const { data, isLoading } = useRatingReplies(ratingId);
  const [draft, setDraft] = useState('');
  const [quoteTarget, setQuoteTarget] = useState<RatingReplyEntry | null>(null);
  const [reportedReplyIds, setReportedReplyIds] = useState<Set<string>>(new Set());
  const [reportTarget, setReportTarget] = useState<{ id: string } | null>(null);

  const authed = !!getStoredJwt() && !!sphere;
  const myAddress = sphere?.identity?.directAddress ?? null;

  // The public thread (above) filters out hidden replies entirely, so the
  // only way to learn one of my own was moderated is to ask for my own
  // replies separately and merge the hidden ones back in — same shadow-ban
  // fix Task 13 shipped for reviews, applied to replies.
  const { data: myReplies } = useQuery({
    queryKey: ['marketplace', 'my-replies', ratingId],
    queryFn: () => fetchMyReplies(sphere!, ratingId),
    enabled: authed && !!ratingId,
    staleTime: 15_000,
  });
  const merged = mergeOwnHiddenReplies(data?.replies ?? [], myReplies ?? []);

  // Appeal state is keyed by replyId — a thread can in principle hold more
  // than one hidden reply of mine, and each needs its own open/submitted/error
  // state rather than one shared slot (unlike ProjectReviewsSection, which
  // only ever has a single review to appeal per project).
  const [appealOpenId, setAppealOpenId] = useState<string | null>(null);
  const [appealComment, setAppealComment] = useState('');
  const [appealSubmittedIds, setAppealSubmittedIds] = useState<Set<string>>(new Set());
  const [appealErrors, setAppealErrors] = useState<Record<string, string>>({});

  const appealMutation = useMutation({
    mutationFn: async (replyId: string) => {
      if (!sphere) throw new Error('wallet-unavailable');
      if (appealComment.trim().length === 0) throw new Error('empty-comment');
      await appealReply(sphere, replyId, appealComment.trim());
    },
    onSuccess: (_data, replyId) => {
      setAppealSubmittedIds((prev) => new Set(prev).add(replyId));
      setAppealOpenId(null);
      setAppealComment('');
      setAppealErrors((prev) => { const next = { ...prev }; delete next[replyId]; return next; });
    },
    onError: (e: Error, replyId) => {
      if (e.message === 'rate-limited') {
        setAppealErrors((prev) => ({ ...prev, [replyId]: "You've submitted too many appeals recently. Try again later." }));
      } else if (e.message === 'appeal-open') {
        // The server disagrees with our session-local guess — trust it and
        // switch to "submitted" so the control stops offering a doomed retry.
        setAppealSubmittedIds((prev) => new Set(prev).add(replyId));
        setAppealOpenId(null);
        setAppealErrors((prev) => ({ ...prev, [replyId]: 'An appeal is already open for this reply.' }));
      } else if (e.message === 'invalid-appeal') {
        setAppealErrors((prev) => ({ ...prev, [replyId]: "This appeal couldn't be submitted." }));
      } else if (e.message === 'not-author') {
        setAppealErrors((prev) => ({ ...prev, [replyId]: 'You can only appeal your own reply.' }));
      } else if (e.message === 'empty-comment') {
        setAppealErrors((prev) => ({ ...prev, [replyId]: 'Explain why you think this was a mistake.' }));
      } else {
        setAppealErrors((prev) => ({ ...prev, [replyId]: 'Failed to submit appeal.' }));
      }
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!sphere) throw new Error('wallet-unavailable');
      if (draft.trim().length === 0) throw new Error('empty');
      return postReply(sphere, ratingId, draft.trim(), quoteTarget?._id);
    },
    onSuccess: () => {
      setDraft('');
      setQuoteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'replies', ratingId] });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'ratings'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (replyId: string) => {
      if (!sphere) throw new Error('wallet-unavailable');
      await deleteReply(sphere, ratingId, replyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'replies', ratingId] });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'ratings'] });
      // A hidden reply can still be deleted by its author — drop its banner too.
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'my-replies', ratingId] });
    },
  });

  // Discriminate on the tag mergeOwnHiddenReplies attaches, not on the
  // (absence of a) field the public shape happens to carry today — a
  // negative structural test would silently break the moment
  // RatingReplyEntry grows a field MyReply also has.
  const isOwnHidden = (entry: RatingReplyEntry | (MyReply & OwnHiddenTag)): entry is MyReply & OwnHiddenTag =>
    '__ownHidden' in entry;

  return (
    <div className="mt-3 pl-4 border-l-2 border-orange-500/30">
      {isLoading ? (
        <div className="text-xs text-neutral-400 dark:text-white/35 py-2">Loading replies…</div>
      ) : (
        <ul className="space-y-2">
          {merged.map((reply) => {
            if (isOwnHidden(reply)) {
              const isOpen = appealOpenId === reply._id;
              const submitted = appealSubmittedIds.has(reply._id);
              const error = appealErrors[reply._id];
              return (
                <li key={reply._id} className="text-sm">
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      A moderator hid this reply of yours.
                    </p>
                    {reply.hiddenReason && (
                      <p className="text-xs text-neutral-500 dark:text-white/45 mt-0.5">
                        Reason: {reply.hiddenReason}
                      </p>
                    )}
                    <p className="text-xs text-neutral-600 dark:text-white/55 mt-1 whitespace-pre-line break-words">
                      {reply.comment}
                    </p>
                    {canAppeal({ hiddenAt: reply.hiddenAt }, submitted) ? (
                      isOpen ? (
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
                              onClick={() => appealMutation.mutate(reply._id)}
                              disabled={appealMutation.isPending || appealComment.trim().length === 0}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {appealMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                              Submit appeal
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAppealOpenId(null);
                                setAppealComment('');
                                setAppealErrors((prev) => {
                                  const next = { ...prev };
                                  delete next[reply._id];
                                  return next;
                                });
                              }}
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
                          onClick={() => { setAppealOpenId(reply._id); setAppealComment(''); }}
                          className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400 underline hover:no-underline"
                        >
                          Appeal this decision
                        </button>
                      )
                    ) : submitted && (
                      <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">Appeal submitted</p>
                    )}
                    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
                  </div>
                </li>
              );
            }

            const mine = myAddress && reply.userAddress === myAddress;
            const label = reply.userNametag ? `@${reply.userNametag}` : truncateId(stripDirectScheme(reply.userAddress));
            return (
              <li key={reply._id} className="text-sm">
                {reply.quoted && (
                  <blockquote className="mb-1 pl-2 border-l-2 border-neutral-300 dark:border-white/15 text-xs text-neutral-500 dark:text-white/45">
                    <span className="font-medium">
                      {reply.quoted.userNametag ? `@${reply.quoted.userNametag}` : truncateId(stripDirectScheme(reply.quoted.userAddress))}
                    </span>
                    {': '}
                    <span className="line-clamp-2">{reply.quoted.comment}</span>
                  </blockquote>
                )}
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-neutral-900 dark:text-white">{label}</span>
                      <span className="text-[10px] text-neutral-400 dark:text-white/35">
                        {new Date(reply.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-neutral-700 dark:text-white/75 whitespace-pre-line break-words">{reply.comment}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {authed && (
                      <button
                        type="button"
                        onClick={() => setQuoteTarget(reply)}
                        title="Reply"
                        className="text-neutral-400 dark:text-white/35 hover:text-orange-500 p-1"
                      >
                        <CornerDownRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {mine && (
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(reply._id)}
                        disabled={deleteMutation.isPending}
                        title="Delete reply"
                        className="text-neutral-400 dark:text-white/35 hover:text-red-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canReport(myAddress, reply.userAddress) && (
                      reportedReplyIds.has(reply._id) ? (
                        // Filled + tinted so "reported" reads at a glance, not just on hover —
                        // an icon-only marker that's otherwise identical to the live button
                        // (same outline, same grey) gives no visible confirmation it landed.
                        <span title="Reported" className="text-emerald-500 p-1">
                          <Flag className="w-3.5 h-3.5" fill="currentColor" />
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setReportTarget({ id: reply._id })}
                          title="Report reply"
                          className="text-neutral-400 dark:text-white/35 hover:text-red-500 p-1"
                        >
                          <Flag className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              </li>
            );
          })}
          {merged.length === 0 && (
            <li className="text-xs text-neutral-400 dark:text-white/35">No replies yet.</li>
          )}
        </ul>
      )}

      {/* Composer */}
      {authed && (
        <div className="mt-3">
          {quoteTarget && (
            <div className="flex items-start gap-2 mb-2 rounded-md bg-neutral-100 dark:bg-white/5 px-2 py-1.5 text-xs">
              <div className="flex-1 min-w-0 text-neutral-600 dark:text-white/55">
                <span className="font-medium">
                  Replying to{' '}
                  {quoteTarget.userNametag ? `@${quoteTarget.userNametag}` : truncateId(stripDirectScheme(quoteTarget.userAddress))}
                </span>
                <div className="line-clamp-1">{quoteTarget.comment}</div>
              </div>
              <button
                type="button"
                onClick={() => setQuoteTarget(null)}
                className="text-neutral-400 hover:text-red-500 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
              placeholder={quoteTarget ? 'Your reply…' : 'Reply to this review…'}
              className="flex-1 text-sm rounded-lg bg-white dark:bg-white/6 border border-neutral-200 dark:border-white/8 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && draft.trim().length > 0) {
                  e.preventDefault();
                  submitMutation.mutate();
                }
              }}
            />
            <button
              type="button"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || draft.trim().length === 0}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-orange-500 text-white text-sm hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      <ReportModal
        isOpen={reportTarget !== null}
        onClose={() => setReportTarget(null)}
        onSubmit={async (category: ReportCategory, comment?: string) => {
          if (!sphere || !reportTarget) throw new Error('wallet-unavailable');
          const targetId = reportTarget.id;
          await submitReport(sphere, { targetType: 'rating_reply', targetId, category, comment });
          setReportedReplyIds((prev) => new Set(prev).add(targetId));
        }}
      />
    </div>
  );
}
