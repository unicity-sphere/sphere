import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Send, Trash2, CornerDownRight, X } from 'lucide-react';
import { useSphereContext } from '../../sdk/hooks/core/useSphere';
import { useRatingReplies } from '../../hooks/useMarketplace';
import { postReply, deleteReply, getStoredJwt } from '../../services/userApi';
import { stripDirectScheme } from '../../utils/identifiers';
import type { RatingReplyEntry } from '../../services/marketplaceApi';

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

  const authed = !!getStoredJwt() && !!sphere;
  const myAddress = sphere?.identity?.directAddress ?? null;

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
    },
  });

  return (
    <div className="mt-3 pl-4 border-l-2 border-orange-500/30">
      {isLoading ? (
        <div className="text-xs text-neutral-400 dark:text-white/35 py-2">Loading replies…</div>
      ) : (
        <ul className="space-y-2">
          {data?.replies.map((reply) => {
            const mine = myAddress && reply.userAddress === myAddress;
            const label = reply.userNametag ? `@${reply.userNametag}` : `${stripDirectScheme(reply.userAddress).slice(0, 12)}…`;
            return (
              <li key={reply._id} className="text-sm">
                {reply.quoted && (
                  <blockquote className="mb-1 pl-2 border-l-2 border-neutral-300 dark:border-white/15 text-xs text-neutral-500 dark:text-white/45">
                    <span className="font-medium">
                      {reply.quoted.userNametag ? `@${reply.quoted.userNametag}` : `${stripDirectScheme(reply.quoted.userAddress).slice(0, 12)}…`}
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
                  </div>
                </div>
              </li>
            );
          })}
          {data?.replies.length === 0 && (
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
                  {quoteTarget.userNametag ? `@${quoteTarget.userNametag}` : `${stripDirectScheme(quoteTarget.userAddress).slice(0, 12)}…`}
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
    </div>
  );
}
