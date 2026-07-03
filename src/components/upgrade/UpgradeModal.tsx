import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Check, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { WalletScreen } from '../wallet/ui/WalletScreen';
import { ModalHeader, Button } from '../wallet/ui';
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
  // key-info's plan node uses `id` (plans use `planId` for the same value) — API.md
  const currentPlanId = sub.data?.pricingPlan?.id ?? -1;

  const handleSelect = async (plan: PlanInfo) => {
    if (plan.planId === currentPlanId) return;
    setError(null);
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
    }
  };

  const handleClose = () => {
    setStep('plans');
    setError(null);
    setPaymentUrl(null);
    onClose();
  };

  return (
    // asModal: this modal is mounted globally (UpgradeProvider sits at the app
    // root, outside any `relative`-positioned wallet-panel shell), so the default
    // slide-in panel (`position: absolute`, z-10) would have no containing block
    // to confine it to and would stack below the sticky Header (z-50). BaseModal
    // (fixed, z-100, with backdrop) is the same pattern ConnectionApprovalModal
    // uses for its own app-root-level modal.
    <WalletScreen isOpen={isOpen} onClose={handleClose} asModal>
      <ModalHeader variant="screen" title="Upgrade plan" icon={Sparkles} iconVariant="gradient" onClose={handleClose} />

      <div className="px-5 py-6 space-y-3 flex-1 overflow-y-auto">
        {reason === 'quota' && step === 'plans' && (
          <div className="flex items-start gap-2 p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-sm">
            <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
            <span>You've reached your plan's limit. Upgrade for more, or wait for your quota to refill.</span>
          </div>
        )}

        {step === 'plans' && plans.data?.map((plan) => {
          const isCurrent = plan.planId === currentPlanId;
          return (
            <motion.button
              key={plan.planId}
              whileHover={isCurrent ? {} : { scale: 1.01 }}
              whileTap={isCurrent ? {} : { scale: 0.99 }}
              disabled={isCurrent || checkout.isPending}
              onClick={() => handleSelect(plan)}
              className={`w-full p-5 flex items-center gap-4 rounded-2xl border text-left transition-colors ${
                isCurrent
                  ? 'bg-emerald-500/10 border-emerald-500/20 cursor-default'
                  : 'bg-neutral-50 dark:bg-white/4 border-neutral-200 dark:border-white/8 hover:bg-neutral-100 dark:hover:bg-white/8'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold font-mono capitalize">{plan.name}</div>
                <div className="text-xs text-neutral-500 dark:text-white/45 mt-0.5">
                  {plan.requestsPerDay.toLocaleString()} tx/day · {plan.requestsPerSecond}/s
                </div>
              </div>
              {isCurrent ? (
                <span className="flex items-center gap-1 text-xs text-emerald-500"><Check className="w-4 h-4" /> Current</span>
              ) : (
                <ArrowRight className="w-4 h-4 text-neutral-400 dark:text-neutral-600 shrink-0" />
              )}
            </motion.button>
          );
        })}

        {step === 'awaiting' && (
          <div className="flex flex-col items-center text-center gap-3 py-10">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <p className="text-sm">Complete the payment in the new tab. We'll activate your plan automatically.</p>
            {paymentUrl && (
              <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="text-orange-500 underline text-sm">
                Payment page didn't open? Open it here
              </a>
            )}
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center text-center gap-3 py-10">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
              <Check className="w-7 h-7 text-emerald-500" />
            </div>
            <p className="font-semibold">Plan upgraded</p>
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col items-center text-center gap-3 py-10">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
            <p className="text-sm">{error}</p>
            <Button variant="secondary" onClick={() => setStep('plans')}>Back to plans</Button>
          </div>
        )}
      </div>
    </WalletScreen>
  );
}
