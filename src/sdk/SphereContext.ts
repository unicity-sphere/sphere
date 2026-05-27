import { createContext } from 'react';
import type { Sphere, PeerInfo, InitProgress } from '@unicitylabs/sphere-sdk';
import type { BrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';

/**
 * Which token-storage backend the current `Sphere` instance is wired to.
 *
 * - `'legacy'`  — `IndexedDBTokenStorageProvider`. Per-address
 *                 `sphere-token-storage-<addressId>` IndexedDB.
 * - `'profile'` — `ProfileTokenStorageProvider`. OrbitDB-backed,
 *                 `orbitdb/…` IndexedDB.
 *
 * Note: identity / mnemonic always lives in the legacy `sphere-storage`
 * KV — even under Profile mode, because the Profile local cache uses
 * the same IndexedDB name. The only thing that changes between modes is
 * the **token** store.
 */
export type WalletMode = 'legacy' | 'profile';

export interface SphereContextValue {
  sphere: Sphere | null;
  providers: BrowserProviders | null;

  isLoading: boolean;
  isInitialized: boolean;
  walletExists: boolean;
  error: Error | null;

  /** True while background address discovery is running (post-init) */
  isDiscoveringAddresses: boolean;

  /** Current SDK initialization progress (null when idle or complete) */
  initProgress: InitProgress | null;

  /** Resolve a nametag via Nostr transport — works without a wallet */
  resolveNametag: (nametag: string) => Promise<PeerInfo | null>;
  createWallet: (options?: CreateWalletOptions) => Promise<{ mnemonic: string; sphere: Sphere }>;
  importWallet: (
    mnemonic: string,
    options?: ImportWalletOptions,
  ) => Promise<Sphere>;
  importFromFile: (options: ImportFromFileOptions) => Promise<ImportFromFileResult>;
  /** Mark wallet as existing — call after import flow completes (scanning, address selection, etc.).
   *  Optionally accepts a Sphere instance to set in context (for import flows where sphere
   *  is NOT set eagerly to avoid premature re-renders). */
  finalizeWallet: (importedSphere?: Sphere) => void;
  deleteWallet: () => Promise<void>;
  reinitialize: () => Promise<void>;

  /** Whether IPFS token sync is currently enabled */
  ipfsEnabled: boolean;
  /** Toggle IPFS sync on/off (persists to localStorage, triggers reinitialize) */
  toggleIpfs: () => void;

  // ── Wallet-storage mode controls ──────────────────────────────────
  /**
   * Which token-storage backend the active `Sphere` instance is wired
   * to. Falls back to `'legacy'` while the provider is still booting
   * (no `sphere` yet) since the SDK initialization defaults to legacy.
   *
   * Updated whenever {@link switchWalletMode} or the boot-time UXF
   * migration completes its provider swap.
   */
  walletMode: WalletMode;
  /**
   * Probe result: does the LEGACY `IndexedDBTokenStorageProvider`
   * contain user-meaningful token data for the current identity?
   * `null` until the first probe completes.
   */
  hasLegacyData: boolean | null;
  /**
   * Probe result: does the PROFILE `ProfileTokenStorageProvider`
   * contain user-meaningful token data for the current identity?
   * `null` until the first probe completes.
   */
  hasProfileData: boolean | null;
  /** True while a switch/merge operation is running. Disables banner actions. */
  isSwitchingMode: boolean;
  /**
   * Switch the active token-storage backend. Re-creates Sphere with
   * the target providers and updates {@link walletMode}. No data is
   * copied — the user MUST run {@link runLegacyToProfileMigration}
   * explicitly if they want to merge.
   *
   * Cross-tab: callers MUST tolerate a transient `IS_SWITCHING_MODE`
   * state in other tabs; we use a localStorage lock to coordinate but
   * the lock is best-effort (no Web Lock API yet, see deferred TODO).
   */
  switchWalletMode: (target: WalletMode) => Promise<void>;
  /**
   * Run the legacy → Profile token migration as a user-initiated
   * action (banner button). When `force: true`, bypasses both the
   * data-presence guard AND the SDK marker so legacy fully overwrites
   * Profile — used by the "Merge (overwrite)" path.
   *
   * Always swaps the active providers to Profile when the migration
   * succeeds, regardless of the prior mode.
   */
  runLegacyToProfileMigration: (opts?: { force?: boolean }) => Promise<void>;
  /**
   * Re-run `hasLegacyData` / `hasProfileData` probes. Call after a
   * mode switch / migration / token receive to refresh the banner UI.
   */
  refreshDataProbes: () => Promise<void>;
}

export interface CreateWalletOptions {
  nametag?: string;
}

export interface ImportWalletOptions {
  nametag?: string;
}

export interface ImportFromFileOptions {
  fileContent: string | Uint8Array;
  fileName: string;
  password?: string;
  nametag?: string;
}

export interface ImportFromFileResult {
  success: boolean;
  sphere?: Sphere;
  mnemonic?: string;
  needsPassword?: boolean;
  error?: string;
}

export const SphereContext = createContext<SphereContextValue | null>(null);
