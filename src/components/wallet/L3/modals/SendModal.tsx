import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { getPayments } from '../../../../sdk/payments';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2, User, CheckCircle, Coins, Hash, Copy, Check, Clock, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import type { Asset, TransferResult } from '@unicitylabs/sphere-sdk';
import type { PendingTransfer } from '@unicitylabs/sphere-sdk/payments-v2';
import { parseTokenAmount, safeParseTokenAmount } from '@unicitylabs/sphere-sdk';
import { findDuplicatePending, DUPLICATE_CHECK_TIMEOUT_MS } from '../../../connect/duplicateSendGuard';
import { INTENT_SETTLE_MS } from '../../../connect/settleWindow';
import { useAssets, useTokens, useTransfer, formatAmount } from '../../../../sdk';
import { useSendProgress } from '../../../../sdk/hooks/payments/useSendProgress';
import { getErrorMessage, isKeepOpenPendingResult } from '../../../../sdk/errors';
import { useSphereContext } from '../../../../sdk/hooks/core/useSphere';
import { isChainPubkey, truncateId, stripDirectScheme } from '../../../../utils/identifiers';
import { useUtilization } from '../../../../sdk/hooks/subscription';
import { QuotaBlockedError, SEND_OPS_HEADROOM } from '../../../../sdk/quotaGate';
import { isSubscriptionKeyReady } from '../../../../sdk/subscription/keyStatus';
import { SUBSCRIPTION_ENABLED } from '../../../../config/subscription';
import { useUpgrade } from '../../../upgrade';
import { WalletScreen } from '../../ui/WalletScreen';
import { ModalHeader, Button, AlertMessage } from '../../ui';
import { copyToClipboard } from '../../../../utils/copyToClipboard';

type Step = 'asset' | 'details' | 'confirm' | 'duplicate' | 'processing' | 'success';

interface SendModalProps {
  isOpen: boolean;
  onClose: (result?: { success: boolean }) => void;
}

/**
 * The chain pubkey this send will actually be locked to, derived from what the
 * modal already resolved — never a second resolution path. `null` means there
 * is nothing to compare (a pasted DIRECT:// address, or a Unicity ID the peer
 * lookup could not answer), and the duplicate check then fails open.
 */
function sendTargetPubkey(
  mode: 'nametag' | 'pubkey',
  recipient: string,
  resolvedPubkey: string | null,
): string | null {
  if (mode === 'pubkey') {
    const value = recipient.trim();
    return isChainPubkey(value) ? value : null;
  }
  return resolvedPubkey;
}

