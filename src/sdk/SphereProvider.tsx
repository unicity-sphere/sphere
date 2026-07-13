import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Sphere, TokenRegistry, NETWORKS, logger, isSphereError, getPublicKey } from '@unicitylabs/sphere-sdk';
import { sendWelcomeDM } from './welcomeDM';
import type { InitProgress, NetworkType } from '@unicitylabs/sphere-sdk';
import { getErrorMessage } from './errors';
import {
  createBrowserProviders,
  createUnicityAggregatorProvider,
  type BrowserProviders,
} from '@unicitylabs/sphere-sdk/impl/browser';
import {
  createSphereProviders,
  createWalletApiProviders,
} from '@unicitylabs/sphere-sdk/impl/shared/wallet-api';
import { SphereContext, type SphereAppProviders } from './SphereContext';
import {
  getEngineOverride,
  getWalletApiBaseUrl,
  isWalletApiEnabled,
} from '../config/walletApi';
import { getActiveOracleApiKey } from './oracleKey';
import { SUBSCRIPTION_ENABLED } from '../config/subscription';
import { resolveActiveKey, saveWalletKey, saveAddressKey, loadWalletKey } from './subscription/keyVault';
import { isPaidPlan } from './subscription/usage';
import type { SubscriptionKeyStatus } from './subscription/keyStatus';
import { provisionOrRecoverKey, getUtilization } from '../services/subscriptionApi';

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
import {
  clearAllSphereData,
  getOrCreateWalletApiDeviceId,
  setStoredSubscriptionKey,
  STORAGE_KEYS,
} from '../config/storageKeys';
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
  // wallet-api mode: server inventory custody — a second token-storage
  // mirror (IPFS) has undefined ownership-handoff/tombstone semantics, so
  // token sync is forced off (the toggle is hidden too).
  if (isWalletApiEnabled()) return {};
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
  if (isWalletApiEnabled()) return; // see getIpfsConfig()
  if (providers.ipfsTokenStorage) {
    instance.addTokenStorageProvider(providers.ipfsTokenStorage)
      .then(() => instance.sync())
      .catch(err => logger.warn('SphereProvider', 'IPFS sync failed', err));
  }
}

/**
 * Compose the app's provider bundle (S4): the browser base, an optional
 * engine-port override (LOCAL dev stack: mock aggregator + the trustbase it
 * serves), and — when VITE_WALLET_API_URL is set — the wallet-api preset:
 * thin server-custody token storage + mailbox delivery + the S1 client.
 * Composing `delivery` moves ASSETS to wallet-api; messaging, group chat and
 * nametags stay on the Nostr transport in the base bundle.
 *
 * Fail-closed (#351): on builds with VITE_REQUIRE_WALLET_API set,
 * getWalletApiBaseUrl() throws when VITE_WALLET_API_URL is missing — the
 * error is caught by initialize() and surfaced as a visible init error
 * instead of silently composing the legacy local-custody bundle.
 */
