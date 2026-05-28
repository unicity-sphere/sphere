import { useEffect, useState } from 'react';
import { Settings, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { BaseModal } from '../wallet/ui/BaseModal';
import { ModalHeader } from '../wallet/ui/ModalHeader';
import { STORAGE_KEYS } from '../../config/storageKeys';
import { readDevOverrideSnapshot, type DevOverrideSnapshot } from '../../sdk/devOverrides';

/**
 * Settings modal — endpoint overrides for the dev/soak workflow.
 *
 * The same six values that `sphereDev` exposes on the console
 * (aggregator, skip-trust-base, Nostr relay, IPFS gateway, faucet,
 * Market API) are surfaced here as a buffered form. The user edits
 * locally; nothing changes in the running wallet until they click
 * Save. Save commits each draft value to its localStorage key
 * (empty input → key removed → fall back to per-network default),
 * dispatches `dev-config-changed`, and closes the modal — the
 * existing listener in SphereProvider then triggers a wallet
 * reinitialize so the new providers take effect.
 */

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMPTY_SNAPSHOT: DevOverrideSnapshot = {
  aggregatorUrl: null,
  skipTrustBase: false,
  nostrRelayUrl: null,
  ipfsGatewayUrl: null,
  faucetUrl: null,
  marketApiUrl: null,
};

// Placeholder text per field — the per-network default the wallet
// uses when the override is empty. Kept in sync with `constants.ts`
// in the SDK; if a future network's default differs (e.g. mainnet),
// users will see a slightly-incorrect placeholder but the actual
// behavior remains correct (the empty-string override falls back to
// the SDK's network resolver, not to these strings).
const PLACEHOLDERS = {
  aggregator: 'https://goggregator-test.unicity.network',
  nostrRelay: 'wss://nostr-relay.testnet.unicity.network',
  ipfsGateway: 'https://unicity-ipfs1.dyndns.org',
  faucet: 'https://faucet.unicity.network/api/v1/faucet/request',
  marketApi: 'https://market-api.unicity.network',
} as const;

function setOrRemove(key: string, value: string | null): void {
  if (value === null || value === '') {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, value);
  }
}

const fieldInputClass =
  'w-full bg-neutral-100 dark:bg-white/6 border border-neutral-200 dark:border-white/10 rounded-xl py-2.5 px-3 text-sm font-mono text-neutral-900 dark:text-white outline-none focus:border-orange-500 transition-colors';

