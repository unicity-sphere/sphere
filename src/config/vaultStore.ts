/**
 * Vault store setting — which token-api server (if any) the wallet uses for
 * cloud backup & sync.
 *
 * The Vault is durable, operator-blind (AEAD-ciphertext-only) multi-device
 * backup/sync of the user's OWN tokens. It sits ON TOP of the local IndexedDB
 * working copy — it is NOT a "pick one of N stores". The user choice here is
 * only which vault SERVER (and whether to use one at all). The courier delivery
 * channel shares the SAME server URL, so a single choice covers vault + courier.
 *
 *  - `default` — Unicity's company token-api (the per-network default URL,
 *    `NETWORKS[network].vaultUrl`). ON by default.
 *  - `custom`  — the user's own token-api instance (they enter its http(s) URL).
 *  - `off`     — no cloud backup; local-only (today's behavior).
 *
 * Persisted as JSON under STORAGE_KEYS.VAULT_STORE. When no setting has been
 * saved yet, callers fall back to the env flags (VITE_VAULT_ENABLED etc.) so a
 * fresh wallet still respects a build-time opt-in.
 */
import { STORAGE_KEYS } from './storageKeys';

export type VaultStoreMode = 'default' | 'custom' | 'off';

export interface VaultStoreSetting {
  mode: VaultStoreMode;
  /** Only meaningful when mode === 'custom'. The user's own token-api base URL. */
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

/**
 * Read the persisted vault-store setting. Returns `null` (not the default) when
 * nothing has ever been saved, so callers can distinguish "user has not chosen"
 * (→ fall back to env flags) from "user chose default".
 */
export function getVaultStore(): VaultStoreSetting | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VAULT_STORE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VaultStoreSetting>;
    if (parsed.mode === 'default' || parsed.mode === 'custom' || parsed.mode === 'off') {
      return {
        mode: parsed.mode,
        ...(typeof parsed.customUrl === 'string' ? { customUrl: parsed.customUrl } : {}),
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** Persist the vault-store setting. */
export function setVaultStore(setting: VaultStoreSetting): void {
  localStorage.setItem(STORAGE_KEYS.VAULT_STORE, JSON.stringify(setting));
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
