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
import { getVaultStore, isValidVaultUrl } from '../config/vaultStore';
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
 * Token-Vault v2 wiring. The encrypted remote backup (`vault`) and the
 * store-and-forward token delivery channel (`courier`) are driven by the user's
 * persisted "Cloud backup & sync (Vault)" setting (Settings → Vault), with the
 * env flags acting only as a fall-back default until the user has chosen.
 *
 * The Vault is operator-blind durable backup/sync of the user's OWN tokens; the
 * local IndexedDB stays the working copy. The user choice is which token-api
 * SERVER (or none). One server hosts both vault + courier, so a single URL feeds
 * both. See config/vaultStore.ts for the persisted setting.
 *
 * Env fall-back (only when nothing has been saved yet):
 *   VITE_VAULT_ENABLED=true   VITE_VAULT_URL=http://localhost:3000   (optional)
 *   VITE_COURIER_ENABLED=true VITE_COURIER_URL=http://localhost:3000 (optional)
 * When enabled but the URL is unset, the SDK resolves NETWORKS[network].vaultUrl
 * (the per-network token-api default). The resolved config is threaded into the
 * Sphere.init / import options on EVERY boot path (create, load, import). When
 * the effective mode is "off", this returns `{}` — a NO-OP, byte-identical to
 * today (no vault provider, Nostr-only delivery).
 */
function isVaultEnabled(): boolean {
  return import.meta.env.VITE_VAULT_ENABLED === 'true';
}

function isCourierEnabled(): boolean {
  return import.meta.env.VITE_COURIER_ENABLED === 'true';
}

type TokenApiConfig = {
  vault?: { enabled: boolean; url?: string };
  courier?: { enabled: boolean; url?: string };
};

/**
 * Build the `{ vault?, courier? }` slice of the Sphere init options for the given
 * network, resolving the effective config from the persisted vault-store setting
 * (overriding the env flags). Falls back to the env flags only when the user has
 * not chosen yet. Returns `{}` (a no-op) for the "off" mode.
 */
function getTokenApiConfig(network: NetworkType): TokenApiConfig {
  const setting = getVaultStore();

  // No saved choice yet — honour the build-time env flags (legacy behavior).
  if (!setting) return getTokenApiConfigFromEnv(network);

  if (setting.mode === 'off') return {};

  if (setting.mode === 'custom') {
    const url = setting.customUrl?.trim();
    if (!isValidVaultUrl(url)) {
      console.warn(
        '[Vault] Custom vault URL is blank or invalid — treating cloud backup as OFF. ' +
        'Set a valid http(s) URL in Settings → Vault.',
      );
      return {};
    }
    return { vault: { enabled: true, url }, courier: { enabled: true, url } };
  }

  // 'default' — Unicity's company token-api. The dev env var (if set) points
  // this session at the local token-api; otherwise the SDK uses the per-network
  // default (NETWORKS[network].vaultUrl).
  const url = import.meta.env.VITE_VAULT_URL || NETWORKS[network]?.vaultUrl;
  return {
    vault: { enabled: true, ...(url ? { url } : {}) },
    courier: { enabled: true, ...(url ? { url } : {}) },
  };
}

/** Legacy env-flag resolution, used only before the user has saved a choice. */
function getTokenApiConfigFromEnv(network: NetworkType): TokenApiConfig {
  const cfg: TokenApiConfig = {};
  if (isVaultEnabled()) {
    const url = import.meta.env.VITE_VAULT_URL || NETWORKS[network]?.vaultUrl;
    cfg.vault = { enabled: true, ...(url ? { url } : {}) };
  }
  if (isCourierEnabled()) {
    const url = import.meta.env.VITE_COURIER_URL || NETWORKS[network]?.vaultUrl;
    cfg.courier = { enabled: true, ...(url ? { url } : {}) };
  }
  return cfg;
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
  network = 'testnet2',
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
        // v2 token engine: aggregator URL + trust base (networkId 4) come from the
        // testnet2 network preset; only the apiKey is injected (non-secret on testnet2).
        oracle: { apiKey: import.meta.env.VITE_AGGREGATOR_API_KEY },
        price: { platform: 'coingecko', baseUrl: COINGECKO_BASE_URL, cacheTtlMs: 5 * 60_000 },
        // Group chat (NIP-29) is disabled: the UI is already hidden (PR #339), and
        // skipping the module here stops the SDK from connecting to NIP-29 relays.
        groupChat: false,
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
        const { sphere: instance } = await Sphere.init({
          ...browserProviders,
          network, // ensure the SDK configures TokenRegistry for THIS network (not the testnet default)
          l1: {},
          discoverAddresses: false, // Run separately below for UX
          onProgress: setInitProgress,
          ...getTokenApiConfig(network), // opt-in vault backup + courier delivery (OFF by default)
        });
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
          network,
          autoGenerate: true,
          nametag: options?.nametag,
          l1: {},
          onProgress: setInitProgress,
          ...getTokenApiConfig(network), // opt-in vault backup + courier delivery (OFF by default)
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
    [providers, network],
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
        network,
        mnemonic,
        nametag: options?.nametag,
        l1: {},
        onProgress: setInitProgress,
        ...getTokenApiConfig(network), // opt-in vault backup + courier delivery (OFF by default)
      });
      setInitProgress(null);

      // Don't setSphere/setWalletExists here — the onboarding flow calls
      // finalizeWallet(sphere) after address selection / nametag are done.
      return instance;
    },
    [providers, network],
  );

  const importFromFile = useCallback(
    async (options: ImportFromFileOptions): Promise<ImportFromFileResult> => {
      if (!providers) throw new Error('Providers not initialized');
      await disconnectTransport(providers);

      try {
        setInitProgress({ step: 'initializing', message: 'Importing file...' });
        const result = await Sphere.importFromLegacyFile({
          ...providers,
          network,
          fileContent: options.fileContent,
          fileName: options.fileName,
          password: options.password,
          nametag: options.nametag,
          l1: {},
          onProgress: setInitProgress,
          ...getTokenApiConfig(network), // opt-in vault backup + courier delivery (OFF by default)
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
    [providers, network],
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
        logger.warn('SphereProvider', 'Sphere.clear() failed, sweeping IndexedDB directly', err);
      }
      // Sweep ALL Sphere IndexedDB databases by prefix. The token DB is now per-network
      // (sphere-token-storage-{network}-{chainPubkey}), so a fixed-name delete would miss
      // both the active per-network DB and any orphaned-network DBs. Run this always (not
      // just on clear() failure): Sphere.clear() closes its own handles, so deletion is not
      // blocked. Falls back to the known base names where indexedDB.databases() is missing.
      try {
        const dbs = (await indexedDB.databases?.()) ?? [];
        const toDelete = dbs
          .map((d) => d.name)
          .filter((n): n is string => !!n && (n === 'sphere-storage' || n.startsWith('sphere-token-storage')));
        for (const name of toDelete) {
          try { indexedDB.deleteDatabase(name); } catch { /* best effort */ }
        }
      } catch {
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