function UrlField({
  label,
  description,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  description: string;
  placeholder: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-1">
        {label}
      </label>
      <p className="text-xs text-neutral-500 dark:text-white/45 mb-2">
        {description}
      </p>
      <input
        type="text"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder={placeholder}
        className={fieldInputClass}
      />
    </div>
  );
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  // Draft is initialized from the persisted snapshot on every open so
  // changes the user discards via Cancel really are discarded.
  const [draft, setDraft] = useState<DevOverrideSnapshot>(EMPTY_SNAPSHOT);

  useEffect(() => {
    if (isOpen) {
      setDraft(readDevOverrideSnapshot());
    }
  }, [isOpen]);

  const dirty =
    JSON.stringify(draft) !== JSON.stringify(readDevOverrideSnapshot());

  const handleSave = () => {
    setOrRemove(STORAGE_KEYS.DEV_AGGREGATOR_URL, draft.aggregatorUrl);
    setOrRemove(
      STORAGE_KEYS.DEV_SKIP_TRUST_BASE,
      draft.skipTrustBase ? 'true' : null,
    );
    setOrRemove(STORAGE_KEYS.DEV_NOSTR_RELAY_URL, draft.nostrRelayUrl);
    setOrRemove(STORAGE_KEYS.DEV_IPFS_GATEWAY_URL, draft.ipfsGatewayUrl);
    setOrRemove(STORAGE_KEYS.DEV_FAUCET_URL, draft.faucetUrl);
    setOrRemove(STORAGE_KEYS.DEV_MARKET_API_URL, draft.marketApiUrl);
    // Single event for the whole batch — SphereProvider's listener
    // does ONE reinitialize, not six.
    window.dispatchEvent(new Event('dev-config-changed'));
    onClose();
  };

  const handleResetAll = () => {
    setDraft(EMPTY_SNAPSHOT);
  };

  const handleCancel = () => {
    // Discard draft.
    onClose();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={handleCancel} size="lg">
      <ModalHeader
        title="Dev Settings"
        icon={Settings}
        iconVariant="gradient"
        subtitle="Endpoint overrides for local stacks / soak tests"
        onClose={handleCancel}
      />

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <UrlField
          label="Aggregator URL"
          description="L3 aggregator JSON-RPC endpoint. Empty → per-network default."
          placeholder={PLACEHOLDERS.aggregator}
          value={draft.aggregatorUrl}
          onChange={(v) => setDraft((d) => ({ ...d, aggregatorUrl: v }))}
        />

        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <input
            id="settings-skip-trust-base"
            type="checkbox"
            checked={draft.skipTrustBase}
            onChange={(e) =>
              setDraft((d) => ({ ...d, skipTrustBase: e.target.checked }))
            }
            className="mt-1 h-4 w-4 cursor-pointer accent-orange-500"
          />
          <label
            htmlFor="settings-skip-trust-base"
            className="cursor-pointer"
          >
            <div className="text-sm font-semibold text-neutral-900 dark:text-white">
              Skip trust-base verification
            </div>
            <p className="text-xs text-neutral-500 dark:text-white/45 mt-0.5">
              Required when the aggregator above is locally-bootstrapped with
              a fresh genesis. <span className="text-amber-500">Dev only</span>{' '}
              — never enable against production endpoints.
            </p>
          </label>
        </div>

        <UrlField
          label="Nostr Relay URL"
          description="Replaces the network's relay list with a single URL."
          placeholder={PLACEHOLDERS.nostrRelay}
          value={draft.nostrRelayUrl}
          onChange={(v) => setDraft((d) => ({ ...d, nostrRelayUrl: v }))}
        />

        <UrlField
          label="IPFS Gateway URL"
          description="Used both by the SDK's IPFS sync layer and the banner's gateway probe."
          placeholder={PLACEHOLDERS.ipfsGateway}
          value={draft.ipfsGatewayUrl}
          onChange={(v) => setDraft((d) => ({ ...d, ipfsGatewayUrl: v }))}
        />

        <UrlField
          label="Market API URL"
          description="Markets module (intents DB for trading agents). Banner pings this for the Market pill."
          placeholder={PLACEHOLDERS.marketApi}
          value={draft.marketApiUrl}
          onChange={(v) => setDraft((d) => ({ ...d, marketApiUrl: v }))}
        />

        <UrlField
          label="Faucet URL"
          description="Top-up faucet endpoint (full path, including /api/v1/faucet/request)."
          placeholder={PLACEHOLDERS.faucet}
          value={draft.faucetUrl}
          onChange={(v) => setDraft((d) => ({ ...d, faucetUrl: v }))}
        />
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-100 dark:border-white/6 px-6 py-3 flex items-center gap-2 shrink-0">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleResetAll}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-600 dark:text-white/55 hover:bg-neutral-100 dark:hover:bg-white/6 transition-colors"
          title="Clear all override fields. Click Save to persist."
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset all
        </motion.button>
        <div className="flex-1" />
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleCancel}
          className="px-4 py-2 rounded-xl text-sm font-medium text-neutral-600 dark:text-white/55 hover:bg-neutral-100 dark:hover:bg-white/6 transition-colors"
        >
          Cancel
        </motion.button>
        <motion.button
          whileHover={dirty ? { scale: 1.03 } : {}}
          whileTap={dirty ? { scale: 0.97 } : {}}
          onClick={handleSave}
          disabled={!dirty}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            dirty
              ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md'
              : 'bg-neutral-200 dark:bg-white/10 text-neutral-400 dark:text-white/35 cursor-not-allowed'
          }`}
        >
          Save & reload
        </motion.button>
      </div>
    </BaseModal>
  );
}
