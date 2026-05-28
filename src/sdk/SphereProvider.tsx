import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Sphere, TokenRegistry, NETWORKS, logger, isSphereError } from '@unicitylabs/sphere-sdk';
import { sendWelcomeDM } from './welcomeDM';
import type { InitProgress, NetworkType, FullIdentity } from '@unicitylabs/sphere-sdk';
import { getErrorMessage } from './errors';
import {
  createBrowserProviders,
  IndexedDBTokenStorageProvider,
  type BrowserProviders,
} from '@unicitylabs/sphere-sdk/impl/browser';
import {
  createBrowserProfileProviders,
  createBrowserProfileProvidersFromSphere,
  type BrowserProfileProviders,
} from '@unicitylabs/sphere-sdk/profile/browser';
import { IS_UXF_BUILD } from '../config/uxf';
import { runProfileMigration } from './uxfProfileMigration';
import { hasMaterialContent } from './utils/tokenStorageProbe';
import { SphereContext } from './SphereContext';
import type { WalletMode } from './SphereContext';

const COINGECKO_BASE_URL = import.meta.env.DEV
  ? '/coingecko'
  : 'https://api.coingecko.com/api/v3';
import type {
  SphereContextValue,
  CreateWalletOptions,
  ImportWalletOptions,
  ImportFromFileOptions,
  ImportFromFileResult,
} from './SphereContext';
import { clearAllSphereData, STORAGE_KEYS } from '../config/storageKeys';
import { migrateApprovedSessions } from '../utils/connected-sites';

// One-time migration from old approved sessions format (idempotent)
migrateApprovedSessions();

// SDK debug logging: off by default, opt-in via console commands.
// Print hint in dev mode so developers know how to enable it.
if (import.meta.env.DEV) {
  console.log(
    '%c[Sphere SDK] Debug logging is off. Enable with:%c\n' +
    '  logger.configure({ debug: true })          — all tags\n' +
    '  logger.setTagDebug("Nostr", true)           — Nostr only\n' +
    '  logger.setTagDebug("Payments", true)         — Payments only\n' +
    '  logger.setTagDebug("IndexedDB", true)        — IndexedDB only\n' +
    '  logger.setTagDebug("Aggregator", true)       — Aggregator only\n' +
    'Available: Nostr, Payments, IndexedDB, IndexedDBToken, LocalStorage, Aggregator, Price, Market, SphereProvider',
    'color: #888; font-weight: bold',
    'color: #888',
  );
  // Expose logger on window for easy console access
  (window as unknown as Record<string, unknown>).logger = logger;
}

function isIpfsEnabled(): boolean {
  const stored = localStorage.getItem(STORAGE_KEYS.IPFS_ENABLED);
  return stored !== 'false'; // enabled by default
}

function getIpfsConfig() {
  if (!isIpfsEnabled()) return {};
  return {
    tokenSync: {
      ipfs: {
        enabled: true,
      },
    },
  };
}

/**
 * Read the dev-mode aggregator override (set from the console or the
 * header chip). Returns a partial oracle config that callers spread
 * into `createBrowserProviders({ ..., oracle: ... })`.
 *
 *   - `DEV_AGGREGATOR_URL`     → overrides the aggregator JSON-RPC URL.
 *   - `DEV_SKIP_TRUST_BASE`    → bypasses trust-base verification. ONLY
 *     useful when the user is pointing at a locally-bootstrapped
 *     aggregator whose trust base does not match the compiled-in
 *     `assets/trustbase.ts`.
 *
 * Returns `undefined` (caller omits the `oracle` key) when neither
 * key is set, so the normal per-network defaults apply.
 *
 * @see STORAGE_KEYS.DEV_AGGREGATOR_URL
 * @see STORAGE_KEYS.DEV_SKIP_TRUST_BASE
 */
function getDevOracleOverride():
  | { url?: string; skipVerification?: boolean }
  | undefined {
  const url = localStorage.getItem(STORAGE_KEYS.DEV_AGGREGATOR_URL);
  const skipTrustBase =
    localStorage.getItem(STORAGE_KEYS.DEV_SKIP_TRUST_BASE) === 'true';
  if (!url && !skipTrustBase) return undefined;
  const override: { url?: string; skipVerification?: boolean } = {};
  if (url) override.url = url;
  if (skipTrustBase) override.skipVerification = true;
  return override;
}

/**
 * Install a small `window.sphereDev` namespace exposing one-line
 * helpers so the dev override is reachable from the browser console
 * without users having to remember the exact localStorage keys.
 *
 * Idempotent — re-running on hot-reload or remount overwrites the
 * same shape with the same closure (re-binds `reinitialize` to the
 * latest version, which is what users want after a fast-refresh).
 *
 * Usage from console:
 *
 *   sphereDev.setAggregator('http://127.0.0.1:11003')   // override + reload
 *   sphereDev.setAggregator(null)                       // clear override + reload
 *   sphereDev.setSkipTrustBase(true)                    // dev-only — bypass verify
 *   sphereDev.show()                                    // print current state
 */
function installDevConsoleHelpers(triggerReinit: () => void): void {
  if (typeof window === 'undefined') return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).sphereDev = {
    setAggregator(url: string | null): void {
      if (url === null) {
        localStorage.removeItem(STORAGE_KEYS.DEV_AGGREGATOR_URL);
      } else {
        localStorage.setItem(STORAGE_KEYS.DEV_AGGREGATOR_URL, url);
      }
      window.dispatchEvent(new Event('dev-config-changed'));
      triggerReinit();
    },
    setSkipTrustBase(enabled: boolean): void {
      if (enabled) {
        localStorage.setItem(STORAGE_KEYS.DEV_SKIP_TRUST_BASE, 'true');
      } else {
        localStorage.removeItem(STORAGE_KEYS.DEV_SKIP_TRUST_BASE);
      }
      window.dispatchEvent(new Event('dev-config-changed'));
      triggerReinit();
    },
    show(): { aggregatorUrl: string | null; skipTrustBase: boolean } {
      const state = {
        aggregatorUrl: localStorage.getItem(STORAGE_KEYS.DEV_AGGREGATOR_URL),
        skipTrustBase:
          localStorage.getItem(STORAGE_KEYS.DEV_SKIP_TRUST_BASE) === 'true',
      };
      console.log('[sphereDev]', state);
      return state;
    },
  };
}

