/**
 * One-time prompt shown when the user switches to an address that has no
 * subscription key and no recorded preference (SphereProvider raises the
 * 'subscription-address-prompt' DOM event after resolving the switch — the
 * wallet key is applied provisionally meanwhile).
 *
 * Outcomes (each records a per-address preference so the prompt never repeats
 * for this address):
 * - keep the checkbox on  → inherit the wallet's primary key;
 * - checkbox off / dismiss → this address gets its OWN free plan (separate
 *   quota, provisioned against the active address identity);
 * - enter a key / buy     → that key becomes this address's own key.
 */
import { useEffect, useMemo, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { BaseModal } from '../wallet/ui/BaseModal';
import { Button } from '../wallet/ui';
import { useSphereContext } from '../../sdk/hooks/core/useSphere';
import { useUtilization } from '../../sdk/hooks/subscription';
import { provisionOrRecoverKey } from '../../services/subscriptionApi';
import { setAddressPreference } from '../../sdk/subscription/keyVault';
import { truncateAddress } from '../wallet/shared/utils/walletFileParser';
import { useUpgrade } from '../upgrade';

const KEY_RE = /^sk_[0-9a-f]{32}$/;

/** Human identifier for an address: its nametag, else a short Unicity ID. */
function formatIdentity(nametag?: string | null, chainPubkey?: string | null): string | null {
  if (nametag) return `@${nametag}`;
  if (chainPubkey) return `Unicity ID · ${truncateAddress(chainPubkey, 10, 6)}`;
  return null;
}

export function AddressKeyPromptModal() {
  const { sphere, network, applySubscriptionKey } = useSphereContext();
  const { openUpgrade } = useUpgrade();
  // The wallet key is applied provisionally when this prompt opens, so the
  // current utilization snapshot describes exactly the plan the user would
  // inherit by keeping the checkbox on.
  const util = useUtilization();
  const inheritedPlanName = util.data?.plan?.name ?? null;

  // Identity of the wallet's primary address (#1 / index 0) — the one whose
  // key is inherited. Its nametag comes from the tracked-address cache; when
  // absent (or not yet cached) we fall back to its short Unicity ID.
  const rootIdentity = useMemo(() => {
    try {
      const root = sphere?.getTrackedAddress(0);
      return formatIdentity(root?.nametag, root?.chainPubkey);
    } catch {
      return null;
    }
  }, [sphere]);

  const [isOpen, setIsOpen] = useState(false);
  const [useWalletKey, setUseWalletKey] = useState(true); // default: inherit the wallet's primary key
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const open = () => {
      setUseWalletKey(true);
      setShowKeyInput(false);
      setKeyInput('');
      setError(null);
      setIsOpen(true);
    };
    window.addEventListener('subscription-address-prompt', open);
    return () => window.removeEventListener('subscription-address-prompt', open);
  }, []);

  const close = () => setIsOpen(false);

  /**
   * Give THIS address its own free plan (separate quota). Best-effort: if the
   * gateway is unreachable, record the 'own' preference anyway so the prompt
   * doesn't repeat — the address keeps using the wallet key until its own free
   * key can be provisioned (fail-open).
   */
  const commitOwnFreePlan = async () => {
    if (!sphere) return;
    try {
      const result = await provisionOrRecoverKey(sphere, { scope: 'address' });
      await applySubscriptionKey(result.apiKey, { walletWide: false });
    } catch {
      await setAddressPreference(sphere, network, 'own').catch(() => {});
    }
  };

  const handleContinue = async () => {
    if (!sphere) return close();
    setBusy(true);
    setError(null);
    try {
      if (showKeyInput && keyInput) {
        await applySubscriptionKey(keyInput.trim(), { walletWide: false }); // own key for this address
      } else if (useWalletKey) {
        await setAddressPreference(sphere, network, 'inherit'); // wallet key already applied — record choice
      } else {
        await commitOwnFreePlan();
      }
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to apply the key');
    } finally {
      setBusy(false);
    }
  };

  // Dismissing (X / backdrop) means "leave this address on its own free plan"
  // — commit it so the prompt never repeats for this address.
  const handleDismiss = () => {
    void commitOwnFreePlan();
    close();
  };

  const handleBuy = () => {
    close(); // checkout adoption stores the bought key as this address's own key
    openUpgrade();
  };

  const keyValid = KEY_RE.test(keyInput.trim());
  const continueDisabled = busy || (showKeyInput && !keyValid);

  return (
    <BaseModal isOpen={isOpen} onClose={handleDismiss} size="sm">
      <div className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-orange-500" />
          <h3 className="font-semibold">No subscription key for this address</h3>
        </div>
        <p className="mb-4 text-sm text-neutral-500 dark:text-white/45">
          Sends from this address need an aggregator key. Use your wallet's primary key, keep a free
          plan just for this address, enter an existing key, or buy a plan.
        </p>

        {!showKeyInput && (
          <label className="mb-4 flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={useWalletKey}
              onChange={(e) => setUseWalletKey(e.target.checked)}
              className="mt-0.5 accent-orange-500"
            />
            <span>
              Use my wallet's primary key ({rootIdentity ?? 'address #1'}
              {inheritedPlanName ? <> — <span className="capitalize">{inheritedPlanName}</span> plan</> : null})
            </span>
          </label>
        )}

        {showKeyInput && (
          <input
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="sk_…"
            className="mb-4 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 font-mono text-sm outline-none focus:border-orange-500 dark:border-white/10 dark:bg-white/5"
          />
        )}

        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

        <Button variant="primary" fullWidth loading={busy} disabled={continueDisabled} onClick={handleContinue}>
          {showKeyInput || useWalletKey ? 'Continue' : 'Continue with a free plan for this address'}
        </Button>

        <div className="mt-3 flex items-center justify-center gap-4 text-sm">
          <button
            type="button"
            className="text-neutral-500 underline dark:text-white/45"
            onClick={() => { setShowKeyInput(!showKeyInput); setError(null); }}
          >
            {showKeyInput ? 'Use the wallet key instead' : 'Enter an existing key'}
          </button>
          <button type="button" className="text-neutral-500 underline dark:text-white/45" onClick={handleBuy}>
            Buy a plan
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
