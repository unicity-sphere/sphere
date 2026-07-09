import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '../wallet/ui';
import { PlansGrid } from '../subscription/PlansGrid';
import { CurrentPlanShowcase } from '../subscription/CurrentPlanShowcase';
import { UpgradeSuccess } from './UpgradeSuccess';
import { usePlans, useUtilization, useCheckout } from '../../sdk/hooks/subscription';
import { pollOrderStatus } from '../../sdk/subscription/pollOrder';
import { getOrderStatus, type PlanInfo } from '../../services/subscriptionApi';
import { syntheticCurrentPlan, formatPlanPrice } from '../subscription/planFeatures';
import { SUBSCRIPTION_MOCK, PAID_PLANS_ENABLED } from '../../config/subscription';
import { showToast } from '../ui/toast-utils';
import { useQueryClient } from '@tanstack/react-query';
import { SPHERE_KEYS } from '../../sdk/queryKeys';
import { useSphereContext } from '../../sdk/hooks';
import { getPublicKey } from '@unicitylabs/sphere-sdk';
import type { UpgradeReason } from './UpgradeContext';

type Step = 'plans' | 'email' | 'awaiting' | 'claim' | 'success' | 'error';

interface UpgradeModalProps {
  isOpen: boolean;
  reason?: UpgradeReason;
  onClose: () => void;
}

/**
 * Banner shown above the plans grid, keyed off why the upgrade modal was
 * opened. Extracted from UpgradeModal's render body so it can be unit-tested
 * without mounting the full modal (which pulls in usePlans/useUtilization/
 * useCheckout/useSphereContext). 'settings' and undefined render nothing.
 */
export function UpgradeReasonBanner({ reason }: { reason?: UpgradeReason }) {
  if (reason === 'quota') {
    return (
      <div className="mx-auto mb-6 flex max-w-xl items-start gap-2 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
        <span>You've hit your plan's limit. Upgrade for more, or wait for your quota to refill.</span>
      </div>
    );
  }

  if (reason === 'expired') {
    return (
      <div className="mx-auto mb-6 flex max-w-xl items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <span>Your plan has expired — renew to restore your limits.</span>
      </div>
    );
  }

  return null;
}

