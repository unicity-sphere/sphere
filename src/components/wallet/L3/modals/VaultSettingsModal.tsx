import { useState, useEffect } from 'react';
import { Cloud, Check } from 'lucide-react';
import { WalletScreen } from '../../ui/WalletScreen';
import { ModalHeader } from '../../ui';
import {
  getVaultStore,
  setVaultStore,
  isValidVaultUrl,
  DEFAULT_VAULT_STORE,
  type VaultStoreMode,
  type VaultStoreSetting,
} from '../../../../config/vaultStore';

interface VaultSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OPTIONS: { mode: VaultStoreMode; title: string; description: string }[] = [
  {
    mode: 'default',
    title: 'Default (Unicity)',
    description: "Back up to Unicity's hosted token-api. Recommended.",
  },
  {
    mode: 'custom',
    title: 'Custom server',
    description: 'Back up to your own token-api instance.',
  },
  {
    mode: 'off',
    title: 'Off',
    description: 'No cloud backup — your tokens stay on this device only.',
  },
];

export function VaultSettingsModal({ isOpen, onClose }: VaultSettingsModalProps) {
  const [mode, setMode] = useState<VaultStoreMode>('default');
  const [customUrl, setCustomUrl] = useState('');
  const [saved, setSaved] = useState(false);

  // Load the persisted setting whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    const current = getVaultStore() ?? DEFAULT_VAULT_STORE;
    setMode(current.mode);
    setCustomUrl(current.customUrl ?? '');
    setSaved(false);
  }, [isOpen]);

  const customUrlInvalid =
    mode === 'custom' && customUrl.trim().length > 0 && !isValidVaultUrl(customUrl);
  const canSave = mode !== 'custom' || isValidVaultUrl(customUrl);

  const handleSave = () => {
    if (!canSave) return;
    const setting: VaultStoreSetting =
      mode === 'custom'
        ? { mode, customUrl: customUrl.trim() }
        : { mode };
    setVaultStore(setting);
    setSaved(true);
    // Apply by reloading — the chosen server is wired into Sphere.init on boot.
    setTimeout(() => window.location.reload(), 400);
  };

  return (
    <WalletScreen isOpen={isOpen} onClose={onClose}>
      <ModalHeader
        variant="screen"
        title="Vault"
        icon={Cloud}
        iconVariant="neutral"
        onClose={onClose}
      />

      <div className="overflow-y-auto flex-1 p-4 space-y-4">
        <p className="text-xs font-medium text-neutral-500 dark:text-white/45 uppercase tracking-wider">
          Cloud backup &amp; sync (Vault)
        </p>

        {/* Options */}
        <div className="space-y-2">
          {OPTIONS.map((opt) => {
            const selected = mode === opt.mode;
            return (
              <button
                key={opt.mode}
                onClick={() => setMode(opt.mode)}
                className={`w-full flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-colors ${
                  selected
                    ? 'border-orange-500 bg-orange-500/5'
                    : 'border-neutral-200 dark:border-white/8 bg-neutral-50 dark:bg-white/4 hover:bg-neutral-100 dark:hover:bg-white/6'
                }`}
              >
                <span
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    selected
                      ? 'border-orange-500 bg-orange-500'
                      : 'border-neutral-300 dark:border-white/25'
                  }`}
                >
                  {selected && <Check className="w-3 h-3 text-white" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-neutral-900 dark:text-white">
                    {opt.title}
                  </span>
                  <span className="block text-xs text-neutral-500 dark:text-white/45 mt-0.5">
                    {opt.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom URL field */}
        {mode === 'custom' && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-500 dark:text-white/45">
              Your token-api URL
            </label>
            <input
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://your-token-api.example"
              className={`w-full px-3 py-2.5 text-sm font-mono bg-neutral-100 dark:bg-white/4 text-neutral-900 dark:text-white placeholder-neutral-400 rounded-xl border focus:outline-none transition-colors ${
                customUrlInvalid
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-neutral-200 dark:border-white/8 focus:border-orange-500'
              }`}
            />
            {customUrlInvalid && (
              <p className="text-xs text-red-500 dark:text-red-400">
                Enter a valid http(s) URL.
              </p>
            )}
          </div>
        )}

        {/* Helper / privacy note */}
        <p className="text-xs text-neutral-500 dark:text-white/45 leading-relaxed">
          Your tokens are end-to-end encrypted; the server only stores ciphertext.
          &ldquo;Custom&rdquo; points at your own token-api instance. The same server
          handles backup and token delivery. Changes apply on reload.
        </p>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!canSave || saved}
          className="w-full px-4 py-3 rounded-xl bg-orange-500 text-white text-sm font-semibold disabled:opacity-50 hover:bg-orange-600 transition-colors"
        >
          {saved ? 'Saved — reloading…' : 'Save'}
        </button>
      </div>
    </WalletScreen>
  );
}