function buildProviders(network: NetworkType, apiKey?: string): SphereAppProviders {
  const base = createBrowserProviders({
    network,
    // v2 token engine: aggregator URL + trust base come from the network
    // preset; `apiKey` is already fully resolved by getActiveOracleApiKey()
    // (per-wallet subscription key when subscriptions are on, else the static
    // env key when off). Do NOT add an `?? env` fallback here — that would
    // resurrect VITE_AGGREGATOR_API_KEY while subscriptions are enabled, which
    // must ignore it entirely (see src/sdk/oracleKey.ts).
    oracle: { apiKey },
    price: { platform: 'coingecko', baseUrl: COINGECKO_BASE_URL, cacheTtlMs: 5 * 60_000 },
    groupChat: true,
    market: true,
    ...getIpfsConfig(),
  });

  const engineOverride = getEngineOverride();
  const withEngine = engineOverride
    ? createSphereProviders(base, {
        engine: createUnicityAggregatorProvider({
          url: engineOverride.aggregatorUrl,
          trustBaseUrl: engineOverride.trustBaseUrl,
          network,
        }),
      })
    : base;

  const walletApiBaseUrl = getWalletApiBaseUrl();
  if (!walletApiBaseUrl) return withEngine;
  return createWalletApiProviders(withEngine, {
    baseUrl: walletApiBaseUrl,
    network,
    deviceId: getOrCreateWalletApiDeviceId(),
    // Robustness for slow/unstable connections: the SDK default request
    // timeout is 30s, which prematurely aborts a slow-but-completing send
    // write (POST /v1/inventory/apply) and hard-fails the send. Give slow
    // links room to finish; and harden the read/sync + 429 retry path
    // (writes stay single-attempt in the SDK for double-apply safety).
    requestTimeoutMs: 45000,
    retry: { maxAttempts: 5, capMs: 15000 },
  });
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
  const [providers, setProviders] = useState<SphereAppProviders | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [walletExists, setWalletExists] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [ipfsEnabled, setIpfsEnabled] = useState(isIpfsEnabled);
  const [isDiscoveringAddresses, setIsDiscoveringAddresses] = useState(false);
  const [initProgress, setInitProgress] = useState<InitProgress | null>(null);
  // Readiness of the subscription key on the live oracle — gates the send path
  // so a send can't race async provisioning and go out keyless (→ 401).
  const [subscriptionKeyStatus, setSubscriptionKeyStatus] = useState<SubscriptionKeyStatus>(
    SUBSCRIPTION_ENABLED ? 'provisioning' : 'not-required',
  );
  const sphereRef = useRef<Sphere | null>(null);
  // Subscription-key reconcile bookkeeping (SUBSCRIPTION_ENABLED only):
  // - subKeyGenRef: monotonic generation so only the LATEST reconcile (initial
  //   load or a live address switch) may apply its key + flip status; stale
  //   overlapping reconciles abort at their generation check (no last-writer-wins
  //   drift when the user switches addresses quickly).
  // - appliedOracleKeyRef: the key the LIVE token engine actually carries. The
  //   send gate flips 'ready' off THIS — never the boot-cache slot, which is
  //   written ahead of the async engine rebuild — so 'ready' can't race an
  //   in-flight re-key and open a keyless-send window.
  const subKeyGenRef = useRef(0);
  const appliedOracleKeyRef = useRef<string | null>(null);
  // Serialize live oracle re-keys so overlapping engine rebuilds from rapid
  // address switches COMMIT in order — the live engine ends on the latest
  // requested key, matching appliedOracleKeyRef (no wrong-key drift). A key whose
  // generation was already superseded is skipped. This chain holds ONLY the fast,
  // local setOracleApiKey rebuild; the (possibly hanging) network provisioning
  // stays outside it, so an SGW stall can never block re-keying.
  const applyChainRef = useRef<Promise<void>>(Promise.resolve());
  const applyOracleKey = useCallback(
    (instance: Sphere, key: string, gen: number): Promise<void> => {
      const next = applyChainRef.current
        .then(async () => {
          if (gen !== subKeyGenRef.current) return; // superseded before we ran
          if (key === appliedOracleKeyRef.current) return; // engine already carries it
          await instance.setOracleApiKey(key);
          if (gen !== subKeyGenRef.current) return; // superseded during the rebuild
          appliedOracleKeyRef.current = key;
        })
        .catch(() => {});
      applyChainRef.current = next;
      return next;
    },
    [],
  );

  // Wire the per-wallet subscription (oracle) key onto a LIVE Sphere instance
  // WITHOUT a full re-init: resolve/provision the key, apply it to the live
  // oracle via setOracleApiKey, drive the send-gate status, and attach the
  // identity:changed listener that re-keys on a live address switch. Shared by
  // initialize() (existing wallet) AND finalizeWallet() (freshly onboarded
  // wallet) so BOTH get per-address reconcile + provisioning retry + terminal
  // status — not just a one-shot re-key. `builtWithKey` is the key the instance's
  // oracle was constructed with (undefined for the keyless onboarding oracle);
  // it seeds appliedOracleKeyRef so an unchanged key skips a needless rebuild.
  const setupSubscriptionKey = useCallback(
    (instance: Sphere, builtWithKey: string | undefined) => {
      if (!SUBSCRIPTION_ENABLED) return;
      appliedOracleKeyRef.current = builtWithKey ?? null;

      // Apply a resolved key to the live oracle (via the serialized apply chain),
      // then mark the gate ready — but only while this reconcile is still the
      // latest (gen guard) and only once the engine actually carries THIS key
      // (appliedOracleKeyRef), never off the boot-cache slot alone.
      const applyResolved = async (key: string, gen: number) => {
        if (gen !== subKeyGenRef.current) return;
        setStoredSubscriptionKey(key);
        await applyOracleKey(instance, key, gen);
        if (gen !== subKeyGenRef.current) return;
        if (appliedOracleKeyRef.current === key) {
          setSubscriptionKeyStatus('ready');
        } else if (appliedOracleKeyRef.current === null) {
          // The engine rebuild did not land and the oracle is still keyless →
          // block the send gate (terminal 'failed') rather than leave it stuck
          // 'provisioning'. A non-null ref means a valid bearer key is loaded, so
          // leave the status untouched.
          setSubscriptionKeyStatus('failed');
        }
      };

      const provisionOwn = async (scope: 'wallet' | 'address', gen: number) => {
        try {
          const result = await provisionOrRecoverKey(instance, { scope });
          if (gen !== subKeyGenRef.current) return;
          await (scope === 'wallet'
            ? saveWalletKey(instance, network, result.apiKey)
            : saveAddressKey(instance, network, result.apiKey)); // both set the boot cache
          await applyOracleKey(instance, result.apiKey, gen);
          if (gen !== subKeyGenRef.current) return;
          if (appliedOracleKeyRef.current === result.apiKey) {
            setSubscriptionKeyStatus('ready');
          } else if (appliedOracleKeyRef.current === null) {
            // Applying the key to the engine did not land and it is still keyless →
            // block the send gate (terminal 'failed') rather than leave it stuck.
            setSubscriptionKeyStatus('failed');
          }
        } catch (err) {
          if (gen !== subKeyGenRef.current) return;
          // Provisioning failed. Block the send gate ('failed') while the oracle is
          // still keyless (initial load, OR a live switch that superseded an initial
          // reconcile which never keyed the engine). A non-null ref means a valid
          // bearer key is already loaded, so leave the status untouched (still 'ready').
          if (appliedOracleKeyRef.current === null) setSubscriptionKeyStatus('failed');
          console.warn('subscription auto-provisioning failed; sends are gated until it recovers', err);
        }
      };

      // Reconciles the boot cache (a single global slot — config/storageKeys.ts)
      // against the active address's resolved key:
      // - resolved 'own'/'wallet' with a key → use it;
      // - index 0 with no key yet → provision the wallet (index-0) free key;
      // - any other address with no key → give it its OWN free key, EXCEPT when
      //   index 0 is on a PAID plan and undecided, where a one-time prompt first
      //   offers to share that paid plan (inherit).
      const reconcileSubscriptionKey = async (initialLoad: boolean) => {
        const gen = ++subKeyGenRef.current;
        const resolved = await resolveActiveKey(instance, network);
        if (gen !== subKeyGenRef.current) return;
        if (resolved.key) {
          await applyResolved(resolved.key, gen);
          return;
        }
        // needs-own: index 0 → wallet key; else this address's own key.
        const isRoot = instance.identity?.chainPubkey === getPublicKey(instance.deriveAddress(0).privateKey);
        if (isRoot) {
          await provisionOwn('wallet', gen);
          return;
        }
        // Offer inheriting index 0's plan only when it's PAID and undecided
        // (only on a live switch — never during the initial load).
        if (!initialLoad && resolved.undecided) {
          const walletKey = await loadWalletKey(instance, network);
          if (gen !== subKeyGenRef.current) return;
          if (walletKey) {
            try {
              if (isPaidPlan((await getUtilization(walletKey)).activeUntil)) {
                if (gen !== subKeyGenRef.current) return;
                window.dispatchEvent(new Event('subscription-address-prompt'));
                return; // wait for the user's choice
              }
            } catch {
              // metering unavailable → fall through to an own free key
            }
          }
        }
        await provisionOwn('address', gen);
      };

      void reconcileSubscriptionKey(true).catch(() => {});
      // Re-resolve on a live address switch — the per-address key applies
      // immediately via setOracleApiKey (no re-init, no reconnect). The listener
      // dies with the instance on the next full re-init (instance.destroy()).
      instance.on('identity:changed', () => {
        void reconcileSubscriptionKey(false).catch(() => {});
      });
    },
    [network, applyOracleKey],
  );

  const initialize = useCallback(async (attempt = 0, skipLoading = false) => {
    try {
      // Destroy previous instance to release IndexedDB connections
      if (sphereRef.current) {
        await sphereRef.current.destroy();
        sphereRef.current = null;
      }

      if (!skipLoading) setIsLoading(true);
      setError(null);

      // Snapshot the resolved oracle key: when subscriptions are on it is the
      // stored per-wallet key (or undefined if not provisioned yet), and it
      // decides whether the live oracle is 'ready' vs still 'provisioning'.
      const oracleApiKey = getActiveOracleApiKey();
      const browserProviders = buildProviders(network, oracleApiKey);
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
          discoverAddresses: false, // Run separately below for UX
          onProgress: setInitProgress,
        });
        setupIpfsSync(instance, browserProviders);
        setInitProgress(null);
        sphereRef.current = instance;
        setSphere(instance);

        // Readiness for the send gate: 'ready' iff this oracle was built WITH a
        // subscription key. With no key yet we provision below and stay
        // 'provisioning' until setupSubscriptionKey applies one (covers the whole
        // provisioning gap, not just "no key in storage"). Subs off → the env key
        // is the oracle credential, so sends are always allowed ('not-required').
        setSubscriptionKeyStatus(
          !SUBSCRIPTION_ENABLED ? 'not-required' : oracleApiKey ? 'ready' : 'provisioning',
        );

        // Wire the per-wallet subscription key onto this live instance: resolve /
        // provision it, apply via setOracleApiKey (no re-init), drive the send-gate
        // status, and attach the identity:changed re-key listener. Shared with
        // finalizeWallet so onboarded wallets get the same reconcile + provisioning
        // retry. Full algorithm in setupSubscriptionKey (defined above).
        setupSubscriptionKey(instance, oracleApiKey);
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
        instance.discoverAddresses({ autoTrack: true }).then(result => {
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
  }, [network, setupSubscriptionKey]);

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
        onProgress: setInitProgress,
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
    [providers, network],
  );

  const deleteWallet = useCallback(async () => {
    // Notify connected dApps before destroying — ConnectPage/IframeAgent listen for this
    window.dispatchEvent(new CustomEvent('sphere:wallet-logout'));

    // Best-effort wallet-api session revoke (S4 auth lifecycle): the SDK only
    // calls walletApi.logout() on address switch, not on destroy — without
    // this the server session row would outlive wallet deletion.
    if (providers?.walletApi) {
      await providers.walletApi.logout().catch((err) => {
        logger.warn('SphereProvider', 'wallet-api logout failed (best effort)', err);
      });
    }

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
    // The onboarding oracle was built KEYLESS. Wire the subscription key onto this
    // live instance exactly like initialize() does for an existing wallet: resolve
    // / provision it + apply via setOracleApiKey (no full re-init), attach the
    // identity:changed re-key listener, and drive the send gate to a terminal
    // 'ready'/'failed'. (A bare setOracleApiKey here would skip the per-address
    // re-key listener AND the provisioning retry — see #420 review.)
    const inst = importedSphere ?? sphereRef.current;
    if (inst) setupSubscriptionKey(inst, undefined);
  }, [providers, setupSubscriptionKey]);

  const toggleIpfs = useCallback(() => {
    const next = !isIpfsEnabled();
    localStorage.setItem(STORAGE_KEYS.IPFS_ENABLED, String(next));
    setIpfsEnabled(next);
    // Reinitialize so the new IPFS setting takes effect
    initialize();
  }, [initialize]);

  const applySubscriptionKey = useCallback(async (apiKey: string, opts?: { walletWide?: boolean }) => {
    setStoredSubscriptionKey(apiKey);
    const instance = sphereRef.current;
    if (instance) {
      // Supersede any in-flight reconcile (bump the generation) so a stale
      // reconcile can't clobber this explicit, user-chosen key.
      const gen = ++subKeyGenRef.current;
      // Bookkeeping (best-effort — the vault entry is a durability upgrade,
      // not a gate): while on the root address (or when explicitly asked) the
      // key becomes WALLET-wide; on any other address it becomes that
      // address's OWN key.
      const rootPubkey = (() => {
        try { return getPublicKey(instance.deriveAddress(0).privateKey); } catch { return null; }
      })();
      const walletWide = opts?.walletWide ?? (rootPubkey !== null && instance.identity?.chainPubkey === rootPubkey);
      await (walletWide
        ? saveWalletKey(instance, network, apiKey)
        : saveAddressKey(instance, network, apiKey)
      ).catch(() => {});
      // Apply the new key to the LIVE oracle (serialized apply chain — no full
      // re-init, rebuilds only the token engine). Flip 'ready' only once the
      // engine actually carries it.
      await applyOracleKey(instance, apiKey, gen);
      if (gen !== subKeyGenRef.current) return; // a newer reconcile/apply superseded us
      if (appliedOracleKeyRef.current === apiKey) setSubscriptionKeyStatus('ready');
    }
  }, [network, applyOracleKey]);

  const value: SphereContextValue = {
    sphere,
    providers,
    network,
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
    applySubscriptionKey,
    subscriptionKeyStatus,
    walletApiEnabled: isWalletApiEnabled(),
  };

  return (
    <SphereContext.Provider value={value}>{children}</SphereContext.Provider>
  );
}