export function UpgradeModal({ isOpen, reason, onClose }: UpgradeModalProps) {
  const plans = usePlans(isOpen);
  const util = useUtilization();
  const checkout = useCheckout();
  const queryClient = useQueryClient();
  const { sphere, applySubscriptionKey } = useSphereContext();

  const [step, setStep] = useState<Step>('plans');
  const [error, setError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanInfo | null>(null);
  const [email, setEmail] = useState('');
  const [claimKey, setClaimKey] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [walletWide, setWalletWide] = useState(false);

  // Cancels the in-flight checkout poll when the modal closes (or a newer
  // checkout starts). Without this the poll outlives the modal and can
  // "ghost-adopt" a key onto whatever address is active minutes later.
  const checkoutAbortRef = useRef<AbortController | null>(null);
  useEffect(() => () => checkoutAbortRef.current?.abort(), []);

  // Buying while on the root address is wallet-wide by definition; on any
  // other address the email step offers a "make it wallet-wide" checkbox.
  const onRootAddress = useMemo(() => {
    if (!sphere) return true;
    try {
      return sphere.identity?.chainPubkey === getPublicKey(sphere.deriveAddress(0).privateKey);
    } catch {
      return true;
    }
  }, [sphere]);

  const currentPlanName = util.data?.plan?.name ?? null;

  // plans step: grid gets [synthetic current card, ...store plans]
  const freePlan = useMemo(() => (util.data ? syntheticCurrentPlan(util.data) : null), [util.data]);
  const gridPlans = useMemo(
    () => (freePlan ? [freePlan, ...(plans.data ?? [])] : (plans.data ?? [])),
    [plans.data, freePlan],
  );

  const handleSelect = (plan: PlanInfo) => {
    if (plan.name.toLowerCase() === (currentPlanName ?? '').toLowerCase()) return;
    // Paid plans aren't purchasable yet (testnet) — the card shows "Coming on
    // Mainnet" and no CTA; this guards any other entry path.
    if (!PAID_PLANS_ENABLED && plan.priceCents > 0) return;
    setSelectedPlan(plan);
    setStep('email');
  };

  const adoptKey = async (key: string) => {
    // persists (cache + scoped vault) and re-inits the oracle; on the root
    // address (or when the checkout checkbox asked for it) the key becomes
    // wallet-wide, otherwise it belongs to the active address only
    await applySubscriptionKey(key, { walletWide: onRootAddress || walletWide });
    await queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.subscription.all });
    setNewApiKey(key);
    setStep('success');
    showToast(`Upgraded to ${selectedPlan?.name ?? 'new plan'}`, 'success', 4000);
  };

  // Claim-step activation: adoptKey can reject (e.g. storage blocked while
  // persisting the key) — surface it on the error step instead of leaving the
  // user stuck. claimKey is kept so "I have a key" lets them retry.
  const activateClaimKey = async () => {
    setClaiming(true);
    setError(null);
    try {
      await adoptKey(claimKey);
    } catch (e) {
      setStep('error');
      setError(e instanceof Error ? e.message : 'Failed to activate the key');
    } finally {
      setClaiming(false);
    }
  };

  const startCheckout = async () => {
    if (!selectedPlan) return;
    setError(null);
    // Supersede any prior in-flight poll, then track this one so close/unmount
    // can abort it.
    checkoutAbortRef.current?.abort();
    const abort = new AbortController();
    checkoutAbortRef.current = abort;
    try {
      const { orderId, redirectUrl } = await checkout.mutateAsync({ planId: selectedPlan.planId, email });
      // Closed (or superseded) during order creation — don't pop a payment tab
      // or strand the modal on 'awaiting' after the user cancelled.
      if (abort.signal.aborted) return;
      setPaymentUrl(redirectUrl);
      window.open(redirectUrl, '_blank', 'noopener,noreferrer');
      setStep('awaiting');

      const result = SUBSCRIPTION_MOCK
        ? { outcome: 'paid' as const, apiKey: 'sk_mock_upgraded' } // demoable without a backend
        : await pollOrderStatus(() => getOrderStatus(orderId), { signal: abort.signal });

      // Modal closed (or a newer checkout took over) while polling — do NOT
      // adopt a key or touch step/error state on a torn-down flow.
      if (abort.signal.aborted) return;

      if (result.outcome === 'cancelled') return;

      if (result.outcome === 'paid' && result.apiKey) {
        await adoptKey(result.apiKey);
      } else if (result.outcome === 'paid') {
        setStep('claim'); // reveal consumed by the gateway return page — let the user paste it
      } else if (result.outcome === 'failed') {
        setStep('error');
        setError('The payment was not completed. No charge was made — you can try again.');
      } else {
        setStep('error');
        setError('Payment not detected yet. If you paid, open the payment return page — your API key is shown there once — then paste it via "I have a key".');
      }
    } catch (e) {
      if (abort.signal.aborted) return; // torn down mid-checkout — stay silent
      setStep('error');
      setError(e instanceof Error ? e.message : 'Checkout failed');
    }
  };

  const handleClose = () => {
    checkoutAbortRef.current?.abort(); // stop any in-flight checkout poll
    checkoutAbortRef.current = null;
    setStep('plans');
    setError(null);
    setPaymentUrl(null);
    setSelectedPlan(null);
    setEmail('');
    setClaimKey('');
    setClaiming(false);
    setNewApiKey(null);
    setWalletWide(false);
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-100 overflow-y-auto bg-white/95 backdrop-blur-sm dark:bg-neutral-950/92"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 sm:px-8">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-500" />
              <span className="text-lg font-semibold">{PAID_PLANS_ENABLED ? 'Choose your plan' : 'Your plan'}</span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="rounded-full p-2 text-neutral-400 transition-colors hover:bg-black/5 hover:text-neutral-700 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <motion.div
            className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-8"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === 'plans' && !PAID_PLANS_ENABLED && (
              <>
                <UpgradeReasonBanner reason={reason} />
                {util.isLoading ? (
                  <div className="py-20 text-center text-neutral-400">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <CurrentPlanShowcase util={util.data ?? null} />
                )}
              </>
            )}

            {step === 'plans' && PAID_PLANS_ENABLED && (
              <>
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-bold sm:text-3xl">Unlock more commitments</h2>
                  <p className="mt-1.5 text-sm text-neutral-500 dark:text-white/45">
                    Pick the plan that fits how much you transact.
                  </p>
                </div>

                <UpgradeReasonBanner reason={reason} />

                {plans.isLoading && (
                  <div className="py-20 text-center text-neutral-400">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </div>
                )}
                {plans.isError && (
                  <div className="py-20 text-center text-sm text-neutral-500 dark:text-white/45">
                    Couldn't load plans. Please try again later.
                  </div>
                )}
                {!plans.isLoading && !plans.isError && (
                  <PlansGrid plans={gridPlans} currentPlanName={currentPlanName} onSelect={handleSelect} />
                )}
              </>
            )}

            {step === 'email' && selectedPlan && (
              <div className="mx-auto flex max-w-md flex-col gap-4 py-16">
                <div className="text-center">
                  <h3 className="text-xl font-semibold capitalize">
                    {selectedPlan.name} — {formatPlanPrice(selectedPlan)} / 30 days
                  </h3>
                  <p className="mt-1.5 text-sm text-neutral-500 dark:text-white/45">
                    Paymento will send the payment link and receipt to this email.
                  </p>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-orange-500 dark:border-white/10 dark:bg-white/5"
                />
                {!onRootAddress && (
                  <label className="flex cursor-pointer items-start gap-2.5 text-sm text-neutral-600 dark:text-white/60">
                    <input
                      type="checkbox"
                      checked={walletWide}
                      onChange={(e) => setWalletWide(e.target.checked)}
                      className="mt-0.5 accent-orange-500"
                    />
                    <span>Make this the wallet-wide key (all addresses)</span>
                  </label>
                )}
                <Button
                  variant="primary"
                  fullWidth
                  disabled={!/\S+@\S+\.\S+/.test(email)}
                  loading={checkout.isPending}
                  onClick={startCheckout}
                >
                  Continue to payment
                </Button>
                <button
                  type="button"
                  className="text-sm text-neutral-500 underline dark:text-white/45"
                  onClick={() => setStep('plans')}
                >
                  ← Back to plans
                </button>
              </div>
            )}

            {step === 'awaiting' && (
              <div className="flex flex-col items-center gap-3 py-24 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <p className="text-sm">Complete the payment in the new tab — we'll pick up your new API key automatically.</p>
                {paymentUrl && (
                  <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-500 underline">
                    Payment page didn't open? Open it here
                  </a>
                )}
              </div>
            )}

            {step === 'claim' && (
              <div className="mx-auto flex max-w-md flex-col gap-4 py-16 text-center">
                <h3 className="text-xl font-semibold">Payment confirmed 🎉</h3>
                <p className="text-sm text-neutral-500 dark:text-white/45">
                  Your API key was shown on the payment return page. Paste it here to activate it in this wallet.
                </p>
                <input
                  value={claimKey}
                  onChange={(e) => setClaimKey(e.target.value.trim())}
                  placeholder="sk_…"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 font-mono text-sm outline-none focus:border-orange-500 dark:border-white/10 dark:bg-white/5"
                />
                <Button
                  variant="primary"
                  fullWidth
                  disabled={!/^sk_[0-9a-f]{32}$/.test(claimKey)}
                  loading={claiming}
                  onClick={activateClaimKey}
                >
                  Activate
                </Button>
              </div>
            )}

            {step === 'success' && <UpgradeSuccess plan={selectedPlan} apiKey={newApiKey} onDone={handleClose} />}

            {step === 'error' && (
              <div className="flex flex-col items-center gap-4 py-24 text-center">
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
                <p className="max-w-md text-sm">{error}</p>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setStep('plans')}>
                    Back to plans
                  </Button>
                  <Button variant="secondary" onClick={() => setStep('claim')}>
                    I have a key
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
