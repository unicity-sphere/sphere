import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '../wallet/ui';
import { PlansGrid } from '../subscription/PlansGrid';
import { CurrentPlanShowcase } from '../subscription/CurrentPlanShowcase';
import { UpgradeSuccess } from './UpgradeSuccess';
import { usePlans, useUtilization, useCheckout } from '../../sdk/hooks/subscription';
import { pollOrderStatus, type OrderPollResult } from '../../sdk/subscription/pollOrder';
import { resolveCheckoutOutcome } from '../../sdk/subscription/checkoutOutcome';
import { validatePastedKey } from '../../sdk/subscription/keyCheck';
import { loadWalletKey } from '../../sdk/subscription/keyVault';
import { rememberPlan } from '../../sdk/subscription/planMemory';
import { getOrderStatus, ackOrderKeyDelivery, type PlanInfo } from '../../services/subscriptionApi';
import {
  syntheticCurrentPlan,
  formatPlanPrice,
  isPlanSelectable,
  keepPlanLabel,
  continueWithPlanLabel,
  planGridList,
} from '../subscription/planFeatures';
import { EnterApiKeyRow } from '../subscription/EnterApiKeyRow';
import { getStoredSubscriptionKey } from '../../config/storageKeys';
import { SUBSCRIPTION_MOCK, PAID_PLANS_ENABLED } from '../../config/subscription';
import { showToast } from '../ui/toast-utils';
import { useQueryClient } from '@tanstack/react-query';
import { SPHERE_KEYS } from '../../sdk/queryKeys';
import { useSphereContext } from '../../sdk/hooks';
import { getPublicKey } from '@unicitylabs/sphere-sdk';
import type { UpgradeReason } from './UpgradeContext';

/** Local mirror of the gateway's mask ("sk_...abcd") for keys we hold in full. */
function maskKey(key: string): string {
  if (key.length < 12) return '...';
  return `${key.startsWith('sk_') ? 'sk_' : ''}...${key.slice(-4)}`;
}

type Step = 'plans' | 'email' | 'awaiting' | 'claim' | 'success' | 'error';

/**
 * Onboarding turns the plan screen into a STEP of wallet creation rather than
 * a dismissible dialog: no close X (there is nothing behind it yet), the
 * header names the plan just provisioned, and the way out is entering the
 * wallet on the current plan.
 */
export interface PlanScreenOnboarding {
  /** Plan NAME from finalize — header fallback until utilization resolves. */
  planName: string | null;
  /** Fresh wallet (true) vs restored one (false) — header copy only. */
  created: boolean;
  isBusy?: boolean;
  /** Enter the wallet keeping whatever plan is current. */
  onContinue: () => void;
}

