import { useEffect, useState } from 'react';
import { CreditCard, Sparkles, Zap, Timer, KeyRound, Eye, EyeOff, Copy, Check, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { WalletScreen } from '../../ui/WalletScreen';
import { ModalHeader, Button, EmptyState, AlertMessage } from '../../ui';
import { useUtilization } from '../../../../sdk/hooks/subscription';
import { usagePercent, formatExpiry, msUntil, formatCountdown } from '../../../../sdk/subscription/usage';
import { getStoredSubscriptionKey } from '../../../../config/storageKeys';
import { useSphereContext } from '../../../../sdk/hooks/core/useSphere';
import { provisionOrRecoverKey } from '../../../../services/subscriptionApi';
import { validatePastedKey } from '../../../../sdk/subscription/keyCheck';
import { SPHERE_KEYS } from '../../../../sdk/queryKeys';

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
  const { sphere, applySubscriptionKey } = useSphereContext();
  const queryClient = useQueryClient();
  const [activating, setActivating] = useState(false);
  const [activateError, setActivateError] = useState<string | null>(null);

  // Wallets created before the subscription feature never ran the onboarding
  // provisioning — the free key is an idempotent get-or-create by identity,
  // so a single click recovers/creates it here.
  const activateFreePlan = async () => {
    if (!sphere) return;
    setActivateError(null);
    setActivating(true);
    try {
      const result = await provisionOrRecoverKey(sphere);
      // the free key is provisioned against the wallet's index-0 identity —
      // always store it as the WALLET-wide key, whatever address is active
      await applySubscriptionKey(result.apiKey, { walletWide: true });
      await queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.subscription.all });
    } catch (e) {
      setActivateError(e instanceof Error ? e.message : 'Failed to activate the free plan');
    } finally {
      setActivating(false);
    }
  };

  return (
    <WalletScreen isOpen={isOpen} onClose={onClose}>
      <ModalHeader variant="screen" title="Subscription" icon={CreditCard} iconVariant="gradient" onClose={onClose} />

      <div className="px-5 py-6 space-y-5 flex-1 overflow-y-auto">
        {util.isError && (
          <AlertMessage variant="error">Couldn't load your subscription. Try again later.</AlertMessage>
        )}
        {activateError && <AlertMessage variant="error">{activateError}</AlertMessage>}

        {/* Pre-feature wallet (or failed onboarding provisioning): no key yet */}
        {!apiKey && (
          <div className="flex flex-col items-center gap-4 py-6">
            <EmptyState
              icon={Sparkles}
              title="No plan yet"
              description="Your wallet doesn't have a subscription key. Activate the free plan — it's tied to your wallet identity and takes one signature."
            />
            <Button variant="primary" icon={Sparkles} loading={activating} disabled={!sphere} onClick={activateFreePlan}>
              Activate free plan
            </Button>
          </div>
        )}

        {apiKey && util.isLoading && (
          <div className="py-10 text-center text-neutral-400">
            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
          </div>
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
                {data?.activeUntil
                  ? `Renews / expires: ${formatExpiry(data.activeUntil)}`
                  : 'Never expires — free plan'}
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

        <EnterKeyRow />
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
  const [copied, setCopied] = useState(false);
  const masked = `${apiKey.slice(0, 5)}…${apiKey.slice(-4)}`;
  const copy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
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
          <button type="button" aria-label={copied ? 'Copied' : 'Copy key'} onClick={copy}
            className="rounded p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-white">
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </span>
      </div>
      <p className="mt-1.5 text-[11px] text-neutral-500 dark:text-white/40">
        Your wallet's own key — including any plan bought for it — is recovered when you restore the
        wallet. Keys pasted from elsewhere aren't; keep a copy of those.
      </p>
    </div>
  );
}

const ENTER_KEY_RE = /^sk_[0-9a-f]{32}$/;

/**
 * Paste-a-key affordance: keys are bearer tokens (shareable per the gateway
 * model), so a user can adopt one given to them — or restore a purchased key
 * after a device move. Default semantics: on the root address the key becomes
 * wallet-wide, on any other address it becomes that address's own key.
 */
function EnterKeyRow() {
  const { applySubscriptionKey } = useSphereContext();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = async () => {
    setBusy(true);
    setError(null);
    try {
      const key = value.trim();
      // Definitive unknown/revoked keys reject inline; a failed lookup fails
      // open (the gateway still gates real usage).
      const verdict = await validatePastedKey(key);
      if (!verdict.valid) {
        setError(verdict.message ?? 'This key is not valid.');
        return;
      }
      await applySubscriptionKey(key);
      await queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.subscription.all });
      setOpen(false);
      setValue('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to apply the key');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-neutral-500 underline dark:text-white/45"
      >
        Use a different key
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-neutral-50 px-4 py-3 dark:bg-white/4 space-y-2.5">
      <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-white/60">
        <KeyRound className="w-4 h-4" /> Enter an API key
      </div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="sk_…"
        className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-orange-500 dark:border-white/10 dark:bg-white/5"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button variant="primary" size="sm" loading={busy} disabled={!ENTER_KEY_RE.test(value.trim())} onClick={apply}>
          Apply
        </Button>
        <Button variant="secondary" size="sm" onClick={() => { setOpen(false); setError(null); }}>
          Cancel
        </Button>
      </div>
      <p className="text-[11px] text-neutral-500 dark:text-white/40">
        Keys are transferable — you can use a key someone shared with you. Applied on your main
        address it becomes the wallet-wide key; on another address it applies to that address only.
      </p>
    </div>
  );
}
