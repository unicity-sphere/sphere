import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flag, Loader2 } from 'lucide-react';
import type { ReportCategory } from '../../services/userApi';

interface ReportModalProps {
  isOpen:  boolean;
  onClose: () => void;
  /** Submits the report for whichever target the caller opened the modal for. */
  onSubmit: (category: ReportCategory, comment?: string) => Promise<void>;
}

const CATEGORIES: { value: ReportCategory; label: string }[] = [
  { value: 'spam',      label: 'Spam' },
  { value: 'abuse',     label: 'Abuse or harassment' },
  { value: 'off_topic', label: 'Off-topic' },
  { value: 'illegal',   label: 'Illegal content' },
  { value: 'other',     label: 'Other' },
];

/** Maps the domain-specific Error.message codes thrown by submitReport (see userApi.ts) to user-facing copy. */
function reportErrorMessage(err: unknown): string {
  const code = err instanceof Error ? err.message : '';
  if (code === 'rate-limited') return "You've reported too many times recently. Try again later.";
  if (code === 'own-content')  return "You can't report your own content.";
  if (code === 'not-found')    return 'This content no longer exists.';
  return 'Failed to submit report. Please try again.';
}

/**
 * Report-content modal: pick a category, optionally explain, submit.
 * Owns its own submitting/error state so both ProjectReviewsSection (reviews)
 * and ReviewReplies (replies) can reuse it without duplicating error handling.
 */
export function ReportModal({ isOpen, onClose, onSubmit }: ReportModalProps) {
  const [category, setCategory] = useState<ReportCategory>('spam');
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setCategory('spam');
    setComment('');
    setError(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(category, comment.trim() || undefined);
      reset();
      onClose();
    } catch (err) {
      setError(reportErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-100000"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-modal-bg rounded-2xl shadow-2xl z-100000 overflow-hidden border border-neutral-200 dark:border-white/10"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <Flag className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Report content
                </h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/8 text-neutral-500 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-white/65 mb-2">
                  Why are you reporting this?
                </label>
                <div className="space-y-1.5">
                  {CATEGORIES.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCategory(opt.value)}
                      disabled={isSubmitting}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium border transition-all disabled:opacity-50 ${
                        category === opt.value
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-600 dark:text-red-400'
                          : 'bg-neutral-50 dark:bg-white/6 border-neutral-200 dark:border-white/8 text-neutral-600 dark:text-white/55 hover:border-neutral-300 dark:hover:border-white/20'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-white/65 mb-1">
                  Details (optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 1000))}
                  placeholder="Anything that would help a moderator review this…"
                  disabled={isSubmitting}
                  rows={3}
                  maxLength={1000}
                  className="w-full px-3 py-2 bg-neutral-100 dark:bg-white/6 text-neutral-900 dark:text-white placeholder-neutral-400 rounded-xl border border-neutral-200 dark:border-white/8 focus:outline-none focus:border-red-500 transition-colors resize-none disabled:opacity-50 text-sm"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-linear-to-r from-red-500 to-red-600 text-white font-medium shadow-lg shadow-red-500/30 hover:shadow-red-500/40 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit report'
                )}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
