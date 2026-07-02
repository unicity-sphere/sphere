/**
 * PlanCapabilitiesScreen - Shows the wallet's provisioned subscription plan
 * after wallet creation/restore, before entering the wallet.
 */
import { motion } from 'framer-motion';
import { Sparkles, Check } from 'lucide-react';
import type { PlanInfo } from '../../../../services/subscriptionApi';
import { Button } from '../../ui';

interface PlanCapabilitiesScreenProps {
  plan: PlanInfo | null;
  created: boolean;
  onContinue: () => void;
  isBusy?: boolean;
}

export function PlanCapabilitiesScreen({ plan, created, onContinue, isBusy }: PlanCapabilitiesScreenProps) {
  return (
    <motion.div
      key="planCapabilities"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.1 }}
      className="flex flex-col h-full px-6 py-8"
    >
      <div className="flex flex-col items-center text-center gap-3 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-orange-500" />
        </div>
        <h2 className="text-xl font-semibold">
          {created ? 'Your plan is ready' : 'Subscription restored'}
        </h2>
        <p className="text-sm text-neutral-500 dark:text-white/45">
          {plan ? `You're on the ${plan.name} plan.` : 'Your subscription is active.'}
        </p>
      </div>

      {plan && (
        <div className="space-y-3 mb-8">
          <Capability label={`${plan.requestsPerDay.toLocaleString()} transactions per day`} />
          <Capability label={`Up to ${plan.requestsPerSecond} per second`} />
        </div>
      )}

      <div className="mt-auto">
        <Button variant="primary" fullWidth loading={isBusy} onClick={onContinue}>
          Enter Wallet
        </Button>
      </div>
    </motion.div>
  );
}

function Capability({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-white/4 rounded-2xl">
      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