/**
 * Read sticky wallet-mode preference from localStorage.
 *
 * Returns `null` when the user has not yet expressed a preference (boot
 * follows the default — currently legacy with first-boot UXF migration
 * under `IS_UXF_BUILD`).
 *
 * Cross-tab: this is intentionally not reactive — reads happen at boot
 * + each manual reinitialize() / switchWalletMode call. We do NOT
 * subscribe to localStorage events because a cross-tab mode flip would
 * tear down this tab's Sphere mid-operation; the user must manually
 * reload to pick up the other tab's preference change.
 */
function readWalletModePreference(): WalletMode | null {
  const v = localStorage.getItem(STORAGE_KEYS.WALLET_MODE_PREFERENCE);
  if (v === 'legacy' || v === 'profile') return v;
  return null;
}

function writeWalletModePreference(mode: WalletMode): void {
  localStorage.setItem(STORAGE_KEYS.WALLET_MODE_PREFERENCE, mode);
}

// =============================================================================
// Shared helpers (pure functions, no React state)
// =============================================================================

/** Disconnect transport so SDK can reconnect with the real identity */
async function disconnectTransport(providers: BrowserProviders): Promise<void> {
  if (providers.transport.isConnected()) {
    await providers.transport.disconnect();
  }
}

/** Add IPFS storage provider and trigger initial sync (fire-and-forget) */
function setupIpfsSync(instance: Sphere, providers: BrowserProviders): void {
  if (providers.ipfsTokenStorage) {
    instance.addTokenStorageProvider(providers.ipfsTokenStorage)
      .then(() => instance.sync())
      .catch(err => logger.warn('SphereProvider', 'IPFS sync failed', err));
  }
}

/** Clean up persisted wallet data on creation/import failure */
async function cleanupOnError(providers: BrowserProviders): Promise<void> {
  const clearDone = Sphere.clear({
    storage: providers.storage,
    tokenStorage: providers.tokenStorage,
  });
  await Promise.race([clearDone, new Promise(r => setTimeout(r, 3000))]);
}

/**
 * Construct a temporary, standalone `IndexedDBTokenStorageProvider`
 * for cross-mode legacy-data probing. Caller MUST `disconnect()` after
 * the load() call returns.
 *
 * Why a fresh instance: when we're currently running in Profile mode,
 * `providers.tokenStorage` is the Profile provider — but we still need
 * to look at the *legacy* IndexedDB tables to decide whether the
 * banner should offer a "Merge Legacy → UXF" button. The legacy
 * provider is stateless across instances (it talks to IndexedDB by
 * name), so we can instantiate one ad-hoc.
 */
async function probeLegacyTokenData(identity: FullIdentity): Promise<boolean> {
  const probe = new IndexedDBTokenStorageProvider();
  try {
    probe.setIdentity(identity);
    const ok = await probe.initialize();
    if (!ok) return false;
    const snap = await probe.load();
    if (!snap.success || !snap.data) return false;
    return hasMaterialContent(snap.data as Record<string, unknown>);
  } catch (err) {
    logger.warn('SphereProvider', 'probeLegacyTokenData failed', err);
    return false;
  } finally {
    try { await probe.disconnect(); } catch { /* ignore */ }
  }
}

/**
 * Probe Profile token storage for material content. Uses
 * `createBrowserProfileProvidersFromSphere` (sphere-sdk #294) so the
 * Profile providers' encryption key is correctly derived from the
 * Sphere's INTERNAL `_identity.privateKey` — the private key never
 * crosses the SDK boundary; this consumer holds no key material.
 *
 * Caller MUST disconnect via the helper's own cleanup path (this
 * function handles it).
 *
 * Returns `false` (not `null`) on any error — the banner reads this as
 * "no Profile data" which is the safe default (it only enables the
 * "Switch to UXF Profile" action; the user can still try the migrate
 * path if they think there's data we missed).
 *
 * Pre-#294 history: this used to take a synthesized `FullIdentity`
 * with `privateKey: ''` and the documented limitation was that the
 * probe could not decrypt Profile data written under the real key.
 * That limitation is removed.
 */
async function probeProfileTokenData(
  sphere: Sphere,
  network: NetworkType,
  oracle: BrowserProviders['oracle'],
): Promise<boolean> {
  let profile: BrowserProfileProviders | null = null;
  try {
    // KNOWN COST: when the active sphere is already on Profile mode, a
    // probe spins up a SECOND Helia + OrbitDB instance against the
    // same underlying IndexedDB databases. OrbitDB supports
    // multi-process attach (content-addressed) so this is safe, but
    // the spin-up cost (~500ms-1s) shows up as the banner "(checking
    // stores…)" hint. A future optimization could skip this probe
    // when `walletMode === 'profile'` AND the active sphere already
    // reports tokens — but identity-bound probing keeps the code path
    // symmetric and avoids subtle aliasing bugs across React state
    // updates.
    // Cast through `unknown` to bridge the tsup-bundle Sphere class
    // duplication (`dist/index.d.ts` vs `dist/profile/browser.d.ts`).
    // Same runtime class; documented in CLAUDE.md.
    profile = await createBrowserProfileProvidersFromSphere(
      sphere as unknown as Parameters<typeof createBrowserProfileProvidersFromSphere>[0],
      { network, oracle },
    );
    const snap = await profile.tokenStorage.load();
    if (!snap.success || !snap.data) return false;
    return hasMaterialContent(snap.data as unknown as Record<string, unknown>);
  } catch (err) {
    logger.warn('SphereProvider', 'probeProfileTokenData failed', err);
    return false;
  } finally {
    if (profile) {
      try { await profile.tokenStorage.disconnect(); } catch { /* ignore */ }
      try { await profile.storage.disconnect(); } catch { /* ignore */ }
    }
  }
}

