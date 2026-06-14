/**
 * Vault store setting — which token-api server (if any) the wallet uses for
 * cloud backup & sync, and the user's saved list of custom servers.
 *
 * The Vault is durable, operator-blind (AEAD-ciphertext-only) multi-device
 * backup/sync of the user's OWN tokens. It sits ON TOP of the local IndexedDB
 * working copy. ONE server is active at a time; the courier delivery channel
 * shares the SAME server URL, so a single active choice covers vault + courier.
 *
 *  - `default` — Unicity's company token-api (the per-network default URL,
 *    `NETWORKS[network].vaultUrl`). ON by default.
 *  - `custom`  — one of the user's saved `customStores`, selected by
 *    `activeCustomId`. The user can keep SEVERAL custom token-api servers and
 *    switch between them (one active at a time).
 *  - `off`     — no cloud backup; local-only (today's behavior).
 *
 * Persisted as JSON under STORAGE_KEYS.VAULT_STORE. When no setting has been
 * saved yet, callers fall back to the env flags (VITE_VAULT_ENABLED etc.) so a
 * fresh wallet still respects a build-time opt-in. A legacy single-URL setting
 * (`{ mode:'custom', customUrl }`) is migrated into `customStores` on read.
 */
import { STORAGE_KEYS } from './storageKeys';

export type VaultStoreMode = 'default' | 'custom' | 'off';

/** A saved custom token-api server the user can switch to. */
export interface CustomStore {
  /** Stable id (selection key; survives label/url edits). */
  id: string;
  /** User-friendly name (defaults to the host). */
  label: string;
  /** token-api base URL (http/https). */
  url: string;
  /** Unix ms when added (display only). */
  addedAt: number;
}

export interface VaultStoreSetting {
  mode: VaultStoreMode;
  /** When mode === 'custom', the id of the active store in `customStores`. */
  activeCustomId?: string;
  /** Saved custom token-api servers (the user can keep several and switch). */
  customStores?: CustomStore[];
  /** @deprecated legacy single custom URL; migrated into `customStores` on read. */
  customUrl?: string;
}

export const DEFAULT_VAULT_STORE: VaultStoreSetting = { mode: 'default' };

/** True when the string is a syntactically valid http(s) URL. */
export function isValidVaultUrl(url: string | undefined | null): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** A stable id for a new custom store (uuid, with a non-crypto fallback). */
export function genStoreId(): string {
  try {
    return crypto?.randomUUID?.() ?? `store-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  } catch {
    return `store-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

/** A friendly default label derived from a URL's host (falls back to the raw url). */
export function hostLabel(url: string): string {
  try {
    return new URL(url.trim()).host || url.trim();
  } catch {
    return url.trim();
  }
}

function isCustomStore(v: unknown): v is CustomStore {
  if (!v || typeof v !== 'object') return false;
  const s = v as Partial<CustomStore>;
  return typeof s.id === 'string' && typeof s.url === 'string' && isValidVaultUrl(s.url);
}

/**
 * Normalize a parsed setting: validate the custom-store list, migrate a legacy
 * single `customUrl` into the list, and pick a sane `activeCustomId`. Pure — no
 * persistence; callers that want to lock in a migration should `setVaultStore`.
 */
function normalize(parsed: Partial<VaultStoreSetting>): VaultStoreSetting {
  const stores: CustomStore[] = Array.isArray(parsed.customStores)
    ? parsed.customStores.filter(isCustomStore).map((s) => ({
        id: s.id,
        label: typeof s.label === 'string' && s.label.trim() ? s.label.trim() : hostLabel(s.url),
        url: s.url.trim(),
        addedAt: typeof s.addedAt === 'number' ? s.addedAt : Date.now(),
      }))
    : [];

  // Migrate a legacy single customUrl into the list (dedup by url).
  if (isValidVaultUrl(parsed.customUrl) && !stores.some((s) => s.url === parsed.customUrl!.trim())) {
    stores.unshift({
      id: genStoreId(),
      label: hostLabel(parsed.customUrl),
      url: parsed.customUrl.trim(),
      addedAt: Date.now(),
    });
  }

  // Active id: keep if it still resolves, else first store.
  let activeCustomId = parsed.activeCustomId;
  if (!activeCustomId || !stores.some((s) => s.id === activeCustomId)) {
    activeCustomId = stores[0]?.id;
  }

  const setting: VaultStoreSetting = { mode: parsed.mode as VaultStoreMode };
  if (stores.length) setting.customStores = stores;
  if (activeCustomId) setting.activeCustomId = activeCustomId;
  return setting;
}

/**
 * Read the persisted vault-store setting. Returns `null` (not the default) when
 * nothing has ever been saved, so callers can distinguish "user has not chosen"
 * (→ fall back to env flags) from "user chose default". A legacy `customUrl`
 * setting is migrated into `customStores` on read.
 */
export function getVaultStore(): VaultStoreSetting | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VAULT_STORE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VaultStoreSetting>;
    if (parsed.mode !== 'default' && parsed.mode !== 'custom' && parsed.mode !== 'off') return null;
    return normalize(parsed);
  } catch {
    return null;
  }
}

/** Persist the vault-store setting (normalized — drops the legacy customUrl). */
export function setVaultStore(setting: VaultStoreSetting): void {
  localStorage.setItem(STORAGE_KEYS.VAULT_STORE, JSON.stringify(normalize(setting)));
}

/**
 * The URL of the active custom store (mode === 'custom'), or `undefined` when not
 * in custom mode / no valid active store. The resolver SphereProvider uses to
 * wire vault + courier for a custom server.
 */
export function getActiveCustomUrl(setting: VaultStoreSetting): string | undefined {
  if (setting.mode !== 'custom') return undefined;
  const stores = setting.customStores ?? [];
  const active = stores.find((s) => s.id === setting.activeCustomId) ?? stores[0];
  return active && isValidVaultUrl(active.url) ? active.url.trim() : undefined;
}

/**
 * A stable, per-browser device id for the vault auth session. token-api keys ONE
 * session per (ownerId, deviceId); without a distinct id every browser used the
 * SDK default 'sphere-vault', so a second browser's login rotated the first's
 * session and its next /v1/auth/refresh got a 401. A persisted random UUID gives
 * each browser its own session (so multiple devices can stay authed at once).
 */
export function getVaultDeviceId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEYS.VAULT_DEVICE_ID);
    if (!id) {
      id = crypto?.randomUUID?.() ?? `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(STORAGE_KEYS.VAULT_DEVICE_ID, id);
    }
    return id;
  } catch {
    return 'sphere-vault';
  }
}
