/**
 * Shown when the user switches to an address that has no key of its own AND
 * index 0 is on a PAID plan (SphereProvider raises 'subscription-address-prompt'
 * only in that case — a free primary plan just auto-gives this address its own
 * free key, no prompt). The single decision: share the paid primary plan, or
 * keep an individual free plan for this address.
 *
 * Outcomes (each records a per-address preference so the prompt never repeats):
 * - checkbox ON  → inherit the primary (index-0) key — shares its paid plan;
 * - checkbox OFF / dismiss → this address gets its OWN free plan;
 * - enter a key / buy → that key becomes this address's own key.
 */
import { useEffect, useMemo, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { BaseModal } from '../wallet/ui/BaseModal';
import { Button } from '../wallet/ui';
import { useSphereContext } from '../../sdk/hooks/core/useSphere';
import { provisionOrRecoverKey, getUtilization } from '../../services/subscriptionApi';
import { setAddressPreference, loadWalletKey } from '../../sdk/subscription/keyVault';
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

  // Identity of the wallet's primary address (#1 / index 0) — the one whose
  // paid plan the checkbox would share.
  const rootIdentity = useMemo(() => {
    try {
      const root = sphere?.getTrackedAddress(0);
      return formatIdentity(root?.nametag, root?.chainPubkey);
    } catch {
      return null;
    }
  }, [sphere]);

  const [isOpen, setIsOpen] = useState(false);
  const [shareKey, setShareKey] = useState(false); // default: individual free plan for this address
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletKey, setWalletKey] = useState<string | null>(null);
  const [rootPlanName, setRootPlanName] = useState<string | null>(null);

  useEffect(() => {
    const open = () => {
      setShareKey(false);
      setShowKeyInput(false);
      setKeyInput('');
      setError(null);
      setIsOpen(true);
      // Load the primary key + its (paid) plan name to label the checkbox.
      if (sphere) {
        void loadWalletKey(sphere, network)
          .then(async (wk) => {
            setWalletKey(wk);
            if (wk) {
              try {
                setRootPlanName((await getUtilization(wk)).plan?.name ?? null);
              } catch {
                setRootPlanName(null);
              }
            }
          })
          .catch(() => {});
      }
    };
    window.addEventListener('subscription-address-prompt', open);
    return () => window.removeEventListener('subscription-address-prompt', open);
  }, [sphere, network]);

  const close = () => setIsOpen(false);

  /**
   * Give THIS address its own free plan (separate quota). Best-effort: if the
   * gateway is unreachable, record the 'own' preference anyway so the prompt
   * doesn't repeat — the address is re-provisioned on the next switch (fail-open).
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
      } else if (shareKey && walletKey) {
        // Inherit the primary key: record the choice, then make it the active key.
        await setAddressPreference(sphere, network, 'inherit');
        await applySubscriptionKey(walletKey, { walletWide: true });
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

  // Dismissing (X / backdrop) = keep this address on its own free plan.
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
          <h3 className="font-semibold">Plan for this address</h3>
        </div>
        <p className="mb-4 text-sm text-neutral-500 dark:text-white/45">
          By default this address gets its own free plan. Your primary address is on a paid plan —
          you can share it here instead, enter an existing key, or buy a separate plan.
        </p>

        {!showKeyInput && (
          <label className="mb-4 flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={shareKey}
              onChange={(e) => setShareKey(e.target.checked)}
              className="mt-0.5 accent-orange-500"
            />
            <span>
              Share my primary key ({rootIdentity ?? 'address #1'}
              {rootPlanName ? <> — <span className="capitalize">{rootPlanName}</span> plan</> : null})
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
          {showKeyInput || shareKey ? 'Continue' : 'Continue with a free plan for this address'}
        </Button>

        <div className="mt-3 flex items-center justify-center gap-4 text-sm">
          <button
            type="button"
            className="text-neutral-500 underline dark:text-white/45"
            onClick={() => { setShowKeyInput(!showKeyInput); setError(null); }}
          >
            {showKeyInput ? 'Back' : 'Enter an existing key'}
          </button>
          <button type="button" className="text-neutral-500 underline dark:text-white/45" onClick={handleBuy}>
            Buy a plan
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
