import { useEffect, useState } from 'react';
import { CreditCard, Sparkles, Zap, Timer } from 'lucide-react';
import { WalletScreen } from '../../ui/WalletScreen';
import { ModalHeader, Button, EmptyState, AlertMessage } from '../../ui';
import { useSubscription, useSubscriptionUsage } from '../../../../sdk/hooks/subscription';
import { usagePercent, formatExpiry, msUntil, formatCountdown } from '../../../../sdk/subscription/usage';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
}

export function SubscriptionModal({ isOpen, onClose, onUpgrade }: SubscriptionModalProps) {
  const sub = useSubscription();
  const usage = useSubscriptionUsage();
  const plan = sub.data?.pricingPlan;

  return (
    <WalletScreen isOpen={isOpen} onClose={onClose}>
      <ModalHeader variant="screen" title="Subscription" icon={CreditCard} iconVariant="gradient" onClose={onClose} />

      <div className="px-5 py-6 space-y-5 flex-1 overflow-y-auto">
        {sub.isError && (
          <AlertMessage variant="error">Couldn't load your subscription. Try again later.</AlertMessage>
        )}

        {!sub.isError && !plan && !sub.isLoading && (
          <EmptyState icon={Sparkles} title="No active plan" description="You don't have an active subscription yet." />
        )}

        {plan && (
          <>
            {/* Current plan card */}
            <div className="p-5 rounded-2xl bg-orange-500/10 border border-orange-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-orange-500" />
                <span className="font-semibold font-mono capitalize">{plan.name} plan</span>
              </div>
              <div className="text-xs text-neutral-500 dark:text-white/45">
                Renews / expires: {formatExpiry(sub.data?.expiresAt ?? null)}
              </div>
            </div>

            {/* Usage bars (limits are commitments, not transactions) */}
            <div className="space-y-4">
              <UsageBar
                icon={Zap}
                label="Daily commitments"
                used={usage.data?.perDay.used ?? 0}
                limit={usage.data?.perDay.limit ?? plan.requestsPerDay}
                loading={usage.isLoading}
              />
              <UsageBar
                icon={Zap}
                label="Commitments / second"
                used={usage.data ? usage.data.perSecond.limit - usage.data.perSecond.remaining : 0}
                limit={usage.data?.perSecond.limit ?? plan.requestsPerSecond}
                loading={usage.isLoading}
              />
            </div>

            {/* Countdown to the daily limit reset */}
            <ResetRow resetAt={usage.data?.perDay.resetAt ?? null} active={isOpen} loading={usage.isLoading} />
          </>
        )}
      </div>

      <div className="px-5 pb-6">
        <Button variant="primary" fullWidth icon={Sparkles} onClick={onUpgrade} disabled={!onUpgrade}>
          Upgrade plan
        </Button>
      </div>
    </WalletScreen>
  );
}

function UsageBar({ icon: Icon, label, used, limit, loading }: {
  icon: typeof Zap; label: string; used: number; limit: number; loading?: boolean;
}) {
  const pct = usagePercent(used, limit);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-sm">
        <span className="flex items-center gap-1.5 text-neutral-600 dark:text-white/60">
          <Icon className="w-3.5 h-3.5" /> {label}
        </span>
        <span className="font-mono text-xs text-neutral-500 dark:text-white/45">
          {loading ? '…' : `${used.toLocaleString()} / ${limit.toLocaleString()}`}
        </span>
      </div>
      <div className="h-2 rounded-full bg-neutral-200 dark:bg-white/8 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-500' : 'bg-emerald-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Live countdown to the daily-limit reset; ticks only while the modal is open. */
function ResetRow({ resetAt, active, loading }: { resetAt: string | null; active: boolean; loading?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  const ms = msUntil(resetAt, now);
  return (
    <div className="flex items-center justify-between rounded-2xl bg-neutral-50 dark:bg-white/4 px-4 py-3 text-sm">
      <span className="flex items-center gap-2 text-neutral-600 dark:text-white/60">
        <Timer className="w-4 h-4" /> Daily limit resets in
      </span>
      <span className="font-mono text-neutral-900 dark:text-white">
        {loading ? '…' : ms === null ? 'continuously' : ms === 0 ? 'now' : formatCountdown(ms)}
      </span>
    </div>
  );
}
