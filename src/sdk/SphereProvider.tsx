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
import type { InitProgress, NetworkType } from '@unicitylabs/sphere-sdk';
import { getErrorMessage } from './errors';
import {
  createBrowserProviders,
  type BrowserProviders,
} from '@unicitylabs/sphere-sdk/impl/browser';
import { createBrowserProfileProviders } from '@unicitylabs/sphere-sdk/profile/browser';
import { IS_UXF_BUILD } from '../config/uxf';
import { runProfileMigration } from './uxfProfileMigration';
import { SphereContext } from './SphereContext';

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
  const [providers, setProviders] = useState<BrowserProviders | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [walletExists, setWalletExists] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [ipfsEnabled, setIpfsEnabled] = useState(isIpfsEnabled);
  const [isDiscoveringAddresses, setIsDiscoveringAddresses] = useState(false);
  const [initProgress, setInitProgress] = useState<InitProgress | null>(null);
  const sphereRef = useRef<Sphere | null>(null);

  const initialize = useCallback(async (attempt = 0, skipLoading = false) => {
    try {
      // Destroy previous instance to release IndexedDB connections
      if (sphereRef.current) {
        await sphereRef.current.destroy();
        sphereRef.current = null;
      }

      if (!skipLoading) setIsLoading(true);
      setError(null);

      const browserProviders = createBrowserProviders({
        network,
        price: { platform: 'coingecko', baseUrl: COINGECKO_BASE_URL, cacheTtlMs: 5 * 60_000 },
        groupChat: true,
        market: true,
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

      const exists = await Sphere.exists(browserProviders.storage);
      setWalletExists(exists);

      if (exists) {
        setInitProgress({ step: 'initializing', message: 'Loading wallet...' });
        let { sphere: instance } = await Sphere.init({
          ...browserProviders,
          l1: {},
          discoverAddresses: false, // Run separately below for UX
          onProgress: setInitProgress,
        });

        // UXF Profile mode + safe migration (re-entry-safe).
        // When IS_UXF_BUILD: try to migrate legacy tokens into Profile-backed
        // storage (OrbitDB + aggregator pointer). On success, swap providers
        // and re-init Sphere; on failure, keep the legacy instance running
        // so the user sees their balance (DO NOT strand the wallet).
        //
        // Known limitation (acceptable for first-boot only): the helper
        // snapshots `legacy.tokenStorage` once at the start. Tokens that
        // arrive on the transport between snapshot and re-init land in
        // legacy storage but NOT in Profile. The marker is then stamped,
        // so the next boot won't re-migrate them. In practice the window
        // is ~1-2 s on small wallets; after the first successful boot
        // the wallet runs Profile-only so the race can't recur. A
        // future SDK enhancement could add incremental migration; for
        // now we accept the rare loss because the alternative
        // (transport disconnect during migration) breaks DM delivery
        // for the full migration window too.
        if (IS_UXF_BUILD) {
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
            setInitProgress({ step: 'initializing', message: 'Loading Profile storage…' });
            const reinit = await Sphere.init({
              ...browserProviders,
              l1: {},
              discoverAddresses: false,
              onProgress: setInitProgress,
            });
            instance = reinit.sphere;
          }
          // On migration failure, `instance` remains the legacy-backed
          // Sphere — user keeps their balance, no swap happens.
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
        // needed. When IS_UXF_BUILD, swap to Profile-backed providers
        // preemptively so the subsequent createWallet()/importWallet()
        // call writes directly into Profile storage.
        if (IS_UXF_BUILD) {
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
  }, [network]);

  useEffect(() => {
    initialize();
    return () => {
      // Cleanup on unmount
      sphereRef.current?.destroy();
      sphereRef.current = null;
    };
  }, [initialize]);

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

    // Reinitialize with fresh providers (skip loading spinner — onboarding UI is already visible)
    await initialize(0, true);
  }, [providers, initialize, queryClient]);

  const finalizeWallet = useCallback((importedSphere?: Sphere) => {
    if (importedSphere) {
      if (providers) setupIpfsSync(importedSphere, providers);
      sphereRef.current = importedSphere;
      setSphere(importedSphere);
      sendWelcomeDM(importedSphere);
    }
    setWalletExists(true);
  }, [providers]);

  const toggleIpfs = useCallback(() => {
    const next = !isIpfsEnabled();
    localStorage.setItem(STORAGE_KEYS.IPFS_ENABLED, String(next));
    setIpfsEnabled(next);
    // Reinitialize so the new IPFS setting takes effect
    initialize();
  }, [initialize]);

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
  };

  return (
    <SphereContext.Provider value={value}>{children}</SphereContext.Provider>
  );
}
