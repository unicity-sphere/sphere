/**
 * Shown after wallet creation/restore, before entering the wallet. Presents the
 * full plan line-up (the provisioned free plan marked as "current") as a
 * full-screen sheet, then an "Enter Wallet" CTA. Portaled to the document body
 * so it covers the viewport regardless of the onboarding panel it renders in.
 */
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Button } from '../../ui';
import { PlansGrid } from '../../../subscription/PlansGrid';
import { usePlans } from '../../../../sdk/hooks/subscription';
import type { PlanInfo } from '../../../../services/subscriptionApi';

interface PlanCapabilitiesScreenProps {
  /** The provisioned (free) plan — becomes the highlighted "current" card. */
  plan: PlanInfo | null;
  created: boolean;
  onContinue: () => void;
  isBusy?: boolean;
}

export function PlanCapabilitiesScreen({ plan, created, onContinue, isBusy }: PlanCapabilitiesScreenProps) {
  // Onboarding only reaches this screen when the subscription feature is on, so
  // usePlans(true) fetches the full list (mock-backed under VITE_SUBSCRIPTION_MOCK).
  const plans = usePlans(true);
  const currentPlanId = plan?.planId ?? 0;
  const list = plans.data ?? (plan ? [plan] : []);

  return createPortal(
    <motion.div
      key="planCapabilities"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-90 overflow-y-auto bg-white/97 backdrop-blur-sm dark:bg-neutral-950/95"
    >
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 py-10 sm:px-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10">
            <Sparkles className="h-7 w-7 text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold sm:text-3xl">
            {created ? 'Your plan is ready' : 'Subscription restored'}
          </h2>
          <p className="mt-1.5 text-sm text-neutral-500 dark:text-white/45">
            {plan
              ? `You're on the ${plan.name} plan — here's everything you can upgrade to.`
              : 'Your subscription is active.'}
          </p>
        </div>

        {list.length > 0 && <PlansGrid plans={list} currentPlanId={currentPlanId} />}

        <div className="mx-auto mt-10 w-full max-w-xs">
          <Button variant="primary" fullWidth loading={isBusy} onClick={onContinue}>
            Enter Wallet
          </Button>
        </div>
      </div>
    </motion.div>,
    document.body,
  );
}
