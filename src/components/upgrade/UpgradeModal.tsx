import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Check, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '../wallet/ui';
import { PlansGrid } from '../subscription/PlansGrid';
import { usePlans, useSubscription, useCheckout } from '../../sdk/hooks/subscription';
import { pollForPlan } from '../../sdk/subscription/pollForPlan';
import { getKeyInfo, type PlanInfo } from '../../services/subscriptionApi';
import { getStoredSubscriptionKey } from '../../config/storageKeys';
import { SUBSCRIPTION_MOCK } from '../../config/subscription';
import { showToast } from '../ui/toast-utils';
import { useQueryClient } from '@tanstack/react-query';
import { SPHERE_KEYS } from '../../sdk/queryKeys';

type Step = 'plans' | 'awaiting' | 'success' | 'error';

interface UpgradeModalProps {
  isOpen: boolean;
  reason?: string;
  onClose: () => void;
}

export function UpgradeModal({ isOpen, reason, onClose }: UpgradeModalProps) {
  const plans = usePlans(isOpen);
  const sub = useSubscription();
  const checkout = useCheckout();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('plans');
  const [error, setError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<number | null>(null);
  // key-info's plan node uses `id` (plans use `planId` for the same value) — API.md
  const currentPlanId = sub.data?.pricingPlan?.id ?? -1;

  const handleSelect = async (plan: PlanInfo) => {
    if (plan.planId === currentPlanId) return;
    setError(null);
    setSelectingId(plan.planId);
    try {
      const { paymentUrl: url } = await checkout.mutateAsync({ targetPlanId: plan.planId });
      setPaymentUrl(url);
      window.open(url, '_blank', 'noopener,noreferrer');
      setStep('awaiting');

      const apiKey = getStoredSubscriptionKey();
      const activated = SUBSCRIPTION_MOCK
        ? true // mock: no real external payment — show success so the flow is demoable
        : apiKey
          ? await pollForPlan(() => getKeyInfo(apiKey), plan.planId)
          : false;

      if (activated) {
        await queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.subscription.all });
        setStep('success');
        showToast(`Upgraded to ${plan.name}`, 'success', 4000);
      } else {
        setStep('error');
        setError('Payment not detected yet. If you paid, it may take a few minutes — check again later.');
      }
    } catch (e) {
      setStep('error');
      setError(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setSelectingId(null);
    }
  };

  const handleClose = () => {
    setStep('plans');
    setError(null);
    setPaymentUrl(null);
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
              <span className="text-lg font-semibold">Choose your plan</span>
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

          <div className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-8">
            {step === 'plans' && (
              <>
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-bold sm:text-3xl">Unlock more commitments</h2>
                  <p className="mt-1.5 text-sm text-neutral-500 dark:text-white/45">
                    Pick the plan that fits how much you transact.
                  </p>
                </div>

                {reason === 'quota' && (
                  <div className="mx-auto mb-6 flex max-w-xl items-start gap-2 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                    <span>You've hit your plan's limit. Upgrade for more, or wait for your quota to refill.</span>
                  </div>
                )}

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
                {plans.data && (
                  <PlansGrid
                    plans={plans.data}
                    currentPlanId={currentPlanId}
                    onSelect={handleSelect}
                    loadingPlanId={selectingId}
                    disabled={checkout.isPending}
                  />
                )}
              </>
            )}

            {step === 'awaiting' && (
              <div className="flex flex-col items-center gap-3 py-24 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <p className="text-sm">Complete the payment in the new tab — we'll activate your plan automatically.</p>
                {paymentUrl && (
                  <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-500 underline">
                    Payment page didn't open? Open it here
                  </a>
                )}
              </div>
            )}

            {step === 'success' && (
              <div className="flex flex-col items-center gap-4 py-24 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15">
                  <Check className="h-8 w-8 text-emerald-500" />
                </div>
                <p className="text-lg font-semibold">Plan upgraded</p>
                <Button variant="primary" onClick={handleClose}>
                  Done
                </Button>
              </div>
            )}

            {step === 'error' && (
              <div className="flex flex-col items-center gap-4 py-24 text-center">
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
                <p className="max-w-md text-sm">{error}</p>
                <Button variant="secondary" onClick={() => setStep('plans')}>
                  Back to plans
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
