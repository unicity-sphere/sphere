/**
 * Paste-an-API-key affordance, shared by every surface that offers it: the
 * plan screen (onboarding) and Settings → Subscription. Keys are bearer
 * tokens per the gateway model, so a user can arrive holding one — bought
 * elsewhere, shared with them, or carried across a device move — and adopt it
 * without going through a purchase.
 *
 * Collapsed to a single prompt until clicked; the copy and the key's scope are
 * the caller's, the validate-then-apply path is not (it used to be written out
 * twice, once per surface).
 */
import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../wallet/ui';
import { useSphereContext } from '../../sdk/hooks/core/useSphere';
import { validatePastedKey } from '../../sdk/subscription/keyCheck';
import { SPHERE_KEYS } from '../../sdk/queryKeys';

const KEY_RE = /^sk_[0-9a-f]{32}$/;

interface EnterApiKeyRowProps {
  /** Copy of the collapsed affordance that reveals the input. */
  label: string;
  /** Explanatory line under the Apply/Cancel row — scope semantics belong here. */
  note: string;
  /**
   * Force the key wallet-wide. Onboarding does: the provisioned key it
   * replaces was stored wallet-wide too, so a pasted replacement must not end
   * up scoped to whichever address a restore left active. Settings omits it and
   * gets applySubscriptionKey's default (wallet-wide on the root address, that
   * address's own key anywhere else).
   */
  walletWide?: boolean;
  /** Confirmation to show in place of the row after a successful apply. */
  appliedNote?: string;
  /** Collapsed styling: an underlined link (Settings) or a quiet button (onboarding). */
  tone?: 'link' | 'quiet';
}

export function EnterApiKeyRow({ label, note, walletWide, appliedNote, tone = 'link' }: EnterApiKeyRowProps) {
  const { applySubscriptionKey } = useSphereContext();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState(false);
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
      await applySubscriptionKey(key, walletWide ? { walletWide: true } : undefined);
      await queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.subscription.all });
      setApplied(true);
      setOpen(false);
      setValue('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to apply the key');
    } finally {
      setBusy(false);
    }
  };

  if (applied && appliedNote) {
    return <p className="mt-3 text-center text-xs text-emerald-500">{appliedNote}</p>;
  }

  if (!open) {
    return tone === 'quiet' ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-white/40 dark:hover:bg-white/6 dark:hover:text-white"
      >
        <KeyRound className="h-3.5 w-3.5" />
        {label}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-neutral-500 underline dark:text-white/45"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2.5 rounded-2xl bg-neutral-50 px-4 py-3 dark:bg-white/4">
      <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-white/60">
        <KeyRound className="h-4 w-4" /> Enter an API key
      </div>
      <input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        placeholder="sk_…"
        className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-orange-500 dark:border-white/10 dark:bg-white/5"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button variant="primary" size="sm" loading={busy} disabled={!KEY_RE.test(value.trim())} onClick={apply}>
          Apply
        </Button>
        <Button variant="secondary" size="sm" onClick={() => { setOpen(false); setError(null); }}>
          Cancel
        </Button>
      </div>
      <p className="text-[11px] text-neutral-500 dark:text-white/40">{note}</p>
    </div>
  );
}
