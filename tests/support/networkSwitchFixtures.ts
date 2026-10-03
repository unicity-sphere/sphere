import { vi } from 'vitest';
import type { NetworkMismatchContext } from '@unicitylabs/sphere-sdk/connect';

/**
 * Shared fixtures for the tests that drive the wallet's `onNetworkMismatch`
 * (the two Connect hosts and the handler they share).
 *
 * The offer depends on what THIS deployment can serve, and that is runtime config
 * read at module load. So these tests pin the config and re-import the modules
 * under it (vi.resetModules + a dynamic import) instead of mocking the predicate:
 * the wallet is on testnet2, mainnet is a real, switchable target, and the
 * developer's local .env cannot leak in. Same harness as networkSwitchOffer.test.ts.
 */

export const MARKER_KEY = 'sphere_connect_network_switch';

export function pinNetworkConfig(): void {
  (window as unknown as { __SPHERE_RUNTIME_CONFIG__?: unknown }).__SPHERE_RUNTIME_CONFIG__ = {
    DEFAULT_NETWORK: 'testnet2',
    MAINNET_ROLLOUT_ENABLED: 'true',
    WALLET_API_URL_MAINNET: 'https://wallet-api.mainnet.example',
    WALLET_API_URL_TESTNET2: 'https://wallet-api.testnet2.example',
    SUBSCRIPTION_ENABLED: 'true',
  };
  vi.stubEnv('VITE_REQUIRE_WALLET_API', '');
  vi.stubEnv('VITE_WALLET_API_URL', '');
  vi.stubEnv('VITE_WALLET_API_URL_TESTNET2', '');
  vi.stubEnv('VITE_WALLET_API_URL_MAINNET', '');
  vi.stubEnv('VITE_MAINNET_ROLLOUT_ENABLED', '');
  vi.stubEnv('VITE_SUBSCRIPTION_ENABLED', '');
  vi.stubEnv('VITE_DEFAULT_NETWORK', '');
}

export function unpinNetworkConfig(): void {
  vi.unstubAllEnvs();
  (window as unknown as { __SPHERE_RUNTIME_CONFIG__?: unknown }).__SPHERE_RUNTIME_CONFIG__ = {};
}

/** The dApp, as the SDK hands it to the hook. Every string on it is peer-declared. */
export const DAPP = { name: 'Hostile Swap', url: 'https://not-the-real-origin.example' };

/**
 * What the SDK passes to `onNetworkMismatch`, for a wallet on testnet2 (id 4) and a dApp
 * that declared mainnet (id 1). `expiresAt` defaults to a minute ahead.
 */
export function mismatchCtx(over: Partial<NetworkMismatchContext> = {}): NetworkMismatchContext {
  return {
    origin: undefined,
    walletNetwork: { id: 4 },
    clientNetwork: { id: 1, name: 'Mainnet' },
    clientProtocol: '2.3',
    expiresAt: Date.now() + 60_000,
    ...over,
  };
}

/** The `error.data` the SDK's gate attaches to the 4008 it sends (and hands to onConnectionRejected). */
export function networkRejection(clientNetwork: unknown = { id: 1 }) {
  return {
    code: 4008,
    message: 'dApp targets a different network than the wallet',
    data: { reason: 'network_incompatible', walletNetwork: { id: 4 }, clientNetwork },
  };
}

/** What a switch leaves in sessionStorage for the page that comes back from the reload. */
export function seedSwitchMarker(origin: string, to = 'testnet2', at = Date.now()): void {
  sessionStorage.setItem(MARKER_KEY, JSON.stringify({ origin, to, at }));
}

/** One turn of the macrotask queue: runs every timer that was already due, in order. */
export const macrotask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * A `Date.now` the test can push forward, without fake timers (which would also freeze the
 * timer the handler uses to schedule the switch). Restore in afterEach.
 */
export function controllableClock() {
  const real = Date.now.bind(Date);
  let skew = 0;
  const spy = vi.spyOn(Date, 'now').mockImplementation(() => real() + skew);
  return {
    advance(ms: number) {
      skew += ms;
    },
    restore() {
      spy.mockRestore();
    },
  };
}

/** A promise the test settles by hand: a prompt the user has not answered yet. */
export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** The slice of a ConnectHost config that the two hosts' tests drive. */
export interface CapturedHostConfig {
  origin: string;
  onNetworkMismatch: (
    dapp: { name: string; url: string },
    ctx: NetworkMismatchContext,
  ) => Promise<{ action: 'refuse' } | { action: 'switch'; to: { id: number } }>;
  onConnectionRequest: (
    dapp: { name: string; url: string },
    permissions: string[],
    silent?: boolean,
  ) => Promise<{ approved: boolean; grantedPermissions: string[] }>;
  onConnectionRejected: (
    dapp: { name: string; url: string } | undefined,
    error: { code: number; message: string; data?: unknown },
    silent?: boolean,
  ) => void;
}

/**
 * A fresh module graph in which `setActiveNetwork` is the REAL function with only its
 * `reload` swapped for the seam it already has (jsdom cannot reload, and the reload is the
 * statement whose order these tests defend). Call it before every dynamic import that
 * should see a "newly loaded page".
 *
 * `vi.doMock` after `vi.resetModules()`, not a hoisted `vi.mock`: a hoisted factory's
 * result is cached across resets, so `importOriginal()` would hand back the FIRST
 * evaluation of config/network forever, and everything it reads once at load
 * (SPHERE_NETWORK, the switch marker) would be frozen at that import.
 */
export function freshModules(reload: () => void): void {
  vi.resetModules();
  vi.doMock('../../src/config/network', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../src/config/network')>();
    return {
      ...actual,
      setActiveNetwork: (
        id: Parameters<typeof actual.setActiveNetwork>[0],
        opts: Parameters<typeof actual.setActiveNetwork>[1] = {},
      ) => actual.setActiveNetwork(id, { ...opts, reload }),
    };
  });
}

export const SUPPRESSED_KEY = 'sphere_network_switch_suppressed';
export const ACTIVE_NETWORK_KEY = 'sphere_active_network';

/**
 * The keys written to localStorage, in order, with every write passed through. Lets a test
 * say "the mute landed BEFORE the active network was persisted", which is an ordering no
 * assertion on the final state can see. Restored by `vi.restoreAllMocks()` in afterEach.
 */
export function recordStorageWrites(): string[] {
  const writes: string[] = [];
  const real = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
    if (this === localStorage) writes.push(key);
    real.call(this, key, value);
  });
  return writes;
}

/** The mute store as persisted, parsed, or null when nothing was written. */
export function rawSuppressed(): { byNetwork: Record<string, Record<string, { targets: Record<string, unknown> }>> } | null {
  const raw = localStorage.getItem(SUPPRESSED_KEY);
  return raw === null ? null : JSON.parse(raw);
}
