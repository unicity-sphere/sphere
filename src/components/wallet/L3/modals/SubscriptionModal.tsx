import { useEffect, useState } from 'react';
import { CreditCard, Sparkles, Zap, Timer, KeyRound, Eye, EyeOff, Copy } from 'lucide-react';
import { WalletScreen } from '../../ui/WalletScreen';
import { ModalHeader, Button, EmptyState, AlertMessage } from '../../ui';
import { useUtilization } from '../../../../sdk/hooks/subscription';
import { usagePercent, formatExpiry, msUntil, formatCountdown } from '../../../../sdk/subscription/usage';
import { getStoredSubscriptionKey } from '../../../../config/storageKeys';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
}

export function SubscriptionModal({ isOpen, onClose, onUpgrade }: SubscriptionModalProps) {
  const util = useUtilization();
  const data = util.data;
  const plan = data?.plan ?? null;
  const apiKey = getStoredSubscriptionKey();

  return (
    <WalletScreen isOpen={isOpen} onClose={onClose}>
      <ModalHeader variant="screen" title="Subscription" icon={CreditCard} iconVariant="gradient" onClose={onClose} />

      <div className="px-5 py-6 space-y-5 flex-1 overflow-y-auto">
        {util.isError && (
          <AlertMessage variant="error">Couldn't load your subscription. Try again later.</AlertMessage>
        )}

        {data?.status === 'expired' && (
          <AlertMessage variant="warning">
            Your plan expired {formatExpiry(data.activeUntil)}. Renew to keep higher limits.
          </AlertMessage>
        )}

        {data?.status === 'inactive' && !util.isLoading && (
          <EmptyState icon={Sparkles} title="No active plan" description="Get a plan to raise your commitment limits." />
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
                Renews / expires: {formatExpiry(data?.activeUntil ?? null)}
              </div>
            </div>

            {/* Usage bars (limits are commitments, not transactions) */}
            <div className="space-y-4">
              <UsageBar
                icon={Zap}
                label="Daily commitments"
                used={data?.utilization.consumedPerDay ?? 0}
                limit={data?.utilization.maxPerDay ?? plan?.requestsPerDay ?? 0}
                loading={util.isLoading}
              />
              <UsageBar
                icon={Zap}
                label="Commitments / minute"
                used={data?.utilization.consumedPerMinute ?? 0}
                limit={data?.utilization.maxPerMinute ?? plan?.requestsPerMinute ?? 0}
                loading={util.isLoading}
              />
            </div>

            {/* Countdown to the daily limit reset — bucket4j refills continuously today; kept for when the gateway adds a reset time */}
            <ResetRow resetAt={null} active={isOpen} loading={util.isLoading} />
          </>
        )}

        {apiKey && <ApiKeyRow apiKey={apiKey} />}
      </div>

      <div className="px-5 pb-6">
        <Button variant="primary" fullWidth icon={Sparkles} onClick={onUpgrade} disabled={!onUpgrade}>
          {data?.status === 'expired' ? 'Renew plan' : 'Upgrade plan'}
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

function ApiKeyRow({ apiKey }: { apiKey: string }) {
  const [visible, setVisible] = useState(false);
  const masked = `${apiKey.slice(0, 5)}…${apiKey.slice(-4)}`;
  return (
    <div className="rounded-2xl bg-neutral-50 px-4 py-3 dark:bg-white/4">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-neutral-600 dark:text-white/60">
          <KeyRound className="h-4 w-4" /> API key
        </span>
        <span className="flex items-center gap-1.5">
          <code className="font-mono text-xs">{visible ? apiKey : masked}</code>
          <button type="button" aria-label={visible ? 'Hide key' : 'Show key'} onClick={() => setVisible(!visible)}
            className="rounded p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-white">
            {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
          <button type="button" aria-label="Copy key" onClick={() => navigator.clipboard.writeText(apiKey)}
            className="rounded p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-white">
            <Copy className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
      <p className="mt-1.5 text-[11px] text-neutral-500 dark:text-white/40">
        Purchased keys aren't tied to your wallet identity — keep a copy. Restore recovers only the free key.
      </p>
    </div>
  );
}
