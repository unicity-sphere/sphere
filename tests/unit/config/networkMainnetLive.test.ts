import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * The rest of the network suite runs against the PINNED SDK, where
 * NETWORKS.mainnet carries no networkId — so `unavailableReasonFor` returns
 * 'not-onboarded' on its first line and the later gates are unreachable for
 * mainnet. Those tests therefore cannot tell "mainnet is refused for the reason
 * I meant" from "mainnet is refused because the SDK has not onboarded it".
 *
 * This file removes that blind spot: it mocks the SDK table to the shape a
 * mainnet-onboarding SDK will ship (a networkId), and pins what the wallet must
 * do on the day that lands. Every case here is what a user would see the moment
 * the SDK bump merges, which is exactly when it is too late to find out.
 */
vi.mock('@unicitylabs/sphere-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@unicitylabs/sphere-sdk')>();
  return {
    ...actual,
    NETWORKS: {
      ...actual.NETWORKS,
      // The one thing an onboarding SDK adds: a canonical network id.
      mainnet: { ...actual.NETWORKS.mainnet, networkId: 1 },
    },
  };
});

function setRuntimeConfig(config: Record<string, string>): void {
  (window as unknown as { __SPHERE_RUNTIME_CONFIG__?: unknown }).__SPHERE_RUNTIME_CONFIG__ = config;
}

async function loadNetworkModule() {
  vi.resetModules();
  return import('../../../src/config/network');
}

/** Everything a deployment needs to actually serve mainnet. */
const MAINNET_LIVE = {
  MAINNET_ROLLOUT_ENABLED: 'true',
  WALLET_API_URL_MAINNET: 'https://wallet-api.mainnet.example',
  WALLET_API_URL_TESTNET2: 'https://wallet-api.testnet2.example',
  SUBSCRIPTION_ENABLED: 'true',
  REQUIRE_WALLET_API: 'true',
};

beforeEach(() => {
  setRuntimeConfig({});
  localStorage.clear();
  vi.stubEnv('VITE_REQUIRE_WALLET_API', '');
  vi.stubEnv('VITE_WALLET_API_URL', '');
  vi.stubEnv('VITE_WALLET_API_URL_TESTNET2', '');
  vi.stubEnv('VITE_WALLET_API_URL_MAINNET', '');
  vi.stubEnv('VITE_MAINNET_ROLLOUT_ENABLED', '');
  vi.stubEnv('VITE_SUBSCRIPTION_ENABLED', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  setRuntimeConfig({});
  localStorage.clear();
});

describe('the day the SDK onboards mainnet', () => {
  it('offers mainnet once the SDK knows it, the deployment serves it and rollout is on', async () => {
    setRuntimeConfig(MAINNET_LIVE);
    const mod = await loadNetworkModule();
    const mainnet = mod.SUPPORTED_NETWORKS.find((n) => n.id === 'mainnet');
    expect(mainnet?.available).toBe(true);
    expect(mainnet?.unavailableReason).toBeUndefined();
  });

  it('still withholds it while the rollout switch is off — an SDK bump is not a launch', async () => {
    setRuntimeConfig({ ...MAINNET_LIVE, MAINNET_ROLLOUT_ENABLED: '' });
    const mod = await loadNetworkModule();
    const mainnet = mod.SUPPORTED_NETWORKS.find((n) => n.id === 'mainnet');
    expect(mainnet?.available).toBe(false);
    expect(mainnet?.unavailableReason).toBe('not-rolled-out');
  });

  it('still withholds it where this deployment has no mainnet backend', async () => {
    setRuntimeConfig({ ...MAINNET_LIVE, WALLET_API_URL_MAINNET: '' });
    const mod = await loadNetworkModule();
    const mainnet = mod.SUPPORTED_NETWORKS.find((n) => n.id === 'mainnet');
    expect(mainnet?.available).toBe(false);
    expect(mainnet?.unavailableReason).toBe('not-served-here');
  });

  it('still refuses it on the shared build-time aggregator key', async () => {
    // The reason the pinned-SDK suite could never actually observe: without
    // per-wallet subscription keys, buildProviders throws for a real-value
    // network, so the row must not be offered at all.
    setRuntimeConfig({ ...MAINNET_LIVE, SUBSCRIPTION_ENABLED: '' });
    const mod = await loadNetworkModule();
    const mainnet = mod.SUPPORTED_NETWORKS.find((n) => n.id === 'mainnet');
    expect(mainnet?.available).toBe(false);
    expect(mainnet?.unavailableReason).toBe('not-served-here');
  });

  it('lets the switch through and honours a persisted mainnet choice', async () => {
    setRuntimeConfig(MAINNET_LIVE);
    localStorage.setItem('sphere_active_network', 'mainnet');
    const mod = await loadNetworkModule();
    expect(mod.isSwitchableNetwork('mainnet')).toBe(true);
    expect(mod.resolveActiveNetwork('mainnet')).toBe('mainnet');
    expect(mod.SPHERE_NETWORK).toBe('mainnet');
    // The choice was honoured, so there is nothing to explain.
    expect(mod.NETWORK_DOWNGRADED_FROM).toBeNull();
  });

  it('invites a testnet2 wallet exactly once instead of moving it', async () => {
    setRuntimeConfig(MAINNET_LIVE);
    const mod = await loadNetworkModule();
    // Nobody is relocated: the start network is still the deployment default.
    expect(mod.SPHERE_NETWORK).toBe('testnet2');
    expect(
      mod.shouldAnnounceMainnet({
        active: mod.SPHERE_NETWORK,
        networks: mod.SUPPORTED_NETWORKS,
        announced: false,
      }),
    ).toBe(true);
  });
});

describe('a live mainnet still mints nothing', () => {
  it('keeps self-mint closed on mainnet even once it is fully selectable', async () => {
    setRuntimeConfig(MAINNET_LIVE);
    await loadNetworkModule();
    const caps = await import('../../../src/config/networkCapabilities');
    // Availability and mint permission are independent axes: onboarding mainnet
    // must never be what turns Top Up and Swap back on.
    expect(caps.canSelfMint('mainnet')).toBe(false);
    expect(caps.allowsSharedAggregatorKey('mainnet')).toBe(false);
  });
});
