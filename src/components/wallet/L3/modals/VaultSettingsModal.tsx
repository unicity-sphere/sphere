import { useState, useEffect } from 'react';
import { Cloud, Check, Plus, Trash2, Server } from 'lucide-react';
import { WalletScreen } from '../../ui/WalletScreen';
import { ModalHeader } from '../../ui';
import {
  getVaultStore,
  setVaultStore,
  isValidVaultUrl,
  genStoreId,
  hostLabel,
  DEFAULT_VAULT_STORE,
  type VaultStoreSetting,
  type CustomStore,
} from '../../../../config/vaultStore';

interface VaultSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Shared card chrome — a selectable option row (matches the wallet's radio-card style). */
function selectableCardClass(selected: boolean): string {
  return `w-full flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-colors ${
    selected
      ? 'border-orange-500 bg-orange-500/5'
      : 'border-neutral-200 dark:border-white/8 bg-neutral-50 dark:bg-white/4 hover:bg-neutral-100 dark:hover:bg-white/6'
  }`;
}

function Radio({ selected }: { selected: boolean }) {
  return (
    <span
      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
        selected ? 'border-orange-500 bg-orange-500' : 'border-neutral-300 dark:border-white/25'
      }`}
    >
      {selected && <Check className="w-3 h-3 text-white" />}
    </span>
  );
}

export function VaultSettingsModal({ isOpen, onClose }: VaultSettingsModalProps) {
  const [setting, setSetting] = useState<VaultStoreSetting>(DEFAULT_VAULT_STORE);
  const [saved, setSaved] = useState(false);
  // Add-server inline form state.
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');

  // Load the persisted setting whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setSetting(getVaultStore() ?? DEFAULT_VAULT_STORE);
    setSaved(false);
    setAddOpen(false);
    setNewLabel('');
    setNewUrl('');
  }, [isOpen]);

  const stores: CustomStore[] = setting.customStores ?? [];
  const newUrlInvalid = newUrl.trim().length > 0 && !isValidVaultUrl(newUrl);
  const canAdd = isValidVaultUrl(newUrl);

  const selectDefault = () => setSetting((s) => ({ ...s, mode: 'default' }));
  const selectOff = () => setSetting((s) => ({ ...s, mode: 'off' }));
  const selectCustom = (id: string) => setSetting((s) => ({ ...s, mode: 'custom', activeCustomId: id }));

  const addServer = () => {
    if (!canAdd) return;
    const url = newUrl.trim();
    // Reuse an existing entry with the same URL instead of duplicating it.
    const existing = stores.find((s) => s.url === url);
    const id = existing?.id ?? genStoreId();
    const next: CustomStore[] = existing
      ? stores
      : [...stores, { id, label: newLabel.trim() || hostLabel(url), url, addedAt: Date.now() }];
    setSetting((s) => ({ ...s, mode: 'custom', activeCustomId: id, customStores: next }));
    setAddOpen(false);
    setNewLabel('');
    setNewUrl('');
  };

  const removeServer = (id: string) => {
    setSetting((s) => {
      const next = (s.customStores ?? []).filter((x) => x.id !== id);
      const wasActive = s.mode === 'custom' && s.activeCustomId === id;
      return {
        ...s,
        customStores: next,
        // If we removed the active store: pick another custom, else fall back to default.
        ...(wasActive
          ? next.length
            ? { mode: 'custom' as const, activeCustomId: next[0].id }
            : { mode: 'default' as const, activeCustomId: undefined }
          : {}),
      };
    });
  };

  const handleSave = () => {
    setVaultStore(setting);
    setSaved(true);
    // Apply by reloading — the chosen server is wired into Sphere.init on boot.
    setTimeout(() => window.location.reload(), 400);
  };

  return (
    <WalletScreen isOpen={isOpen} onClose={onClose}>
      <ModalHeader variant="screen" title="Vault" icon={Cloud} iconVariant="neutral" onClose={onClose} />

      <div className="overflow-y-auto flex-1 p-4 space-y-4">
        <p className="text-xs font-medium text-neutral-500 dark:text-white/45 uppercase tracking-wider">
          Cloud backup &amp; sync (Vault)
        </p>

        <div className="space-y-2">
          {/* Default (Unicity) */}
          <button onClick={selectDefault} className={selectableCardClass(setting.mode === 'default')}>
            <Radio selected={setting.mode === 'default'} />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-neutral-900 dark:text-white">Default (Unicity)</span>
              <span className="block text-xs text-neutral-500 dark:text-white/45 mt-0.5">
                Back up to Unicity&apos;s hosted token-api. Recommended.
              </span>
            </span>
          </button>

          {/* Saved custom servers */}
          {stores.map((s) => {
            const selected = setting.mode === 'custom' && setting.activeCustomId === s.id;
            return (
              <div key={s.id} className={selectableCardClass(selected)}>
                <button onClick={() => selectCustom(s.id)} className="flex items-start gap-3 flex-1 min-w-0 text-left">
                  <Radio selected={selected} />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900 dark:text-white">
                      <Server className="w-3.5 h-3.5 shrink-0 opacity-60" />
                      <span className="truncate">{s.label}</span>
                    </span>
                    <span className="block text-xs text-neutral-500 dark:text-white/45 mt-0.5 truncate font-mono">
                      {s.url}
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => removeServer(s.id)}
                  aria-label={`Remove ${s.label}`}
                  className="shrink-0 p-1.5 -m-1 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}

          {/* Add server (inline form) */}
          {addOpen ? (
            <div className="p-3.5 rounded-2xl border border-neutral-200 dark:border-white/8 bg-neutral-50 dark:bg-white/4 space-y-2">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Name (optional)"
                className="w-full px-3 py-2 text-sm bg-neutral-100 dark:bg-white/4 text-neutral-900 dark:text-white placeholder-neutral-400 rounded-xl border border-neutral-200 dark:border-white/8 focus:outline-none focus:border-orange-500 transition-colors"
              />
              <input
                type="url"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://your-token-api.example"
                className={`w-full px-3 py-2 text-sm font-mono bg-neutral-100 dark:bg-white/4 text-neutral-900 dark:text-white placeholder-neutral-400 rounded-xl border focus:outline-none transition-colors ${
                  newUrlInvalid
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-neutral-200 dark:border-white/8 focus:border-orange-500'
                }`}
              />
              {newUrlInvalid && <p className="text-xs text-red-500 dark:text-red-400">Enter a valid http(s) URL.</p>}
              <div className="flex gap-2 pt-0.5">
                <button
                  onClick={addServer}
                  disabled={!canAdd}
                  className="flex-1 px-3 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold disabled:opacity-50 hover:bg-orange-600 transition-colors"
                >
                  Add server
                </button>
                <button
                  onClick={() => { setAddOpen(false); setNewLabel(''); setNewUrl(''); }}
                  className="px-3 py-2 rounded-xl bg-neutral-100 dark:bg-white/6 text-neutral-700 dark:text-white/70 text-sm font-medium hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddOpen(true)}
              className="w-full flex items-center gap-2 p-3.5 rounded-2xl border border-dashed border-neutral-300 dark:border-white/15 text-sm font-medium text-neutral-600 dark:text-white/60 hover:border-orange-500 hover:text-orange-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add your own token-api server
            </button>
          )}

          {/* Off */}
          <button onClick={selectOff} className={selectableCardClass(setting.mode === 'off')}>
            <Radio selected={setting.mode === 'off'} />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-neutral-900 dark:text-white">Off</span>
              <span className="block text-xs text-neutral-500 dark:text-white/45 mt-0.5">
                No cloud backup — your tokens stay on this device only.
              </span>
            </span>
          </button>
        </div>

        {/* Helper / privacy note */}
        <p className="text-xs text-neutral-500 dark:text-white/45 leading-relaxed">
          Your tokens are end-to-end encrypted; the server only stores ciphertext. Add your own
          token-api servers and switch between them — one is active at a time. The active server
          handles both backup and token delivery. Changes apply on reload.
        </p>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saved}
          className="w-full px-4 py-3 rounded-xl bg-orange-500 text-white text-sm font-semibold disabled:opacity-50 hover:bg-orange-600 transition-colors"
        >
          {saved ? 'Saved — reloading…' : 'Save'}
        </button>
      </div>
    </WalletScreen>
  );
}
