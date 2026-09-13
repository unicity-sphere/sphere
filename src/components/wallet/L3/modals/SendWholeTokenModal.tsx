import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { useTransfer } from '../../../../sdk/hooks';
import { getErrorMessage, isKeepOpenPendingResult } from '../../../../sdk/errors';
import { QuotaBlockedError } from '../../../../sdk/quotaGate';

export interface WholeTokenTarget {
  tokenId: string;
  /** Row label — an NFT's class name, or a coin token's symbol. */
  label: string;
  /** True for a coinless row: routes to the verb that refuses a valued source. */
  coinless: boolean;
}

interface SendWholeTokenModalProps {
  target: WholeTokenTarget | null;
  onClose: () => void;
}

type Step = 'form' | 'sending' | 'success';

/**
 * Sends ONE named token, whole. There is no amount field on purpose: a whole
 * spend moves the token as it is and never splits it, so the only inputs are
 * who gets it and an optional memo. Splitting stays in SendModal, which is
 * amount-addressed.
 */
export function SendWholeTokenModal({ target, onClose }: SendWholeTokenModalProps) {
  const { transfer } = useTransfer();
  const [recipient, setRecipient] = useState('');
  const [memo, setMemo] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState<string | null>(null);
  const [deliveryPending, setDeliveryPending] = useState(false);
  const [keepOpen, setKeepOpen] = useState(false);
  // Bumped on every close. An in-flight send resolves against the generation it
  // started in, so a late completion can never write its outcome onto whatever
  // token the modal is showing by then — which would attribute one token's
  // success to another.
  const generation = useRef(0);
  const shownFor = useRef<string | null>(null);

  const reset = () => {
    setRecipient('');
    setMemo('');
    setStep('form');
    setError(null);
    setDeliveryPending(false);
    setKeepOpen(false);
  };

  // The modal is reused across tokens, so state belonging to the PREVIOUS token
  // must not survive into the next one — a success screen left standing would
  // report one token's send as the other's. Bumping the generation here also
  // retires any send still in flight from the token being replaced.
  useEffect(() => {
    const id = target?.tokenId ?? null;
    if (shownFor.current === id) return;
    shownFor.current = id;
    generation.current += 1;
    reset();
  }, [target?.tokenId]);

  const close = () => {
    // A send in flight is NOT cancellable — the spend may already be on-chain.
    // Closing mid-send would hide the only surface telling the user that.
    if (step === 'sending') return;
    generation.current += 1;
    reset();
    onClose();
  };

  const handleSend = async () => {
    if (!target || !recipient.trim()) return;
    setError(null);
    setStep('sending');
    const gen = generation.current;
    try {
      const result = await transfer({
        kind: 'whole',
        tokenId: target.tokenId,
        recipient: recipient.trim(),
        coinless: target.coinless,
        ...(memo ? { memo } : {}),
      });
      // Same three outcomes SendModal distinguishes: a keep-open result is NOT a
      // failure and must never invite a re-send — the intent stays open and the
      // SDK converges it under the same transferId.
      if (gen !== generation.current) return;
      setKeepOpen(isKeepOpenPendingResult(result));
      setDeliveryPending(result.deliveryPending ?? false);
      setStep('success');
    } catch (e: unknown) {
      if (gen !== generation.current) return;
      setError(e instanceof QuotaBlockedError ? 'Send quota reached.' : getErrorMessage(e));
      setStep('form');
    }
  };

  return (
    <AnimatePresence>
      {target && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={close}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md rounded-2xl bg-neutral-900 p-5 text-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Send token</h2>
              <button
                onClick={close}
                disabled={step === 'sending'}
                aria-label="Close"
                className="rounded p-1 hover:bg-white/10 disabled:opacity-30"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {step === 'success' ? (
              <div className="py-6 text-center">
                {keepOpen || deliveryPending ? (
                  <Clock className="mx-auto mb-3 h-10 w-10 text-amber-400" />
                ) : (
                  <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-400" />
                )}
                <p className="mb-1 font-medium">
                  {keepOpen
                    ? 'Network busy — the send is still going through'
                    : deliveryPending
                      ? 'Sent — delivery still pending'
                      : 'Sent'}
                </p>
                <p className="text-sm text-neutral-400">
                  {keepOpen
                    ? 'It will finish on its own. Do not send it again.'
                    : `${target.label} is on its way.`}
                </p>
                <button
                  onClick={close}
                  className="mt-5 w-full rounded-xl bg-white/10 py-3 font-medium hover:bg-white/20"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <p className="mb-4 truncate text-sm text-neutral-400">
                  Sending <span className="text-white">{target.label}</span> — the whole token.
                </p>

                <label className="mb-1 block text-sm text-neutral-400" htmlFor="swt-recipient">
                  Recipient
                </label>
                <input
                  id="swt-recipient"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="@nametag or address"
                  disabled={step === 'sending'}
                  className="mb-3 w-full rounded-xl bg-black/40 px-3 py-3 outline-none ring-1 ring-white/10 focus:ring-white/30"
                />

                <label className="mb-1 block text-sm text-neutral-400" htmlFor="swt-memo">
                  Memo (optional)
                </label>
                <input
                  id="swt-memo"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  disabled={step === 'sending'}
                  className="mb-3 w-full rounded-xl bg-black/40 px-3 py-3 outline-none ring-1 ring-white/10 focus:ring-white/30"
                />

                {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

                <button
                  onClick={handleSend}
                  disabled={step === 'sending' || !recipient.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 font-medium text-black disabled:opacity-40"
                >
                  {step === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {step === 'sending' ? 'Sending…' : 'Send'}
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