/**
 * Synthesize a `FullIdentity` from `sphere.identity` for the LEGACY
 * IndexedDB token-storage probe (`probeLegacyTokenData`). That probe
 * only needs `directAddress` to compute the DB name — the legacy
 * provider's `setIdentity()` does not dereference `privateKey` at all.
 *
 * The Profile token-storage probe NO LONGER uses this helper — it
 * takes the live Sphere directly via
 * `createBrowserProfileProvidersFromSphere`, so the private key never
 * crosses the SDK boundary on that path. (See `probeProfileTokenData`.)
 */
function probeIdentityFromSphere(sphere: Sphere): FullIdentity | null {
  const id = sphere.identity;
  if (!id || !id.directAddress) return null;
  return {
    ...id,
    privateKey: '',
  } as FullIdentity;
}

// =============================================================================
// Provider component
// =============================================================================

interface SphereProviderProps {
  children: ReactNode;
  network?: NetworkType;
}

export function SphereProvider({
  children,
  network = 'testnet',
}: SphereProviderProps) {
  const queryClient = useQueryClient();
  const [sphere, setSphere] = useState<Sphere | null>(null);
  const [providers, setProvidersRaw] = useState<BrowserProviders | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [walletExists, setWalletExists] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [ipfsEnabled, setIpfsEnabled] = useState(isIpfsEnabled);
  const [isDiscoveringAddresses, setIsDiscoveringAddresses] = useState(false);
  const [initProgress, setInitProgress] = useState<InitProgress | null>(null);
  const [walletMode, setWalletMode] = useState<WalletMode>(() => {
    // Initial guess: prefer the persisted preference; otherwise legacy
    // (legacy is the SDK default and matches the pre-UXF-build behavior).
    return readWalletModePreference() ?? 'legacy';
  });
  const [hasLegacyData, setHasLegacyData] = useState<boolean | null>(null);
  const [hasProfileData, setHasProfileData] = useState<boolean | null>(null);
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);
  const sphereRef = useRef<Sphere | null>(null);
  /**
   * Ref-mirror of the latest `providers` for callbacks that need to
   * read the current value *without* recreating themselves on every
   * provider swap (e.g. `runProbes`). Updated synchronously inside
   * `setProviders()` below so a callback fired in the SAME tick as
   * the state write sees the new value (React state itself wouldn't
   * propagate until the next commit).
   */
  const providersRef = useRef<BrowserProviders | null>(null);
  /**
   * Wrapper that updates both the ref AND the React state for
   * `providers`. Always use this instead of `setProvidersRaw`.
   */
  const setProviders = useCallback((next: BrowserProviders | null) => {
    providersRef.current = next;
    setProvidersRaw(next);
  }, []);
  /**
   * Sequence counter — bumped on every initialize() / mode-switch. Used
   * to discard probe-write races: if a probe completes AFTER a newer
   * mode change started, its setHasLegacyData / setHasProfileData writes
   * are dropped. Without this, a slow probe from the previous mode can
   * land on top of fresh data from the new mode.
   */
  const initSeqRef = useRef(0);

  /**
   * Boot-time data-presence probes. Must be called AFTER `sphereRef`
   * is populated so we have an identity to scope the probes.
   *
   * Probes run in parallel + tolerate errors — a failed probe leaves
   * the previous value in place. Idempotent.
   */
  const runProbes = useCallback(async (instance: Sphere) => {
    const seq = initSeqRef.current;
    const id = probeIdentityFromSphere(instance);
    if (!id) {
      logger.debug('SphereProvider', 'runProbes: no identity yet — skipping');
      return;
    }
    // Read providers + oracle from the ref (synchronous mirror of
    // latest `providers`) rather than the closure-captured `providers`
    // state. The state can be stale during the very first boot:
    // `setProviders` is called inside `initialize()` and React
    // batches the update until after the callback returns, so a
    // closure that captured the previous (`null`) value would skip
    // the Profile probe entirely.
    const liveProviders = providersRef.current ?? providers;
    const oracle = liveProviders?.oracle;

    // Probe choice — use the live `liveProviders.tokenStorage` when
    // it's the SAME backend we're probing. Cross-mode probes use the
    // dedicated helpers:
    //   - `probeLegacyTokenData(id)` — legacy IndexedDB only reads
    //     `directAddress` to compute the DB name; no Sphere binding
    //     needed.
    //   - `probeProfileTokenData(instance, ...)` — post sphere-sdk #294
    //     this takes the LIVE Sphere instance and routes through
    //     `createBrowserProfileProvidersFromSphere`, so the Profile
    //     providers' encryption key is correctly derived. Encrypted
    //     Profile data written by another mode is now readable.
    //
    // The SDK's ProfileTokenStorageProvider exposes `id === 'profile-token'`
    // (NOT 'profile-token-storage' — that's the user-facing name).
    // Legacy is 'indexeddb-token-storage'. We key off `id` to avoid
    // instanceof-against-imported-class issues across tsup bundle
    // boundaries.
    const inProfileMode = (
      liveProviders?.tokenStorage as { id?: string } | undefined
    )?.id === 'profile-token';

    const legacyP: Promise<boolean | null> = inProfileMode
      ? probeLegacyTokenData(id).catch((err) => {
          logger.warn('SphereProvider', 'probeLegacyTokenData failed', err);
          return null;
        })
      : (async () => {
          try {
            const snap = await liveProviders?.tokenStorage.load();
            if (!snap?.success || !snap.data) return false;
            return hasMaterialContent(snap.data as unknown as Record<string, unknown>);
          } catch (err) {
            logger.warn('SphereProvider', 'live legacy probe failed', err);
            return null;
          }
        })();

    const profileP: Promise<boolean | null> = !oracle
      ? Promise.resolve(false)
      : inProfileMode
        ? (async () => {
            try {
              const snap = await liveProviders?.tokenStorage.load();
              if (!snap?.success || !snap.data) return false;
              return hasMaterialContent(snap.data as unknown as Record<string, unknown>);
            } catch (err) {
              logger.warn('SphereProvider', 'live profile probe failed', err);
              return null;
            }
          })()
        : probeProfileTokenData(instance, network, oracle).catch((err) => {
            logger.warn('SphereProvider', 'probeProfileTokenData failed', err);
            return null;
          });

    const [legacy, profile] = await Promise.all([legacyP, profileP]);

    if (seq !== initSeqRef.current) {
      // A newer initialize / mode-switch started — drop these results.
      logger.debug('SphereProvider', 'runProbes: discarded stale result', { seq, current: initSeqRef.current });
      return;
    }

    if (legacy !== null) setHasLegacyData(legacy);
    if (profile !== null) setHasProfileData(profile);
  }, [network, providers]);

  const initialize = useCallback(async (attempt = 0, skipLoading = false) => {
    try {
      initSeqRef.current += 1;
      // Destroy previous instance to release IndexedDB connections
      if (sphereRef.current) {
        await sphereRef.current.destroy();
        sphereRef.current = null;
      }

      if (!skipLoading) setIsLoading(true);
      setError(null);

      // Dev-mode oracle override (custom aggregator URL / skip-trust-base).
      // Set via `sphereDev.setAggregator(...)` from the console, or via
      // localStorage keys `sphere_dev_aggregator_url` / `sphere_dev_skip_trust_base`.
      // Header chip in `Header.tsx` reflects the active state.
      const devOracleOverride = getDevOracleOverride();
      if (devOracleOverride) {
        logger.info(
          'SphereProvider',
          `Dev-mode oracle override active: ` +
            `url=${devOracleOverride.url ?? '<network default>'} ` +
            `skipVerification=${devOracleOverride.skipVerification ?? false}`,
        );
      }

      const browserProviders = createBrowserProviders({
        network,
        price: { platform: 'coingecko', baseUrl: COINGECKO_BASE_URL, cacheTtlMs: 5 * 60_000 },
        groupChat: true,
        market: true,
        ...(devOracleOverride ? { oracle: devOracleOverride } : {}),
        ...getIpfsConfig(),
      });
      // Debug logging is off by default; enable at runtime via: logger.configure({ debug: true })
      setProviders(browserProviders);

      // Configure our bundle's TokenRegistry singleton — the SDK configures
      // its own internal copy during Sphere.init(), but due to separate
      // bundle entry points the singleton we import is a different instance.
      const netConfig = NETWORKS[network] ?? NETWORKS.testnet;
      TokenRegistry.configure({
        remoteUrl: netConfig.tokenRegistryUrl,
        storage: browserProviders.storage,
      });

      // `Sphere.exists()` probes for wallet keys (mnemonic / masterKey)
      // in the storage's underlying KV. Note: under UXF mode, the
      // Profile-backed ProfileStorageProvider's local cache shares the
      // SAME `sphere-storage` IndexedDB as the legacy
      // `IndexedDBStorageProvider` (see sphere-sdk
      // profile/browser.ts createBrowserProfileProviders → uses
      // `createIndexedDBStorageProvider()` for the local cache). That
      // means a wallet created FRESH under Profile on a previous boot
      // also shows up via `Sphere.exists(legacyStorage)` on the next
      // boot — no separate Profile-storage probe needed.
      const exists = await Sphere.exists(browserProviders.storage);
      setWalletExists(exists);

      // Pre-compute the boot-time mode preference. The default for
      // IS_UXF_BUILD wallets is Profile (the first-boot migration
      // landed there), but if the user has explicitly switched back to
      // legacy via the banner, honor that. For non-UXF builds, always
      // legacy.
      const preferredMode: WalletMode = (() => {
        if (!IS_UXF_BUILD) return 'legacy';
        const persisted = readWalletModePreference();
        if (persisted) return persisted;
        return 'profile';
      })();

      if (exists) {
        setInitProgress({ step: 'initializing', message: 'Loading wallet...' });
        let { sphere: instance } = await Sphere.init({
          ...browserProviders,
          l1: {},
          discoverAddresses: false, // Run separately below for UX
          onProgress: setInitProgress,
        });

        // UXF Profile mode + safe migration (re-entry-safe).
        //
        // When IS_UXF_BUILD AND the preferred mode is Profile: try to
        // migrate legacy tokens into Profile-backed storage (OrbitDB +
        // aggregator pointer). The helper is idempotent — on
        // subsequent loads the marker short-circuits the full work, so
        // this is a one-shot per wallet. On success we swap providers
        // and re-init Sphere; on failure we keep the legacy instance
        // running so the user sees their balance (DO NOT strand the
        // wallet).
        //
        // For wallets created FRESH under Profile (no legacy token
        // data exists), the migration helper's source.load() returns
        // an empty snapshot, target.save() is a no-op write, and the
        // marker is stamped — making the second boot's call a fast
        // marker-skip. This is safe and idempotent.
        //
        // If the user has chosen `legacy` via the banner (persisted in
        // localStorage), we skip the migration AND stay in legacy
        // mode. The banner will surface "Switch to UXF Profile" + (if
        // Profile data exists) "Merge" buttons in this state.
        if (IS_UXF_BUILD && preferredMode === 'profile') {
          const profileResult = await runProfileMigration({
            legacyProviders: browserProviders,
            sphere: instance,
            network,
            setInitProgress,
          });
          if (profileResult) {
            // Migration succeeded (or marker said it already had). Swap
            // tokenStorage + storage to the Profile-backed versions and
            // delete `ipfsTokenStorage` so `setupIpfsSync` becomes a
            // no-op — Profile's OrbitDB replication is the wallet-sync
            // path now; keeping the legacy IPNS provider on top would
            // create a redundant + deprecated sync backend.
            //
            // `force: true` skips the legacy provider's awaitNextFlush
            // gate. The legacy Sphere instance only read identity — no
            // writes are queued — and we're discarding its providers
            // anyway. A slow IPNS-pin flush here would otherwise block
            // the migration for 30s+.
            await instance.destroy({ force: true, reason: 'uxf-profile-swap' });
            sphereRef.current = null;
            // sphere-sdk #309 — preserve the legacy storage reference
            // before swapping in the Profile storage. We pass it to the
            // next `Sphere.init({ fallbackStorage: ... })` so identity
            // reads can fall back to the still-intact legacy IndexedDB
            // when the Profile/OrbitDB read fails (missing local Helia
            // block, OpLog head unreachable, etc.). Without this, a
            // wallet whose Profile state has lost a block is locked out
            // even though the encrypted-with-password identity material
            // is still sitting at `sphere_master_key` in `sphere-storage`.
            const legacyStorageForFallback = browserProviders.storage;
            browserProviders.storage = profileResult.profileStorage;
            browserProviders.tokenStorage = profileResult.profileTokenStorage;
            delete browserProviders.ipfsTokenStorage;
            setProviders({ ...browserProviders });

            // Re-point TokenRegistry's persistent cache at Profile
            // storage. The earlier `TokenRegistry.configure(...)` call
            // captured the now-discarded legacy storage handle; without
            // this re-configure, cache writes would silently target a
            // disconnected provider.
            TokenRegistry.configure({
              remoteUrl: netConfig.tokenRegistryUrl,
              storage: browserProviders.storage,
            });

            // Re-init Sphere with the swapped providers. Token data is
            // already in Profile storage; init reads it from there.
            // `fallbackStorage` is the still-intact legacy IndexedDB
            // (see comment above the swap) — sphere-sdk #309.
            setInitProgress({ step: 'initializing', message: 'Loading Profile storage…' });
            const reinit = await Sphere.init({
              ...browserProviders,
              fallbackStorage: legacyStorageForFallback,
              l1: {},
              discoverAddresses: false,
              onProgress: setInitProgress,
            });
            instance = reinit.sphere;
            setWalletMode('profile');
            // Persist the mode so this boot's choice survives a reload.
            writeWalletModePreference('profile');
          } else {
            // Migration failure — keep legacy mode. The user can retry
            // via the banner.
            setWalletMode('legacy');
          }
          // On migration failure, `instance` remains the legacy-backed
          // Sphere — user keeps their balance, no swap happens.
        } else {
          setWalletMode('legacy');
        }

        setupIpfsSync(instance, browserProviders);
        setInitProgress(null);
        sphereRef.current = instance;
        setSphere(instance);
        // Send welcome DMs after relay delivers historical messages (EOSE)
        {
          let welcomed = false;
          const trigger = () => {
            if (welcomed) return;
            welcomed = true;
            sendWelcomeDM(instance);
          };
          const unsubReady = instance.on("communications:ready", () => { unsubReady(); trigger(); });
          // Fallback if EOSE never fires (relay issues)
          setTimeout(() => { unsubReady(); trigger(); }, 20000);
        }

        // Run probes in background — surface in banner via state.
        runProbes(instance).catch((err) => {
          logger.warn('SphereProvider', 'initial runProbes failed', err);
        });

        // Run address discovery in background after wallet is visible
        setIsDiscoveringAddresses(true);
        instance.discoverAddresses({ autoTrack: true, includeL1Scan: false }).then(result => {
          if (result.addresses.length > 0) {
            logger.debug('SphereProvider', `Discovered ${result.addresses.length} address(es)`);
          }
        }).catch(err => {
          logger.warn('SphereProvider', 'Address discovery failed', err);
        }).finally(() => {
          setIsDiscoveringAddresses(false);
        });
      } else {
        // Fresh wallet path — no existing legacy data, so no migration is
        // needed. When IS_UXF_BUILD AND the preferred mode is Profile,
        // swap to Profile-backed providers preemptively so the
        // subsequent createWallet()/importWallet() call writes directly
        // into Profile storage.
        //
        // DECISION (post sphere-sdk #294): we keep
        // `createBrowserProfileProviders` (no-identity factory) here.
        // The Sphere-bound variant `createBrowserProfileProvidersFromSphere`
        // requires a LIVE Sphere instance, but there is none at this
        // point — the providers are needed BEFORE `Sphere.init()` runs
        // (so `Sphere.init` can attach identity itself via the standard
        // `setIdentity()` hook). The no-identity factory is a public,
        // architecturally-sound API for this case; identity is bound
        // later by the SDK with the REAL key in scope.
        if (IS_UXF_BUILD && preferredMode === 'profile') {
          const profile = createBrowserProfileProviders({
            network,
            oracle: browserProviders.oracle,
          });
          browserProviders.storage = profile.storage;
          browserProviders.tokenStorage = profile.tokenStorage;
          // Drop legacy IPNS-based wallet sync — Profile's OrbitDB
          // replication handles cross-device sync now. `setupIpfsSync`
          // guards on `ipfsTokenStorage`, so deleting it makes the call
          // a safe no-op.
          delete browserProviders.ipfsTokenStorage;
          setProviders({ ...browserProviders });

          // Re-point TokenRegistry at Profile storage (see comment in
          // the exists branch above).
          TokenRegistry.configure({
            remoteUrl: netConfig.tokenRegistryUrl,
            storage: browserProviders.storage,
          });
          setWalletMode('profile');
        } else {
          setWalletMode('legacy');
        }

        // Pre-connect transport for nametag lookups during onboarding
        const transport = browserProviders.transport;
        await transport.connect();
        transport.setIdentity({
          privateKey: '0000000000000000000000000000000000000000000000000000000000000001',
          chainPubkey: '000000000000000000000000000000000000000000000000000000000000000000',
          l1Address: '',
        });
      }
    } catch (err) {
      // IndexedDB may be temporarily blocked after database deletion.
      // Retry once after a short delay before giving up.
      if (isSphereError(err) && err.code === 'STORAGE_ERROR' && attempt < 1) {
        logger.warn('SphereProvider', 'Storage error, retrying in 1s...', err);
        await new Promise(r => setTimeout(r, 1000));
        return initialize(attempt + 1, skipLoading);
      }

      logger.error('SphereProvider', 'Initialization failed', err);
      setError(err instanceof Error ? err : new Error(getErrorMessage(err)));
    } finally {
      setInitProgress(null);
      setIsLoading(false);
    }
  }, [network, runProbes, setProviders]);

  // Stable ref so the boot-time effect only fires once per `network`
  // change. Without this, the effect would re-run whenever `walletMode`
  // / `runProbes` change (which happens inside `initialize()` itself —
  // self-trigger loop).
  const initializeRef = useRef(initialize);
  initializeRef.current = initialize;

  useEffect(() => {
    initializeRef.current();
    return () => {
      // Cleanup on unmount
      sphereRef.current?.destroy();
      sphereRef.current = null;
    };
  }, [network]);

  // Dev-mode oracle override: install the `window.sphereDev` helper so
  // users can flip the aggregator URL / skip-trust-base flag from the
  // browser console without remembering the localStorage keys, and
  // subscribe to `dev-config-changed` so the existing header chip
  // (which dispatches that event on Reset) re-initializes the wallet
  // automatically. Mount-only — `installDevConsoleHelpers` re-binds
  // the trigger to the latest `initializeRef.current` closure on each
  // call, so reinitialize always runs the freshest init logic.
  useEffect(() => {
    const triggerReinit = () => {
      void initializeRef.current();
    };
    installDevConsoleHelpers(triggerReinit);
    const handler = () => triggerReinit();
    window.addEventListener('dev-config-changed', handler);
    // One-time hint on first mount in dev mode so users discover the
    // override path without digging through code. Production builds
    // can still use it; they just don't get the hint banner.
    if (import.meta.env.DEV) {
      console.log(
        '%c[sphereDev]%c custom aggregator helpers loaded.\n' +
          '  sphereDev.setAggregator("http://127.0.0.1:11003")  // override + reload providers\n' +
          '  sphereDev.setAggregator(null)                       // clear override\n' +
          '  sphereDev.setSkipTrustBase(true)                    // dev-only — bypass trust-base verify\n' +
          '  sphereDev.show()                                    // print current state',
        'color: #f59e0b; font-weight: bold',
        'color: #888',
      );
    }
    return () => {
      window.removeEventListener('dev-config-changed', handler);
    };
  }, []);

  const createWallet = useCallback(
    async (options?: CreateWalletOptions) => {
      if (!providers) throw new Error('Providers not initialized');
      await disconnectTransport(providers);

      try {
        setInitProgress({ step: 'initializing', message: 'Creating wallet...' });
        const { sphere: instance, generatedMnemonic } = await Sphere.init({
          ...providers,
          autoGenerate: true,
          nametag: options?.nametag,
          l1: {},
          onProgress: setInitProgress,
        });
        setInitProgress(null);

        if (!generatedMnemonic) {
          throw new Error('Failed to generate mnemonic');
        }

        // Don't set walletExists/sphere here — let finalizeWallet() handle it
        // so the onboarding flow can show the completion screen first.
        return { mnemonic: generatedMnemonic, sphere: instance };
      } catch (err) {
        setInitProgress(null);
        await cleanupOnError(providers);
        sphereRef.current = null;
        setSphere(null);
        setWalletExists(false);
        throw err;
      }
    },
    [providers],
  );

  const resolveNametag = useCallback(
    async (nametag: string) => {
      if (!providers) throw new Error('Providers not initialized');

      const transport = providers.transport;

      // Connect transport if not already connected (needed before wallet exists).
      // Retry once on failure — relay may need a moment after page load.
      if (!transport.isConnected()) {
        try {
          await transport.connect();
        } catch {
          // Wait briefly and retry once
          await new Promise(r => setTimeout(r, 1000));
          await transport.connect();
        }
        // Set dummy identity for read-only queries (resolveNametagInfo only queries, never signs)
        await transport.setIdentity({
          privateKey: '0000000000000000000000000000000000000000000000000000000000000001',
          chainPubkey: '000000000000000000000000000000000000000000000000000000000000000000',
          l1Address: '',
        });
      }

      const info = await transport.resolveNametagInfo?.(nametag);
      return info ?? null;
    },
    [providers],
  );

  const importWallet = useCallback(
    async (mnemonic: string, options?: ImportWalletOptions): Promise<Sphere> => {
      if (!providers) throw new Error('Providers not initialized');
      await disconnectTransport(providers);

      setInitProgress({ step: 'initializing', message: 'Importing wallet...' });
      const instance = await Sphere.import({
        ...providers,
        mnemonic,
        nametag: options?.nametag,
        l1: {},
        onProgress: setInitProgress,
      });
      setInitProgress(null);

      // Don't setSphere/setWalletExists here — the onboarding flow calls
      // finalizeWallet(sphere) after address selection / nametag are done.
      return instance;
    },
    [providers],
  );

  const importFromFile = useCallback(
    async (options: ImportFromFileOptions): Promise<ImportFromFileResult> => {
      if (!providers) throw new Error('Providers not initialized');
      await disconnectTransport(providers);

      try {
        setInitProgress({ step: 'initializing', message: 'Importing file...' });
        const result = await Sphere.importFromLegacyFile({
          ...providers,
          fileContent: options.fileContent,
          fileName: options.fileName,
          password: options.password,
          nametag: options.nametag,
          l1: {},
          onProgress: setInitProgress,
        });
        setInitProgress(null);

        // Don't setSphere here — the onboarding flow calls finalizeWallet(sphere)
        // after address selection / nametag are done.
        return {
          success: result.success,
          sphere: result.sphere,
          mnemonic: result.mnemonic,
          needsPassword: result.needsPassword,
          error: result.error,
        };
      } catch (err) {
        setInitProgress(null);
        await cleanupOnError(providers);
        sphereRef.current = null;
        setSphere(null);
        setWalletExists(false);
        return {
          success: false,
          error: getErrorMessage(err),
        };
      }
    },
    [providers],
  );

  const deleteWallet = useCallback(async () => {
    // Notify connected dApps before destroying — ConnectPage/IframeAgent listen for this
    window.dispatchEvent(new CustomEvent('sphere:wallet-logout'));

    // Destroy sphere to close SDK connections (Nostr, IndexedDB handles, etc.)
    if (sphereRef.current) {
      await sphereRef.current.destroy();
      sphereRef.current = null;
    }

    // Clear all SDK-owned data (wallet keys, tokens, DMs, etc.) from IndexedDB.
    // Sphere.clear() handles reconnecting storage internally, so we just
    // disconnect first to release stale handles.
    if (providers) {
      await Promise.allSettled([
        providers.storage.disconnect(),
        providers.tokenStorage.disconnect(),
      ]);
      try {
        await Sphere.clear({
          storage: providers.storage,
          tokenStorage: providers.tokenStorage,
        });
      } catch (err) {
        logger.warn('SphereProvider', 'Sphere.clear() failed, deleting IndexedDB directly', err);
        // Fallback: nuke the IndexedDB databases directly
        for (const dbName of ['sphere-storage', 'sphere-token-storage']) {
          try { indexedDB.deleteDatabase(dbName); } catch { /* best effort */ }
        }
      }
    }

    // Clear localStorage regardless of whether DB deletion succeeded.
    clearAllSphereData();

    // Clear all React Query caches so stale data doesn't leak to new wallet
    queryClient.clear();

    // Reset React state
    setSphere(null);
    setWalletExists(false);
    setError(null);
    setHasLegacyData(null);
    setHasProfileData(null);

    // Reinitialize with fresh providers (skip loading spinner — onboarding UI is already visible)
    await initialize(0, true);
  }, [providers, initialize, queryClient]);

  const finalizeWallet = useCallback((importedSphere?: Sphere) => {
    if (importedSphere) {
      if (providers) setupIpfsSync(importedSphere, providers);
      sphereRef.current = importedSphere;
      setSphere(importedSphere);
      sendWelcomeDM(importedSphere);
      // Kick off boot probes for the new wallet — otherwise the banner
      // would be stuck in "(checking stores…)" forever on fresh-wallet
      // create/import flows.
      runProbes(importedSphere).catch((err) => {
        logger.warn('SphereProvider', 'finalizeWallet runProbes failed', err);
      });
    }
    setWalletExists(true);
  }, [providers, runProbes]);

  const toggleIpfs = useCallback(() => {
    const next = !isIpfsEnabled();
    localStorage.setItem(STORAGE_KEYS.IPFS_ENABLED, String(next));
    setIpfsEnabled(next);
    // Reinitialize so the new IPFS setting takes effect
    initialize();
  }, [initialize]);

  // ── Wallet-mode controls ─────────────────────────────────────────────

  /**
   * Refresh the legacy/profile data-presence probes for the current
   * identity. Safe to call at any time after `sphere` is set.
   */
  const refreshDataProbes = useCallback(async () => {
    const instance = sphereRef.current;
    if (!instance) return;
    await runProbes(instance);
  }, [runProbes]);

  /**
   * Switch the active wallet token-storage backend. Persists the user
   * preference + re-runs initialize() to swap providers cleanly.
   *
   * This does NOT copy data between stores — for that the user must
   * explicitly invoke {@link runLegacyToProfileMigration}.
   *
   * Failure semantics: if the post-swap initialize() throws, we keep
   * the previous mode preference written so the user can manually
   * reload. We surface the error via `error` state.
   */
  const switchWalletMode = useCallback(async (target: WalletMode) => {
    if (isSwitchingMode) {
      logger.warn('SphereProvider', 'switchWalletMode: already switching — ignoring');
      return;
    }
    if (target === walletMode) {
      logger.debug('SphereProvider', `switchWalletMode: already in ${target}`);
      return;
    }
    setIsSwitchingMode(true);
    // Remember the previous preference so we can roll back on failure
    // (defensive — see comment below).
    const previousPreference = readWalletModePreference();
    try {
      writeWalletModePreference(target);
      // initialize() reads the persisted preference and builds the
      // matching providers from scratch.
      await initialize(0, /*skipLoading=*/ false);
      // Note: walletMode state is set inside initialize() based on the
      // path it actually took. If the migration failed and we fell
      // back to legacy, `initialize` does NOT overwrite the user's
      // persisted 'profile' preference — we leave it in place so the
      // next boot retries Profile. The user can still click "Switch
      // back to Legacy" to flip the preference manually.
    } catch (err) {
      // Rollback the preference on a hard failure — the user shouldn't
      // be stuck in a loop of failing-to-boot if e.g. the OrbitDB
      // bring-up consistently fails.
      if (previousPreference) {
        writeWalletModePreference(previousPreference);
      } else {
        localStorage.removeItem(STORAGE_KEYS.WALLET_MODE_PREFERENCE);
      }
      throw err;
    } finally {
      setIsSwitchingMode(false);
    }
  }, [walletMode, isSwitchingMode, initialize]);

  /**
   * User-initiated legacy → Profile migration. Bypasses the
   * data-presence guard + SDK marker when `force: true` (the
   * "Merge (overwrite)" path).
   *
   * Always swaps active providers to Profile on success. On failure
   * keeps the current mode and surfaces the error via toast/UI (caller
   * inspects the thrown error).
   */
  const runLegacyToProfileMigration = useCallback(async (opts?: { force?: boolean }) => {
    const instance = sphereRef.current;
    if (!instance) throw new Error('Wallet not initialized');
    if (!providers) throw new Error('Providers not initialized');
    if (isSwitchingMode) {
      logger.warn('SphereProvider', 'runLegacyToProfileMigration: switch already in progress');
      return;
    }
    setIsSwitchingMode(true);
    initSeqRef.current += 1;

    // Build a SOURCE bundle whose `tokenStorage` is guaranteed to be
    // the legacy `IndexedDBTokenStorageProvider`. When we're called
    // from legacy mode, `providers.tokenStorage` already IS the legacy
    // provider — we can use it directly. When called from Profile mode
    // (the "Merge Legacy → UXF (overwrite)" path with the user
    // currently on Profile), `providers.tokenStorage` is the Profile
    // provider; copying that into Profile would be a Profile→Profile
    // no-op + would silently NOT merge any real legacy data. So we
    // construct a fresh legacy provider, set its identity, and pass
    // that as the source.
    let migrationSourceProviders = providers;
    let extraLegacyTokenStorage: IndexedDBTokenStorageProvider | null = null;
    // Snapshot the identity BEFORE we destroy the active sphere so we
    // can pass it to the migration helper (which needs it for the
    // marker keyspace + oracle.isSpent probes).
    const snapshotIdentity = probeIdentityFromSphere(instance);

    if (walletMode === 'profile') {
      if (!snapshotIdentity) {
        setIsSwitchingMode(false);
        throw new Error('Cannot merge: wallet identity unavailable');
      }
      const freshLegacy = new IndexedDBTokenStorageProvider();
      freshLegacy.setIdentity(snapshotIdentity);
      const ok = await freshLegacy.initialize();
      if (!ok) {
        // initialize() may have left a partial DB connection — best-
        // effort close before we surface the failure to the user.
        try { await freshLegacy.disconnect(); } catch { /* ignore */ }
        setIsSwitchingMode(false);
        throw new Error('Cannot merge: legacy IndexedDB unavailable');
      }
      extraLegacyTokenStorage = freshLegacy;

      // CRITICAL — disconnect the active Profile providers BEFORE we
      // call the migration helper. The helper builds its OWN Profile
      // providers internally (via the SDK's Sphere-bound factory),
      // and we don't want TWO live OrbitDB/Helia instances on the
      // same content-addressed databases. OrbitDB's OpLog is
      // multi-writer but concurrent writes can re-order with visible
      // inconsistency to a future reader.
      //
      // NOTE (post sphere-sdk #294): we DO NOT destroy the live Sphere
      // instance here anymore. The new Sphere-bound factory inside
      // `migrateLegacyToProfileBrowser` reaches into the instance's
      // internal `_identity.privateKey` via
      // `Sphere._withFullIdentityForProfileFactory` — it MUST be alive.
      // Disconnecting the providers releases the IndexedDB/OrbitDB
      // handles; the Sphere's in-memory identity is untouched. Sphere
      // destruction happens AFTER the migration succeeds (below).
      try { await providers.tokenStorage.disconnect(); } catch { /* ignore */ }
      try { await providers.storage.disconnect(); } catch { /* ignore */ }

      // Spread the active providers and SUBSTITUTE the tokenStorage
      // with the freshly-opened legacy provider. The oracle, storage
      // (for marker), etc. are unchanged.
      //
      // The cast is needed because our local ambient declaration of
      // `IndexedDBTokenStorageProvider` (in `sphere-sdk-browser.d.ts`)
      // uses `Record<string, unknown>` for `save()` while the SDK's
      // `TokenStorageProvider<TxfStorageDataBase>` uses the concrete
      // type. The implementation is type-compatible at runtime — both
      // describe the same SDK class.
      migrationSourceProviders = {
        ...providers,
        tokenStorage: freshLegacy as unknown as BrowserProviders['tokenStorage'],
      };
    }

    try {
      // Always pass the LIVE Sphere instance — the new Sphere-bound
      // factory in `migrateLegacyToProfileBrowser` requires it to
      // reach the in-memory private key without ever exposing it to
      // this consumer. A synthetic `{ identity }` cast would throw
      // `SphereError('NOT_INITIALIZED')` inside the factory.
      const profileResult = await runProfileMigration({
        legacyProviders: migrationSourceProviders,
        sphere: instance,
        network,
        setInitProgress,
        force: opts?.force === true,
      });
      if (!profileResult) {
        throw new Error('Migration failed — see logs for details');
      }
      // Destroy the still-live original Sphere now — its providers
      // have either been disconnected (profile-mode path) or are
      // about to be replaced (legacy-mode path), and the helper has
      // already finished reading its identity.
      await instance.destroy({ force: true, reason: 'user-initiated-uxf-migration' });
      sphereRef.current = null;
      const netConfig = NETWORKS[network] ?? NETWORKS.testnet;
      // sphere-sdk #309 — keep the legacy IndexedDB storage as a
      // read-only fallback for the next Sphere.init's identity-load
      // step. Symmetric with the boot-time path above.
      const legacyStorageForFallback = providers.storage;
      const swapped: BrowserProviders = {
        ...providers,
        storage: profileResult.profileStorage,
        tokenStorage: profileResult.profileTokenStorage,
      };
      delete swapped.ipfsTokenStorage;
      setProviders(swapped);
      TokenRegistry.configure({
        remoteUrl: netConfig.tokenRegistryUrl,
        storage: swapped.storage,
      });
      setInitProgress({ step: 'initializing', message: 'Loading Profile storage…' });
      const reinit = await Sphere.init({
        ...swapped,
        fallbackStorage: legacyStorageForFallback,
        l1: {},
        discoverAddresses: false,
        onProgress: setInitProgress,
      });
      sphereRef.current = reinit.sphere;
      setSphere(reinit.sphere);
      setWalletMode('profile');
      writeWalletModePreference('profile');
      setInitProgress(null);
      // Refresh probes — legacy is unchanged (the migration COPIES,
      // doesn't move), Profile now has data.
      await runProbes(reinit.sphere);
    } catch (err) {
      // Fatal error AFTER we destroyed the active sphere — the user is
      // now sphere-less. Re-run `initialize()` to rebuild whatever
      // mode the persisted preference points to (most likely legacy
      // since we only stamp 'profile' on success). This ensures the
      // user always lands on a usable wallet rather than a blank UI.
      logger.error('SphereProvider', 'runLegacyToProfileMigration failed — recovering', err);
      try {
        await initializeRef.current(0, /*skipLoading=*/ true);
      } catch (recoverErr) {
        logger.error('SphereProvider', 'Recovery initialize() also failed', recoverErr);
      }
      throw err;
    } finally {
      // Release the temp legacy provider (only opened on the
      // profile-mode merge path).
      if (extraLegacyTokenStorage) {
        try { await extraLegacyTokenStorage.disconnect(); } catch { /* ignore */ }
      }
      setIsSwitchingMode(false);
    }
  }, [providers, network, isSwitchingMode, runProbes, walletMode, setProviders]);

  const value: SphereContextValue = {
    sphere,
    providers,
    isLoading,
    isInitialized: !!sphere,
    walletExists,
    error,
    isDiscoveringAddresses,
    initProgress,
    resolveNametag,
    createWallet,
    importWallet,
    importFromFile,
    finalizeWallet,
    deleteWallet,
    reinitialize: initialize,
    ipfsEnabled,
    toggleIpfs,
    walletMode,
    hasLegacyData,
    hasProfileData,
    isSwitchingMode,
    switchWalletMode,
    runLegacyToProfileMigration,
    refreshDataProbes,
  };

  return (
    <SphereContext.Provider value={value}>{children}</SphereContext.Provider>
  );
}
