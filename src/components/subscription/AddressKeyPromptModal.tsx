/**
 * One-time prompt shown when the user switches to an address that has no
 * subscription key and no recorded preference (SphereProvider raises the
 * 'subscription-address-prompt' DOM event after resolving the switch — the
 * wallet key is already applied provisionally, so "Continue" just records
 * the inherit choice). Buying or entering a key stores it as THIS address's
 * own key.
 */
import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { BaseModal } from '../wallet/ui/BaseModal';
import { Button } from '../wallet/ui';
import { useSphereContext } from '../../sdk/hooks/core/useSphere';
import { setAddressPreference } from '../../sdk/subscription/keyVault';
import { useUpgrade } from '../upgrade';

const KEY_RE = /^sk_[0-9a-f]{32}$/;

export function AddressKeyPromptModal() {
  const { sphere, network, applySubscriptionKey } = useSphereContext();
  const { openUpgrade } = useUpgrade();

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

  const handleContinue = async () => {
    if (!sphere) return close();
    setBusy(true);
    setError(null);
    try {
      if (showKeyInput && keyInput) {
        // Own key for this address ('own' preference recorded by the vault).
        await applySubscriptionKey(keyInput.trim(), { walletWide: false });
      } else if (useWalletKey) {
        // Wallet key is already applied provisionally — just remember the choice.
        await setAddressPreference(sphere, network, 'inherit');
      }
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to apply the key');
    } finally {
      setBusy(false);
    }
  };

  const handleBuy = () => {
    close(); // checkout adoption stores the bought key as this address's own key
    openUpgrade();
  };

  const keyValid = KEY_RE.test(keyInput.trim());
  const continueDisabled = busy || (showKeyInput ? !keyValid : !useWalletKey);

  return (
    <BaseModal isOpen={isOpen} onClose={close} size="sm">
      <div className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-orange-500" />
          <h3 className="font-semibold">No subscription key for this address</h3>
        </div>
        <p className="mb-4 text-sm text-neutral-500 dark:text-white/45">
          Sends from this address need an aggregator key. Use your wallet's primary key, enter an
          existing one, or buy a plan just for this address.
        </p>

        {!showKeyInput && (
          <label className="mb-4 flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={useWalletKey}
              onChange={(e) => setUseWalletKey(e.target.checked)}
              className="mt-0.5 accent-orange-500"
            />
            <span>Use my wallet's primary key (address #1)</span>
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
          Continue
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
