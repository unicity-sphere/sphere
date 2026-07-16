import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * SUPPORTED_NETWORKS is a module-load const, so every case re-imports the
 * module under a fresh environment (vi.resetModules + dynamic import). Stubbing
 * env after import would not re-derive it.
 */
function setRuntimeConfig(config: Record<string, string>): void {
  (window as unknown as { __SPHERE_RUNTIME_CONFIG__?: unknown }).__SPHERE_RUNTIME_CONFIG__ = config;
}

async function loadNetworkModule() {
  vi.resetModules();
  return import('../../../src/config/network');
}

beforeEach(() => {
  setRuntimeConfig({});
  localStorage.clear();
  // Isolate from the developer's local .env, which sets a wallet-api URL.
  vi.stubEnv('VITE_REQUIRE_WALLET_API', '');
  vi.stubEnv('VITE_WALLET_API_URL', '');
  vi.stubEnv('VITE_MAINNET_ROLLOUT_ENABLED', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  setRuntimeConfig({});
  localStorage.clear();
});

describe('SUPPORTED_NETWORKS — the availability gate', () => {
  it('offers exactly testnet2 and mainnet, in that order', async () => {
    const mod = await loadNetworkModule();
    expect(mod.SUPPORTED_NETWORKS.map((n) => n.id)).toEqual(['testnet2', 'mainnet']);
  });

  it('reports mainnet as not-onboarded while the SDK has no networkId for it', async () => {
    const mod = await loadNetworkModule();
    const mainnet = mod.SUPPORTED_NETWORKS.find((n) => n.id === 'mainnet');
    // Verified against the pinned SDK: NETWORKS.mainnet carries no networkId.
    expect(mainnet?.available).toBe(false);
    expect(mainnet?.unavailableReason).toBe('not-onboarded');
  });

  it('marks testnet2 available on a legacy local-custody deployment', async () => {
    const mod = await loadNetworkModule();
    const testnet2 = mod.SUPPORTED_NETWORKS.find((n) => n.id === 'testnet2');
    expect(testnet2?.available).toBe(true);
    expect(testnet2?.unavailableReason).toBeUndefined();
  });

  it('does NOT gate on a wallet-api URL when the deployment is not wallet-api', async () => {
    // Local-custody deployments serve every network locally, so a missing URL
    // must not hide a network there.
    vi.stubEnv('VITE_REQUIRE_WALLET_API', '');
    setRuntimeConfig({ WALLET_API_URL_TESTNET2: '' });
    const mod = await loadNetworkModule();
    expect(mod.SUPPORTED_NETWORKS.find((n) => n.id === 'testnet2')?.available).toBe(true);
  });

  it('reports not-served-here when a wallet-api deployment has no URL for the network', async () => {
    vi.stubEnv('VITE_REQUIRE_WALLET_API', 'true');
    setRuntimeConfig({ WALLET_API_URL_TESTNET2: '', WALLET_API_URL_MAINNET: '' });
    const mod = await loadNetworkModule();
    const testnet2 = mod.SUPPORTED_NETWORKS.find((n) => n.id === 'testnet2');
    expect(testnet2?.available).toBe(false);
    expect(testnet2?.unavailableReason).toBe('not-served-here');
  });

  it('never throws at module load, even when a wallet-api build has no URLs', async () => {
    // The gate must use a NON-throwing predicate: SUPPORTED_NETWORKS is a
    // module-scope const, so a #351 throw here would white-screen the app
    // before React mounts, bypassing the visible-error path.
    vi.stubEnv('VITE_REQUIRE_WALLET_API', 'true');
    setRuntimeConfig({});
    await expect(loadNetworkModule()).resolves.toBeDefined();
  });
});

describe('isSwitchableNetwork', () => {
  it('accepts an available network', async () => {
    const mod = await loadNetworkModule();
    expect(mod.isSwitchableNetwork('testnet2')).toBe(true);
  });

  it('rejects mainnet while it is unavailable', async () => {
    const mod = await loadNetworkModule();
    expect(mod.isSwitchableNetwork('mainnet')).toBe(false);
  });

  it('rejects unknown values and the legacy testnet alias', async () => {
    const mod = await loadNetworkModule();
    expect(mod.isSwitchableNetwork('nope')).toBe(false);
    expect(mod.isSwitchableNetwork('')).toBe(false);
    expect(mod.isSwitchableNetwork('testnet')).toBe(false);
  });

  it('always allows the dev escape hatch, independent of the gate', async () => {
    // Deliberate: dev is console-only and composes local custody, so the
    // deployment-capability gate must not (and structurally cannot) hide it.
    vi.stubEnv('VITE_REQUIRE_WALLET_API', 'true');
    const mod = await loadNetworkModule();
    expect(mod.isSwitchableNetwork('dev')).toBe(true);
  });
});

describe('resolveActiveNetwork — boot cannot brick', () => {
  it('uses a persisted switchable network', async () => {
    const mod = await loadNetworkModule();
    expect(mod.resolveActiveNetwork('dev')).toBe('dev');
  });

  it('falls back to the build default when nothing is persisted', async () => {
    const mod = await loadNetworkModule();
    expect(mod.resolveActiveNetwork(null)).toBe('testnet2');
  });

  it('falls back for a persisted network that is no longer available', async () => {
    // The deployment dropped mainnet (or never had it): a persisted 'mainnet'
    // must not boot a wallet that cannot work.
    const mod = await loadNetworkModule();
    expect(mod.resolveActiveNetwork('mainnet')).toBe('testnet2');
  });

  it('falls back for garbage', async () => {
    const mod = await loadNetworkModule();
    expect(mod.resolveActiveNetwork('{}')).toBe('testnet2');
  });
});

describe('setActiveNetwork', () => {
  it('persists, broadcasts and reloads', async () => {
    const mod = await loadNetworkModule();
    const reload = vi.fn();
    mod.setActiveNetwork('dev', { reload });

    expect(localStorage.getItem('sphere_active_network')).toBe('dev');
    expect(reload).toHaveBeenCalledOnce();
  });

  it('refuses a network that is not switchable', async () => {
    const mod = await loadNetworkModule();
    const reload = vi.fn();
    expect(() => mod.setActiveNetwork('mainnet', { reload })).toThrow(/not available/);
    expect(reload).not.toHaveBeenCalled();
    expect(localStorage.getItem('sphere_active_network')).toBeNull();
  });

  it('no-ops when the network is already active', async () => {
    const mod = await loadNetworkModule();
    const reload = vi.fn();
    mod.setActiveNetwork(mod.SPHERE_NETWORK, { reload });
    expect(reload).not.toHaveBeenCalled();
  });
});