interface PlanScreenProps {
  isOpen: boolean;
  reason?: UpgradeReason;
  /** Present = onboarding mode. See PlanScreenOnboarding. */
  onboarding?: PlanScreenOnboarding;
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

/**
 * The quiet "no thanks" that keeps the wallet's existing plan. Styled like
 * onboarding's Skip (a full-width borderless button under the primary CTA) so
 * the decline is as reachable as the purchase without competing with it.
 */
function KeepPlanButton({ planName, onClick }: { planName: string | null; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl px-5 py-2.5 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-white/45 dark:hover:bg-white/6 dark:hover:text-white"
    >
      {keepPlanLabel(planName)}
    </button>
  );
}

/**
 * Heading above the line-up. Onboarding confirms what was just provisioned;
 * the dialog sells the upgrade. With paid plans off the dialog has nothing to
 * pitch, so it keeps its bare header bar.
 */
function PlansHero({ onboarding, currentName }: { onboarding?: PlanScreenOnboarding; currentName: string | null }) {
  if (!onboarding) {
    if (!PAID_PLANS_ENABLED) return null;
    return (
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">Unlock more commitments</h2>
        <p className="mt-1.5 text-sm text-neutral-500 dark:text-white/45">
          Pick the plan that fits how much you transact.
        </p>
      </div>
    );
  }

  // No icon tile here: the shared header bar already carries the mark, and a
  // second one made onboarding look like a different screen.
  return (
    <div className="mb-8 text-center">
      <h2 className="text-2xl font-bold sm:text-3xl">
        {onboarding.created ? 'Your plan is ready' : 'Subscription restored'}
      </h2>
      <p className="mt-1.5 text-sm text-neutral-500 dark:text-white/45">
        {!currentName
          ? 'Your subscription is active.'
          : PAID_PLANS_ENABLED
            ? `You're on the ${currentName} plan — upgrade now, or any time from Settings.`
            : `You're all set on the ${currentName} plan.`}
      </p>
    </div>
  );
}

/**
 * Below the line-up: onboarding's way into the wallet (which is also its
 * decline — see continueWithPlanLabel) plus the paste-a-key affordance, or the
 * dialog's named decline. Nothing when the dialog has no offer to decline.
 */
function PlansFooter({
  onboarding,
  currentName,
  onDecline,
}: {
  onboarding?: PlanScreenOnboarding;
  currentName: string | null;
  onDecline: () => void;
}) {
  if (!onboarding) {
    if (!PAID_PLANS_ENABLED) return null;
    return (
      <div className="mx-auto mt-10 w-full max-w-xs">
        <KeepPlanButton planName={currentName} onClick={onDecline} />
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-xs">
      <Button variant="primary" fullWidth loading={onboarding.isBusy} onClick={onboarding.onContinue}>
        {continueWithPlanLabel(currentName, PAID_PLANS_ENABLED)}
      </Button>
      <EnterApiKeyRow
        tone="quiet"
        walletWide
        label="Already have a key? Paste it now"
        note="Applied to this wallet, so every address uses it. You can swap it later in Settings → Subscription."
        appliedNote="Key applied — your plan above reflects it."
      />
    </div>
  );
}

/**
 * THE plan surface. One component serves every entry point — onboarding's
 * post-creation step, Settings → Subscription's "Upgrade plan", the quota /
 * expiry prompts, and the free-plan offer on wallet entry — so the line-up,
 * the purchase steps and the decline are written once (sphere#496).
 */
export function PlanScreen({ isOpen, reason, onboarding, onClose }: PlanScreenProps) {
  const plans = usePlans(isOpen);
  const util = useUtilization();
  const checkout = useCheckout();
  const queryClient = useQueryClient();
  const { sphere, applySubscriptionKey, network } = useSphereContext();

  const [step, setStep] = useState<Step>('plans');
  const [error, setError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanInfo | null>(null);
  const [email, setEmail] = useState('');
  const [claimKey, setClaimKey] = useState('');
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [walletWide, setWalletWide] = useState(false);
  /** Key sent to checkout for an in-place upgrade (null = fresh-key purchase). */
  const [upgradeTargetKey, setUpgradeTargetKey] = useState<string | null>(null);
  /** Success came from an in-place upgrade — render the "same key" variant. */
  const [upgradedMaskedKey, setUpgradedMaskedKey] = useState<string | null>(null);
  /** Checkout failed while carrying an upgrade key — offer buying a new key instead. */
  const [upgradeRejected, setUpgradeRejected] = useState(false);

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
  // Onboarding can render before utilization resolves — fall back to the plan
  // name finalize just provisioned so the copy is never plan-less.
  const currentName = currentPlanName ?? onboarding?.planName ?? null;

  // plans step: grid gets [synthetic current card, ...store plans]
  const freePlan = useMemo(() => (util.data ? syntheticCurrentPlan(util.data) : null), [util.data]);
  const gridPlans = useMemo(() => planGridList(freePlan, plans.data ?? []), [plans.data, freePlan]);

  const subscriptionStatus = util.data?.status ?? null;
  // A lapsed plan's own store card becomes the renew path (same key, fresh 30 days).
  const renewableCurrent = subscriptionStatus !== null && subscriptionStatus !== 'active';

  const handleSelect = (plan: PlanInfo) => {
    if (!isPlanSelectable(plan, { currentPlanName, subscriptionStatus, paidPlansEnabled: PAID_PLANS_ENABLED })) return;
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

  // Claim-step activation: the pasted key is first sanity-checked against the
  // gateway (definitive unknown/revoked rejects inline; a failed lookup fails
  // open). adoptKey can still reject (e.g. storage blocked while persisting) —
  // surface that on the error step. claimKey is kept so "I have a key" lets
  // them retry.
  const activateClaimKey = async () => {
    setClaiming(true);
    setError(null);
    setClaimError(null);
    try {
      const verdict = await validatePastedKey(claimKey);
      if (!verdict.valid) {
        setClaimError(verdict.message ?? 'This key is not valid.');
        return;
      }
      await adoptKey(claimKey);
    } catch (e) {
      setStep('error');
      setError(e instanceof Error ? e.message : 'Failed to activate the key');
    } finally {
      setClaiming(false);
    }
  };

  /**
   * The key this purchase should upgrade in place: the wallet key when the
   * purchase is wallet-wide (root address or the checkbox), otherwise whatever
   * key the active address currently uses. Null (no key yet, or the user chose
   * "buy a new key instead") turns the checkout into a fresh-key purchase.
   */
  const resolveUpgradeKey = async (): Promise<string | null> => {
    try {
      if ((onRootAddress || walletWide) && sphere) {
        return (await loadWalletKey(sphere, network)) ?? getStoredSubscriptionKey();
      }
    } catch {
      // fall through to the boot cache
    }
    return getStoredSubscriptionKey();
  };

  const startCheckout = async (opts?: { forceNewKey?: boolean }) => {
    if (!selectedPlan) return;
    setError(null);
    setUpgradeRejected(false);
    // Supersede any prior in-flight poll, then track this one so close/unmount
    // can abort it.
    checkoutAbortRef.current?.abort();
    const abort = new AbortController();
    checkoutAbortRef.current = abort;
    // Always ask for an in-place upgrade of the existing key (same key, new
    // plan, fresh 30 days). Pre-upgrade gateways ignore the field and mint a
    // new key — the order's `upgrade` flag tells us which flow ran.
    const upgradeApiKey = opts?.forceNewKey ? null : await resolveUpgradeKey();
    setUpgradeTargetKey(upgradeApiKey);
    try {
      const { orderId, redirectUrl } = await checkout.mutateAsync({
        planId: selectedPlan.planId,
        email,
        upgradeApiKey: upgradeApiKey ?? undefined,
      });
      // Closed (or superseded) during order creation — don't pop a payment tab
      // or strand the modal on 'awaiting' after the user cancelled.
      if (abort.signal.aborted) return;
      setPaymentUrl(redirectUrl);
      window.open(redirectUrl, '_blank', 'noopener,noreferrer');
      setStep('awaiting');

      const result: OrderPollResult = SUBSCRIPTION_MOCK
        ? upgradeApiKey // demoable without a backend — mirror the live gateway's two shapes
          ? { outcome: 'paid', upgrade: true, maskedKey: maskKey(upgradeApiKey), planName: selectedPlan.name }
          : { outcome: 'paid', upgrade: false, apiKey: 'sk_mock_upgraded' }
        : await pollOrderStatus(() => getOrderStatus(orderId), { signal: abort.signal });

      // Modal closed (or a newer checkout took over) while polling — do NOT
      // adopt a key or touch step/error state on a torn-down flow.
      if (abort.signal.aborted) return;

      const action = resolveCheckoutOutcome(result);
      switch (action.kind) {
        case 'cancelled':
          return;
        case 'upgraded': {
          // Same key, new plan — nothing to adopt or re-init; just refresh the
          // subscription read models and remember the plan for the
          // downgrade watcher.
          await queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.subscription.all });
          const planName = action.planName ?? selectedPlan.name;
          if (upgradeApiKey) rememberPlan(upgradeApiKey, planName);
          setUpgradedMaskedKey(action.maskedKey ?? (upgradeApiKey ? maskKey(upgradeApiKey) : null));
          setStep('success');
          showToast(`Upgraded to ${planName}`, 'success', 4000);
          return;
        }
        case 'adopt':
          await adoptKey(action.apiKey);
          // Stop the gateway's key delivery only AFTER the key is persisted;
          // fire-and-forget — an unsent ack just leaves the key deliverable.
          void ackOrderKeyDelivery(orderId);
          return;
        case 'claim':
          setStep('claim');
          return;
        case 'failed':
          setStep('error');
          setError('The payment was not completed. No charge was made — you can try again.');
          return;
        case 'timeout':
          setStep('error');
          setError(
            'Payment not detected yet. It may still be confirming — keep the payment tab open and reopen this dialog in a minute.',
          );
          return;
      }
    } catch (e) {
      if (abort.signal.aborted) return; // torn down mid-checkout — stay silent
      setStep('error');
      setError(e instanceof Error ? e.message : 'Checkout failed');
      // The gateway validates the upgrade key up front (unknown/revoked → 400):
      // give the user a way to buy a fresh key instead of the upgrade.
      setUpgradeRejected(!!upgradeApiKey);
    }
  };

  const resetPurchase = () => {
    checkoutAbortRef.current?.abort(); // stop any in-flight checkout poll
    checkoutAbortRef.current = null;
    setStep('plans');
    setError(null);
    setPaymentUrl(null);
    setSelectedPlan(null);
    setEmail('');
    setClaimKey('');
    setClaimError(null);
    setClaiming(false);
    setNewApiKey(null);
    setWalletWide(false);
    setUpgradeTargetKey(null);
    setUpgradedMaskedKey(null);
    setUpgradeRejected(false);
  };

  const handleClose = () => {
    resetPurchase();
    onClose();
  };

  /**
   * "No thanks". In a dialog that means closing it; during onboarding there is
   * nothing to close — declining is entering the wallet on the current plan.
   */
  const decline = onboarding ? onboarding.onContinue : handleClose;

  /** Post-purchase exit: into the wallet during onboarding, else close. */
  const finishSuccess = onboarding ? onboarding.onContinue : handleClose;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          // Onboarding renders this inside the wallet-creation panel, so it
          // sits just below the app-root dialog layer rather than on it.
          className={`fixed inset-0 overflow-y-auto backdrop-blur-sm ${
            onboarding
              ? 'z-90 bg-white/97 dark:bg-neutral-950/95'
              : 'z-100 bg-white/95 dark:bg-neutral-950/92'
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/*
            Same chrome in both modes — the screen must not read as two
            different designs. Only the corner button's MEANING changes: a
            dialog closes, onboarding has nothing behind it, so it does what
            its footer does and goes into the wallet (the free plan is already
            active, so nothing is lost either way). It is labelled for what it
            does rather than "Close".
          */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 sm:px-8">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-500" />
              <span className="text-lg font-semibold">{PAID_PLANS_ENABLED ? 'Choose your plan' : 'Your plan'}</span>
            </div>
            <button
              type="button"
              onClick={onboarding ? onboarding.onContinue : handleClose}
              aria-label={onboarding ? 'Enter wallet' : 'Close'}
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
                <PlansHero onboarding={onboarding} currentName={currentName} />
                <UpgradeReasonBanner reason={reason} />
                {util.isLoading ? (
                  <div className="py-20 text-center text-neutral-400">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <CurrentPlanShowcase util={util.data ?? null} />
                )}
                <PlansFooter onboarding={onboarding} currentName={currentName} onDecline={decline} />
              </>
            )}

            {step === 'plans' && PAID_PLANS_ENABLED && (
              <>
                <PlansHero onboarding={onboarding} currentName={currentName} />

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
                  <PlansGrid
                    plans={gridPlans}
                    currentPlanName={currentName}
                    renewableCurrent={renewableCurrent}
                    onSelect={handleSelect}
                  />
                )}

                <PlansFooter onboarding={onboarding} currentName={currentName} onDecline={decline} />
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
                {subscriptionStatus === 'active' && util.data?.activeUntil && (
                  <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-neutral-600 dark:text-white/60">
                    Your current plan is replaced as soon as the payment confirms — remaining time doesn't
                    carry over. The new plan runs 30 days from payment.
                  </p>
                )}
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
                  onClick={() => void startCheckout()}
                >
                  Continue to payment
                </Button>
                {/*
                  Declining has to be a named action, not just the corner X —
                  onboarding drops the user straight onto this step, so "no
                  thanks" must say what they keep (sphere#496).
                */}
                <KeepPlanButton planName={currentName} onClick={decline} />
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
                <p className="text-sm">
                  {upgradeTargetKey
                    ? `Complete the payment in the new tab — your key ${maskKey(upgradeTargetKey)} moves to the new plan automatically.`
                    : "Complete the payment in the new tab — we'll pick up your new API key automatically."}
                </p>
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
                  onChange={(e) => {
                    setClaimKey(e.target.value.trim());
                    setClaimError(null);
                  }}
                  placeholder="sk_…"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 font-mono text-sm outline-none focus:border-orange-500 dark:border-white/10 dark:bg-white/5"
                />
                {claimError && <p className="text-sm text-red-500">{claimError}</p>}
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

            {step === 'success' && (
              <UpgradeSuccess plan={selectedPlan} apiKey={newApiKey} upgradedMaskedKey={upgradedMaskedKey} onDone={finishSuccess} />
            )}

            {step === 'error' && (
              <div className="flex flex-col items-center gap-4 py-24 text-center">
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
                <p className="max-w-md text-sm">{error}</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button variant="secondary" onClick={() => setStep('plans')}>
                    Back to plans
                  </Button>
                  {upgradeRejected && (
                    <Button variant="secondary" onClick={() => void startCheckout({ forceNewKey: true })}>
                      Buy a new key instead
                    </Button>
                  )}
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