export function SendModal({ isOpen, onClose }: SendModalProps) {
  const { assets: sdkAssets } = useAssets();
  const { transfer, isLoading: isTransferring } = useTransfer();
  const { tokens: inventoryTokens } = useTokens();
  const { sphere, subscriptionKeyStatus } = useSphereContext();
  const { openUpgrade } = useUpgrade();
  const utilization = useUtilization();

  // Subscriptions on but the per-wallet key isn't on the oracle yet — a send
  // now would go out keyless (→ 401). Disable Send until it's ready.
  const subsNotReady = SUBSCRIPTION_ENABLED && !isSubscriptionKeyReady(subscriptionKeyStatus);

  const assets = sdkAssets;

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const handleCopy = useCallback(async (text: string, key: string) => {
    if (await copyToClipboard(text)) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  }, []);

  // State
  const [step, setStep] = useState<Step>('asset');
  const [recipientMode, setRecipientMode] = useState<'nametag' | 'pubkey'>('nametag');
  const [recipient, setRecipient] = useState('');
  const [isCheckingRecipient, setIsCheckingRecipient] = useState(false);
  const [recipientError, setRecipientError] = useState<string | null>(null);
  // Set instead of recipientError when handleSend's transfer rejects with
  // QuotaBlockedError (Task 2) — renders a dedicated warning + Upgrade CTA
  // in the confirm step rather than the generic error paragraph.
  const [quotaBlocked, setQuotaBlocked] = useState<'expired' | 'exhausted' | null>(null);

  // Resolved recipient chain pubkey (nametag mode) — shown on the confirm step.
  const [resolvedPubkey, setResolvedPubkey] = useState<string | null>(null);

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [amountInput, setAmountInput] = useState('');

  // Live progress for a multi-token send (sphere-sdk#749 reports each certified
  // leg). Priced from our own inventory — the SDK does not carry amounts.
  const sendTotal =
    selectedAsset && amountInput
      ? (safeParseTokenAmount(amountInput, selectedAsset.decimals) ?? 0n)
      : 0n;
  const progress = useSendProgress(step === 'processing', sendTotal, inventoryTokens);
  /**
   * Set at the commit point, so the confirm→processing exit keeps the warm.
   * Deliberately NOT `sendAttemptRef`: that one guards re-entrancy and merely
   * happens to span this moment, so a change to its lifetime would silently
   * un-warm every send.
   */
  const sendStartedRef = useRef(false);

  // sphere-sdk#753: a send OPENS by reading every source blob it will spend —
  // 3.4 s of a 43.8 s 54-token send on staging, all of it after the button. The
  // confirm screen sitting in front of it is idle on the wire, so warm there and
  // the read lands on think-time instead. Reserves nothing, so a send the user
  // abandons cannot pin their balance; the cleanup discards on back, close, or
  // unmount, and the SDK drops a warm still in flight when that happens.
  useEffect(() => {
    if (step !== 'confirm' || !selectedAsset) return;
    sendStartedRef.current = false;
    const payments = getPayments(sphere);
    if (!payments) return;
    const amount = safeParseTokenAmount(amountInput, selectedAsset.decimals);
    if (amount === null || amount <= 0n) return;
    void payments.prewarmSend({ coinId: selectedAsset.coinId, amount: amount.toString(), recipient });
    // Leaving confirm because the SEND started is the one exit that must NOT
    // discard: send() has not read the warm yet — useTransfer awaits the quota
    // check first — so discarding here throws away exactly what it was for.
    return () => {
      if (!sendStartedRef.current) payments.discardPrewarm();
    };
  }, [step, selectedAsset, amountInput, recipient, sphere]);
  const [memoInput, setMemoInput] = useState('');
  // sphere-sdk 0.10.6 (#621/#622): the send certified on-chain but the recipient's delivery is
  // deferred (full inbox / 429, or a transient outage). The spend is FINAL — surface "delivery
  // pending", never a failure.
  const [deliveryPending, setDeliveryPending] = useState(false);
  // Keep-open outcome (PENDING_COMMIT_CODES → useTransfer's synthetic pending
  // result): the spend may already be on-chain and sphere-sdk 0.14 converges
  // the SAME transfer in-session (auto-retry, backoff 5s→120s). transferId is
  // the #441-stamped id ('' when the error carried none); legs is the
  // certified/total detail read best-effort from payments.pendingTransfers().
  const [keepOpen, setKeepOpen] = useState<{
    transferId: string;
    legs: { certified: number; total: number } | null;
  } | null>(null);
  const [isResuming, setIsResuming] = useState(false);

  // THE INVARIANT (stated once in connect/duplicateSendGuard.ts): the wallet
  // does not start a send that duplicates a payment already converging, and no
  // control that can authorize one is live the instant it appears.
  //
  // The wallet's OWN send is the same hole the Connect path closed: a keep-open
  // outcome ("Network is busy") leaves the SDK converging that transfer, but the
  // reservation ledger only stops the SAME token being spent twice — a fresh
  // attempt simply plans a NEW transferId against the remaining balance and the
  // recipient is paid twice. A user who closes the busy screen and sends again,
  // or double-taps Confirm, does exactly that.
  //
  // `findDuplicatePending` is the single matcher for both surfaces (imported,
  // never re-implemented) and `INTENT_SETTLE_MS` the single settle window.
  const [duplicateMatch, setDuplicateMatch] = useState<PendingTransfer | null>(null);
  const [duplicateApproved, setDuplicateApproved] = useState(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const sendAttemptRef = useRef(false);

  /**
   * The converging transfer this attempt would duplicate, or null.
   *
   * FAILS OPEN on every unhappy path — no payments facade, an unresolvable
   * recipient, a throwing or slow `pendingTransfers()` (bounded by
   * DUPLICATE_CHECK_TIMEOUT_MS, the Connect guard's own budget). A safety net
   * over a rare outcome must never become a gate that blocks a legitimate send.
   */
  const findConvergingDuplicate = useCallback(
    async (
      recipientPubkey: string | null,
      coinId: string,
      amount: string,
    ): Promise<PendingTransfer | null> => {
      if (!recipientPubkey) return null;
      const payments = getPayments(sphere);
      if (!payments) return null;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const rows = await Promise.race([
          payments.pendingTransfers(),
          new Promise<null>((resolve) => {
            timer = setTimeout(() => resolve(null), DUPLICATE_CHECK_TIMEOUT_MS);
          }),
        ]);
        if (rows === null || rows.length === 0) return null;
        return findDuplicatePending(rows, { recipientPubkey, coinId, amount });
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
      }
    },
    [sphere],
  );

  // The §8.4 settle window, local equivalent of the ConnectProvider shield
  // (there is no provider here) and measured with the SAME constant.
  //
  // It is armed by a callback ref on every control that can authorize a spend,
  // so the window starts when the control MOUNTS — not when the step state
  // flips. Those differ: AnimatePresence mode="wait" holds the next step back
  // until the previous one has finished exiting, and a window started at the
  // state change would already be half spent behind an animation. Every arm is
  // a real presentation: entering confirm, the duplicate warning, and the
  // warning→proceed transition that puts a fresh Send button under a cursor
  // that just clicked "Send anyway".
  //
  // Ref callbacks and the LAYOUT effect below both run in the commit phase, so
  // the disabled state is in the control's FIRST paint — a useEffect runs after
  // paint, and that frame is real and clickable.
  const [actionsLive, setActionsLive] = useState(false);
  const [shieldArm, setShieldArm] = useState(0);
  const armSettleShield = useCallback((node: HTMLButtonElement | null) => {
    if (node !== null) setShieldArm((n) => n + 1);
  }, []);
  useLayoutEffect(() => {
    setActionsLive(false);
    if (shieldArm === 0) return;
    const timer = setTimeout(() => setActionsLive(true), INTENT_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [shieldArm]);

  // Clear the keep-open copy when the SDK's convergence lands: transfer:updated
  // for the SAME transferId with a done status flips the screen to plain
  // success. Without a stamped id there is nothing safe to match — the honest
  // pending copy stays (never clear on an unrelated transfer's event).
  useEffect(() => {
    if (!sphere || !keepOpen || !keepOpen.transferId) return;
    const handleTransferUpdated = (result: TransferResult) => {
      if (result.id !== keepOpen.transferId) return;
      if (result.status === 'confirmed' || result.status === 'delivered' || result.status === 'completed') {
        setKeepOpen(null);
        setDeliveryPending(false);
      }
    };
    sphere.on('transfer:updated', handleTransferUpdated);
    return () => {
      sphere.off('transfer:updated', handleTransferUpdated);
    };
  }, [sphere, keepOpen]);

  // MONEY-SAFETY: the retry affordance calls payments.resumeNow() — the SDK
  // converges the SAME transferId. It must NEVER call send()/transfer() again
  // (a fresh send consumes a different source and double-pays the recipient).
  const handleResumeNow = async () => {
    const payments = getPayments(sphere);
    if (!payments || isResuming) return;
    setIsResuming(true);
    try {
      await payments.resumeNow();
    } catch {
      // Best-effort nudge — the SDK's in-session auto-retry keeps converging.
    } finally {
      setIsResuming(false);
    }
  };

  const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (recipientMode === 'nametag') {
      const value = e.target.value.toLowerCase();
      if (/^@?[a-z0-9_\-+.]*$/.test(value)) {
        setRecipient(value);
        setRecipientError(null);
      }
    } else {
      setRecipient(e.target.value);
      setRecipientError(null);
    }
  };

  const reset = () => {
    setStep('asset');
    setRecipientMode('nametag');
    setRecipient('');
    setResolvedPubkey(null);
    setSelectedAsset(null);
    setAmountInput('');
    setMemoInput('');
    setRecipientError(null);
    setQuotaBlocked(null);
    setDeliveryPending(false);
    setKeepOpen(null);
    setDuplicateMatch(null);
    setDuplicateApproved(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const getBackHandler = () => {
    if (step === 'details') return () => setStep('asset');
    if (step === 'confirm') return () => setStep('details');
    // Backing out of the duplicate warning lands on the edit step — a safe
    // place, and never one that can send.
    if (step === 'duplicate') return () => { setDuplicateMatch(null); setStep('details'); };
    return handleClose;
  };

  const getTitle = () => {
    switch (step) {
      case 'asset': return 'Select Asset';
      case 'details': return 'Send';
      case 'confirm': return 'Confirm Transfer';
      case 'duplicate': return 'Payment already in progress';
      case 'processing': return 'Processing...';
      case 'success': return 'Sent!';
    }
  };

  // STEP 2: Validate recipient + amount, then go to confirm
  const handleDetailsNext = async () => {
    if (!selectedAsset || !recipient.trim() || !amountInput) return;

    const targetAmount = safeParseTokenAmount(amountInput, selectedAsset.decimals);
    if (targetAmount === null || targetAmount <= 0n) return;
    if (targetAmount > BigInt(selectedAsset.totalAmount)) return;

    setIsCheckingRecipient(true);
    setRecipientError(null);
    // Re-entering confirm via details is a fresh attempt — a quota block from
    // a previous send must not survive it (same lifecycle as recipientError).
    setQuotaBlocked(null);
    // ...and neither may an override the user granted for an earlier
    // recipient/amount: this attempt is checked on its own merits.
    setDuplicateMatch(null);
    setDuplicateApproved(false);

    try {
      let finalRecipient: string;
      let resolved: string | null = null;

      if (recipientMode === 'pubkey') {
        const value = recipient.trim();
        // Pasted DIRECT:// addresses stay accepted for compatibility — the SDK resolves them.
        if (!isChainPubkey(value) && !value.startsWith('DIRECT://')) {
          setRecipientError('Enter a valid public key (66 hex characters starting with 02 or 03)');
          return;
        }
        finalRecipient = value;
      } else {
        const cleanTag = recipient.replace('@', '').replace('@unicity', '').trim();
        finalRecipient = cleanTag;

        if (sphere?.resolve) {
          const peerInfo = await sphere.resolve(`@${cleanTag}`);
          if (!peerInfo) {
            setRecipientError(`User @${cleanTag} not found`);
            return;
          }
          resolved = peerInfo.chainPubkey || null;
        }
      }

      setRecipient(finalRecipient);
      setResolvedPubkey(resolved);

      // Learn about a converging duplicate HERE, before the confirm screen —
      // the same resolution that feeds the confirm summary feeds the check, so
      // the two can never disagree about who is being paid. handleSend checks
      // again: this screen can sit open while another send goes keep-open.
      const match = await findConvergingDuplicate(
        sendTargetPubkey(recipientMode, finalRecipient, resolved),
        selectedAsset.coinId,
        targetAmount.toString(),
      );
      if (match) {
        setDuplicateMatch(match);
        setStep('duplicate');
      } else {
        setStep('confirm');
      }
    } catch (err) {
      setRecipientError(getErrorMessage(err));
    } finally {
      setIsCheckingRecipient(false);
    }
  };

  // STEP 3: Execute transfer via SDK
  const handleSend = async () => {
    if (!selectedAsset || !amountInput || !recipient) return;
    // Re-entrancy floor UNDER the disabled button: `isTransferring` and
    // `isCheckingDuplicate` are React state, so they only stop a second click
    // once a re-render has flushed. The ref flips synchronously — two clicks
    // dispatched in one task (a queued double-tap, a programmatic re-dispatch)
    // can never open two attempts. Cleared in `finally`, so no path can leave
    // the button permanently dead.
    if (isTransferring || isCheckingDuplicate || sendAttemptRef.current) return;
    sendAttemptRef.current = true;

    setRecipientError(null);
    setQuotaBlocked(null);
    setKeepOpen(null);

    try {
      const amount = parseTokenAmount(amountInput, selectedAsset.decimals).toString();

      // Last gate before money moves. Only an explicit "Send anyway" gets past
      // a match — the user may genuinely want to pay the same person twice.
      if (!duplicateApproved) {
        setIsCheckingDuplicate(true);
        let match: PendingTransfer | null;
        try {
          match = await findConvergingDuplicate(
            sendTargetPubkey(recipientMode, recipient, resolvedPubkey),
            selectedAsset.coinId,
            amount,
          );
        } finally {
          setIsCheckingDuplicate(false);
        }
        if (match) {
          setDuplicateMatch(match);
          setStep('duplicate');
          return;
        }
      }

      sendStartedRef.current = true;
      setStep('processing');
      const result = await transfer({
        coinId: selectedAsset.coinId,
        amount,
        recipient,
        ...(memoInput ? { memo: memoInput } : {}),
      });

      if (isKeepOpenPendingResult(result)) {
        // Keep-open outcome: honest "network busy" copy instead of the generic
        // pending state. Enrich with the certified-legs detail when the SDK's
        // pending-transfers view has partial info for this transfer (best-effort;
        // the copy renders without it).
        setKeepOpen({ transferId: result.id, legs: null });
        if (result.id) {
          getPayments(sphere)
            ?.pendingTransfers()
            .then((rows) => {
              const row = rows.find((r) => r.transferId === result.id);
              if (row) {
                setKeepOpen((prev) =>
                  prev && prev.transferId === result.id ? { ...prev, legs: row.legs } : prev,
                );
              }
            })
            .catch(() => { /* detail only — the keep-open copy stands alone */ });
        }
      }
      setDeliveryPending(result.deliveryPending ?? false);
      setStep('success');
    } catch (e: unknown) {
      if (e instanceof QuotaBlockedError) {
        setQuotaBlocked(e.reason);
      } else {
        setRecipientError(getErrorMessage(e));
      }
      setStep('confirm');
    } finally {
      sendAttemptRef.current = false;
    }
  };

  const handleSuccessClose = () => {
    reset();
    onClose({ success: true });
  };

  return (
    <WalletScreen isOpen={isOpen} onClose={handleClose}>
      <ModalHeader variant="screen" title={getTitle()} onClose={getBackHandler()} />

      <div className="px-6 py-8 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* 1. ASSET SELECTION */}
          {step === 'asset' && (
            <motion.div key="asset" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {assets.map(asset => (
                <button
                  key={asset.coinId}
                  onClick={() => { setSelectedAsset(asset); setStep('details'); }}
                  className="w-full p-3 flex items-center gap-3 bg-neutral-50 dark:bg-white/4 hover:bg-neutral-100 dark:hover:bg-white/8 border border-neutral-200 dark:border-white/5 rounded-xl transition-colors text-left"
                >
                  <img src={asset.iconUrl || ''} className="w-8 h-8 rounded-full" alt="" />
                  <div className="flex-1">
                    <div className="text-neutral-900 dark:text-white font-medium">{asset.symbol}</div>
                    <div className="text-xs text-neutral-500 dark:text-white/45">{formatAmount(asset.totalAmount, asset.decimals)} available</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-neutral-400 dark:text-neutral-600" />
                </button>
              ))}
            </motion.div>
          )}

          {/* 2. DETAILS (recipient + amount) */}
          {step === 'details' && selectedAsset && (() => {
            const insufficientBalance = (safeParseTokenAmount(amountInput, selectedAsset.decimals) ?? 0n) > BigInt(selectedAsset.totalAmount);
            const usdValue = selectedAsset.priceUsd != null && amountInput
              ? (parseFloat(amountInput) * selectedAsset.priceUsd).toFixed(2)
              : null;
            return (
              <motion.div key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Asset header */}
                <div className="flex flex-col items-center mb-8">
                  <img src={selectedAsset.iconUrl || ''} className="w-14 h-14 rounded-full mb-2" alt="" />
                  <span className="text-neutral-900 dark:text-white font-semibold font-mono">{selectedAsset.name || selectedAsset.symbol}</span>
                </div>

                {/* Recipient */}
                <div className="mb-10">
                  <div className="relative">
                    {recipientMode === 'nametag' && (
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-white/35 font-medium">@</span>
                    )}
                    <input
                      autoFocus
                      value={recipient}
                      onChange={handleRecipientChange}
                      onKeyDown={(e) => e.key === 'Enter' && handleDetailsNext()}
                      className={`w-full bg-neutral-100 dark:bg-white/6 border border-neutral-200 dark:border-white/10 rounded-2xl py-4 pr-4 text-neutral-900 dark:text-white focus:border-orange-500 outline-none transition-colors ${recipientMode === 'nametag' ? 'pl-8' : 'pl-4 font-mono'}`}
                      placeholder={recipientMode === 'nametag' ? "Recipient's Unicity ID" : 'Public key (02...)'}
                    />
                  </div>
                  <button
                    onClick={() => { setRecipientMode(recipientMode === 'nametag' ? 'pubkey' : 'nametag'); setRecipient(''); setRecipientError(null); }}
                    className="text-[11px] text-neutral-400 dark:text-neutral-500 hover:text-orange-500 dark:hover:text-orange-400 mt-1.5 ml-1 transition-colors"
                  >
                    {recipientMode === 'nametag' ? 'Use public key instead' : 'Use Unicity ID instead'}
                  </button>
                </div>

                {/* Amount */}
                <div className="mb-3">
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amountInput}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '' || /^\d*\.?\d*$/.test(v)) setAmountInput(v);
                      }}
                      className={`w-full bg-neutral-100 dark:bg-white/6 border rounded-2xl py-4 pl-4 pr-28 text-neutral-900 dark:text-white outline-none transition-colors ${insufficientBalance ? 'border-red-500 focus:border-red-500' : 'border-neutral-200 dark:border-white/10 focus:border-orange-500'}`}
                      placeholder="Amount"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-neutral-500 dark:text-white/45">{selectedAsset.symbol}</span>
                      <button
                        onClick={() => setAmountInput(formatAmount(selectedAsset.totalAmount, selectedAsset.decimals))}
                        className="text-xs bg-neutral-200 dark:bg-white/10 text-orange-500 dark:text-orange-400 px-2.5 py-1.5 rounded-full hover:bg-neutral-300 dark:hover:bg-white/15 transition-colors font-semibold"
                      >
                        Max
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between mt-1.5 text-xs px-1">
                    <span className="text-neutral-400 dark:text-white/35">
                      {usdValue ? `~$${usdValue}` : '~$0.00'}
                    </span>
                    {insufficientBalance
                      ? <span className="text-red-500">Insufficient balance</span>
                      : <span className="text-neutral-400 dark:text-white/35">Available {formatAmount(selectedAsset.totalAmount, selectedAsset.decimals)} {selectedAsset.symbol}</span>
                    }
                  </div>
                </div>

                {/* Memo */}
                <div className="mb-8">
                  <input
                    type="text"
                    value={memoInput}
                    onChange={(e) => setMemoInput(e.target.value)}
                    className="w-full bg-neutral-100 dark:bg-white/6 border border-neutral-200 dark:border-white/10 rounded-2xl py-4 px-4 text-neutral-900 dark:text-white outline-none focus:border-orange-500 transition-colors text-sm"
                    placeholder="Memo (optional)"
                  />
                </div>

                {recipientError && <p className="text-red-500 text-sm mb-4">{recipientError}</p>}

                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 py-4 bg-neutral-100 dark:bg-white/6 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-700 dark:text-white/65 font-semibold font-mono rounded-full transition-colors"
                  >
                    Cancel
                  </button>
                  <Button
                    onClick={handleDetailsNext}
                    disabled={!recipient.trim() || !amountInput || insufficientBalance || isCheckingRecipient}
                    loading={isCheckingRecipient}
                    loadingText="Checking..."
                    icon={ArrowRight}
                    iconPosition="right"
                    className="flex-1 rounded-full!"
                  >
                    Review
                  </Button>
                </div>
              </motion.div>
            );
          })()}

          {/* 3. CONFIRM */}
          {step === 'confirm' && selectedAsset && (
            <motion.div key="conf" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* Summary Card */}
              <div className="bg-orange-50/50 dark:bg-orange-500/6 rounded-2xl p-5 mb-6 border border-orange-100 dark:border-orange-500/10 text-center">
                <div className="text-sm text-neutral-500 dark:text-white/45 mb-1">You are sending</div>
                <div className="text-3xl font-bold text-neutral-900 dark:text-white">
                  {amountInput} <span className="text-orange-500">{selectedAsset.symbol}</span>
                </div>
                {selectedAsset.priceUsd != null && (
                  <div className="text-xs text-neutral-400 dark:text-neutral-500 mb-3">
                    ≈ ${(parseFloat(amountInput) * selectedAsset.priceUsd).toFixed(2)} USD
                  </div>
                )}
                {selectedAsset.priceUsd == null && <div className="mb-4" />}

                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-2 text-sm bg-neutral-200 dark:bg-white/4 p-2 rounded-lg">
                      {recipientMode === 'pubkey' ? (
                        <Hash className="w-4 h-4 text-neutral-500 dark:text-white/45" />
                      ) : (
                        <User className="w-4 h-4 text-neutral-500 dark:text-white/45" />
                      )}
                      <span className={`text-neutral-700 dark:text-white/65 ${recipientMode === 'pubkey' ? 'font-mono text-xs break-all' : ''}`} title={recipient}>
                        {recipientMode === 'pubkey' ? truncateId(stripDirectScheme(recipient)) : `@${recipient}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(
                        recipientMode === 'pubkey' ? recipient : `@${recipient}`,
                        'recipient'
                      )}
                      className="p-1.5 hover:bg-neutral-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                      title="Copy"
                    >
                      {copiedKey === 'recipient'
                        ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                        : <Copy className="w-3.5 h-3.5 text-neutral-400" />
                      }
                    </button>
                  </div>
                  {recipientMode === 'nametag' && resolvedPubkey && (
                    <div className="flex items-center gap-1">
                      <span
                        className="text-[10px] font-mono text-neutral-400/40 dark:text-neutral-600/50 truncate max-w-52"
                        title={resolvedPubkey}
                      >
                        {truncateId(resolvedPubkey)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(resolvedPubkey, 'address')}
                        className="p-0.5 hover:bg-neutral-200 dark:hover:bg-white/10 rounded transition-colors"
                        title="Copy address"
                      >
                        {copiedKey === 'address'
                          ? <Check className="w-3 h-3 text-emerald-500" />
                          : <Copy className="w-3 h-3 text-neutral-500/40" />
                        }
                      </button>
                    </div>
                  )}
                </div>
                {memoInput && (
                  <div className="text-sm text-neutral-300 dark:text-white/45 mt-3 italic">
                    &ldquo;{memoInput}&rdquo;
                  </div>
                )}
              </div>

              {/* Strategy Info */}
              <div className="mb-6 space-y-2">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3">
                  <Coins className="w-5 h-5 text-emerald-500 dark:text-emerald-400 mt-0.5" />
                  <div>
                    <div className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">Smart Transfer</div>
                    <div className="text-xs text-neutral-500 dark:text-white/45 mt-1">
                      Token splitting and transfer optimization is handled automatically.
                    </div>
                  </div>
                </div>

                {/* Passive low-quota heads-up (spec §2 'warn' verdict) — informational only, never blocks the send */}
                {SUBSCRIPTION_ENABLED && typeof utilization.data?.utilization.availablePerMinute === 'number' && utilization.data.utilization.availablePerMinute < SEND_OPS_HEADROOM && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-500 dark:text-amber-400 mt-0.5" />
                    <div className="text-xs text-neutral-500 dark:text-white/45">
                      Only {utilization.data.utilization.availablePerMinute} commitments left this minute — large sends may be throttled.
                    </div>
                  </div>
                )}
              </div>

              {quotaBlocked && (
                <div className="mb-4">
                  <AlertMessage variant="warning">
                    {quotaBlocked === 'expired'
                      ? "Your plan has expired — renew to keep sending."
                      : "Your plan's limit is used up — upgrade or wait for the quota to refill."}
                  </AlertMessage>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Sparkles}
                    fullWidth
                    className="mt-2"
                    onClick={() => openUpgrade(quotaBlocked === 'expired' ? 'expired' : 'quota')}
                  >
                    Upgrade
                  </Button>
                </div>
              )}

              {recipientError && !quotaBlocked && <p className="text-red-500 text-sm mb-4 text-center">{recipientError}</p>}

              {subsNotReady && !quotaBlocked && (
                <p className="text-neutral-500 dark:text-white/45 text-xs mb-4 text-center">
                  {subscriptionKeyStatus === 'failed'
                    ? "Couldn't set up your subscription. Reload the app to retry."
                    : 'Setting up your subscription — one moment…'}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 py-4 bg-neutral-100 dark:bg-white/6 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-700 dark:text-white/65 font-semibold font-mono rounded-full transition-colors"
                >
                  Cancel
                </button>
                <button
                  ref={armSettleShield}
                  onClick={handleSend}
                  disabled={isTransferring || subsNotReady || isCheckingDuplicate || !actionsLive}
                  className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 dark:bg-brand-orange dark:hover:bg-brand-orange-dark text-white font-bold font-mono rounded-full transition-colors disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </motion.div>
          )}

          {/* 3b. DUPLICATE WARNING — a payment matching this one is still
              converging. Same wording and same button shape as the Connect
              duplicate modal (ConnectIntentHandler), so both surfaces teach the
              user the same thing: the destructive action is the SECONDARY
              button, and the safe one sits where the primary always is. */}
          {step === 'duplicate' && duplicateMatch && selectedAsset && (
            <motion.div key="dup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-5 mb-5 border border-amber-300 dark:border-amber-500/30">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-neutral-700 dark:text-neutral-200">
                    A payment of{' '}
                    <span className="font-semibold text-neutral-900 dark:text-white break-all">
                      {amountInput} {selectedAsset.symbol}
                    </span>{' '}
                    to{' '}
                    <span className="font-semibold text-neutral-900 dark:text-white break-all" title={recipient}>
                      {recipientMode === 'pubkey' ? truncateId(stripDirectScheme(recipient)) : `@${recipient}`}
                    </span>{' '}
                    is still completing (transfer {truncateId(duplicateMatch.transferId)}).
                  </div>
                </div>

                <div className="mt-3 text-sm font-semibold text-amber-700 dark:text-amber-400">
                  Sending again pays TWICE.
                </div>

                <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                  The payment already in flight finishes on its own — the wallet keeps working on it.
                  {duplicateMatch.legs.total > 0 && (
                    <> {duplicateMatch.legs.certified} of {duplicateMatch.legs.total} parts are already certified.</>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  ref={armSettleShield}
                  onClick={() => { setDuplicateApproved(true); setDuplicateMatch(null); setStep('confirm'); }}
                  disabled={!actionsLive}
                  className="flex-1 py-4 bg-neutral-100 dark:bg-white/6 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-700 dark:text-white/65 font-semibold font-mono rounded-full transition-colors disabled:opacity-50"
                >
                  Send anyway
                </button>
                <button
                  onClick={() => { setDuplicateMatch(null); setStep('details'); }}
                  className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 dark:bg-brand-orange dark:hover:bg-brand-orange-dark text-white font-bold font-mono rounded-full transition-colors"
                >
                  Don&apos;t send
                </button>
              </div>
            </motion.div>
          )}

          {/* 4. PROCESSING — a multi-token send certifies one token at a time, so
              show what has actually settled instead of an opaque spinner. The bar
              tracks CERTIFICATION; the mailbox deposit that follows is a single
              batched call, so it is labelled as its own phase rather than faked. */}
          {step === 'processing' && (
            <motion.div key="proc" className="flex-1 flex flex-col items-center justify-center text-center py-10 px-6">
              <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
              <h3 className="text-neutral-900 dark:text-white font-medium text-lg">
                {progress.fraction !== null && progress.fraction >= 1
                  ? 'Delivering to recipient...'
                  : 'Sending Transaction...'}
              </h3>

              {progress.certifiedTokens > 0 && selectedAsset ? (
                <div className="w-full max-w-xs mt-4">
                  <div
                    className="h-2 w-full rounded-full bg-neutral-200 dark:bg-white/10 overflow-hidden"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round((progress.fraction ?? 0) * 100)}
                    aria-label="Transfer progress"
                  >
                    <motion.div
                      className="h-full bg-orange-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${String(Math.round((progress.fraction ?? 0) * 100))}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-2 text-neutral-500 dark:text-white/45">
                    <span>
                      {formatAmount(progress.certifiedAmount.toString(), selectedAsset.decimals)} of{' '}
                      {formatAmount(sendTotal.toString(), selectedAsset.decimals)} {selectedAsset.symbol}
                    </span>
                    <span>{progress.certifiedTokens} token{progress.certifiedTokens === 1 ? '' : 's'}</span>
                  </div>
                  {sendTotal > progress.certifiedAmount && (
                    <div className="text-xs mt-1 text-neutral-400 dark:text-white/35">
                      {formatAmount((sendTotal - progress.certifiedAmount).toString(), selectedAsset.decimals)}{' '}
                      {selectedAsset.symbol} remaining
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-neutral-500 text-sm mt-2">
                  Certifying on Unicity and delivering to the recipient&apos;s mailbox
                </p>
              )}
            </motion.div>
          )}

          {/* 5. SUCCESS (delivered), DELIVERY PENDING (spend final on-chain), or KEEP-OPEN
              (network busy — the SDK converges the SAME transfer in-session; resumeNow()
              only nudges it, NEVER a re-send). */}
          {step === 'success' && (
            <motion.div key="done" className="flex-1 flex flex-col items-center justify-center text-center py-10">
              {keepOpen ? (
                <>
                  <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/50">
                    <Clock className="w-8 h-8 text-amber-500" />
                  </div>
                  <h3 className="text-neutral-900 dark:text-white font-bold text-2xl mb-2">Network is busy</h3>
                  <p className="text-neutral-500 dark:text-white/45">
                    Your transfer of <b>{amountInput} {selectedAsset?.symbol}</b> to <b title={recipient}>{recipientMode === 'pubkey' ? truncateId(stripDirectScheme(recipient)) : `@${recipient}`}</b> is safe and will complete automatically.
                  </p>
                  {keepOpen.legs && keepOpen.legs.total > 0 && (
                    <p className="text-neutral-400 dark:text-white/35 text-sm mt-2">
                      {keepOpen.legs.certified} of {keepOpen.legs.total} {keepOpen.legs.total === 1 ? 'part' : 'parts'} already certified on-chain.
                    </p>
                  )}
                  <p className="text-neutral-400 dark:text-white/35 text-xs mt-2">
                    Don&apos;t send it again — this same transfer keeps retrying on its own.
                  </p>
                  <button
                    onClick={handleResumeNow}
                    disabled={isResuming}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-full transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isResuming ? 'animate-spin' : ''}`} />
                    {isResuming ? 'Retrying…' : 'Retry now'}
                  </button>
                </>
              ) : deliveryPending ? (
                <>
                  <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/50">
                    <Clock className="w-8 h-8 text-amber-500" />
                  </div>
                  <h3 className="text-neutral-900 dark:text-white font-bold text-2xl mb-2">Sent — delivery pending</h3>
                  <p className="text-neutral-500 dark:text-white/45">
                    Your <b>{amountInput} {selectedAsset?.symbol}</b> to <b title={recipient}>{recipientMode === 'pubkey' ? truncateId(stripDirectScheme(recipient)) : `@${recipient}`}</b> is finalized on-chain. They'll receive it once their inbox is reachable — nothing more to do.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/50">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-neutral-900 dark:text-white font-bold text-2xl mb-2">Success!</h3>
                  <p className="text-neutral-500 dark:text-white/45">
                    Successfully sent <b>{amountInput} {selectedAsset?.symbol}</b> to <b title={recipient}>{recipientMode === 'pubkey' ? truncateId(stripDirectScheme(recipient)) : `@${recipient}`}</b>
                  </p>
                </>
              )}
              <button onClick={handleSuccessClose} className="mt-8 px-8 py-2 bg-neutral-100 dark:bg-white/6 rounded-lg hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-900 dark:text-white transition-colors">
                Close
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </WalletScreen>
  );
}
