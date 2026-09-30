import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * The offer depends on what THIS deployment can serve, and that is runtime
 * config read at module load (SUPPORTED_NETWORKS and SPHERE_NETWORK are
 * module-scope consts). So every case re-imports the module under a fresh
 * runtime config instead of mocking the predicate, and never stubs it: the
 * tests must fail if the availability gate and the offer ever disagree.
 *
 * Same harness as tests/unit/config/network.test.ts: vi.resetModules + a
 * dynamic import, `window.__SPHERE_RUNTIME_CONFIG__` with STRING values (the
 * flags read exactly 'true'), and the developer's local .env stubbed out.
 */
function setRuntimeConfig(config: Record<string, string>): void {
  (window as unknown as { __SPHERE_RUNTIME_CONFIG__?: unknown }).__SPHERE_RUNTIME_CONFIG__ = config;
}

async function load(runtime: Record<string, string>, opts: { walletOn?: 'mainnet' } = {}) {
  vi.resetModules();
  setRuntimeConfig(runtime);
  // SPHERE_NETWORK is resolved once at module load from this key, so it has to
  // be in place before the import. Without it the wallet runs on testnet2.
  if (opts.walletOn) localStorage.setItem('sphere_active_network', opts.walletOn);
  return import('../../../src/components/connect/networkSwitchOffer');
}

beforeEach(() => {
  setRuntimeConfig({});
  localStorage.clear();
  sessionStorage.clear();
  // Isolate from the developer's local .env, which sets a wallet-api URL.
  vi.stubEnv('VITE_REQUIRE_WALLET_API', '');
  vi.stubEnv('VITE_WALLET_API_URL', '');
  vi.stubEnv('VITE_WALLET_API_URL_TESTNET2', '');
  vi.stubEnv('VITE_WALLET_API_URL_MAINNET', '');
  vi.stubEnv('VITE_MAINNET_ROLLOUT_ENABLED', '');
  vi.stubEnv('VITE_SUBSCRIPTION_ENABLED', '');
  vi.stubEnv('VITE_DEFAULT_NETWORK', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  setRuntimeConfig({});
  localStorage.clear();
  sessionStorage.clear();
});

/** Everything a deployment needs to actually serve BOTH networks. */
const MAINNET_LIVE = {
  MAINNET_ROLLOUT_ENABLED: 'true',
  WALLET_API_URL_MAINNET: 'https://wallet-api.mainnet.example',
  WALLET_API_URL_TESTNET2: 'https://wallet-api.testnet2.example',
  SUBSCRIPTION_ENABLED: 'true',
};

describe('evaluateSwitchOffer', () => {
  it('offers mainnet to a dApp that declared it, when this deployment serves it', async () => {
    const { evaluateSwitchOffer } = await load(MAINNET_LIVE);
    const r = evaluateSwitchOffer({
      clientNetwork: { id: 1, name: 'mainnet' },
      walletNetwork: { id: 4 },
      suppressed: false,
    });
    expect(r).toEqual({
      kind: 'offer',
      target: 'mainnet',
      targetLabel: 'Mainnet',
      currentLabel: 'Testnet',
      isMainnet: true,
    });
  });

  it('flags a non-mainnet target so the caller does not need the network table', async () => {
    // The wallet has to be ON mainnet for testnet2 to be a target at all.
    const { evaluateSwitchOffer } = await load(MAINNET_LIVE, { walletOn: 'mainnet' });
    const r = evaluateSwitchOffer({
      clientNetwork: { id: 4, name: 'testnet2' },
      walletNetwork: { id: 1 },
      suppressed: false,
    });
    expect(r).toEqual({
      kind: 'offer',
      target: 'testnet2',
      targetLabel: 'Testnet',
      currentLabel: 'Mainnet',
      isMainnet: false,
    });
  });

  // The id the peer sent is the ONLY thing that decides the target. The name it
  // sent is display text we never trust: a hostile origin can label id 1
  // "Testnet" and would otherwise talk a user onto real funds.
  it('ignores the peer-declared name entirely', async () => {
    const { evaluateSwitchOffer } = await load(MAINNET_LIVE);
    const r = evaluateSwitchOffer({
      clientNetwork: { id: 1, name: 'Testnet (totally safe)' },
      walletNetwork: { id: 4 },
      suppressed: false,
    });
    expect(r.kind).toBe('offer');
    if (r.kind === 'offer') {
      expect(r.target).toBe('mainnet');
      expect(r.targetLabel).toBe('Mainnet');
      expect(r.isMainnet).toBe(true);
    }
  });

  it('refuses an id no live network holds', async () => {
    const { evaluateSwitchOffer } = await load(MAINNET_LIVE);
    expect(
      evaluateSwitchOffer({ clientNetwork: { id: 999 }, walletNetwork: { id: 4 }, suppressed: false }),
    ).toEqual({ kind: 'refuse', reason: 'unknown-network' });
  });

  it('refuses when the resolved target is the network the wallet is already on', async () => {
    const { evaluateSwitchOffer } = await load(MAINNET_LIVE);
    expect(
      evaluateSwitchOffer({ clientNetwork: { id: 4 }, walletNetwork: { id: 4 }, suppressed: false }),
    ).toEqual({ kind: 'refuse', reason: 'already-current' });
  });

  it('refuses when the wallet does not know its own network', async () => {
    const { evaluateSwitchOffer } = await load(MAINNET_LIVE);
    expect(
      evaluateSwitchOffer({ clientNetwork: { id: 1 }, walletNetwork: { id: -1 }, suppressed: false }),
    ).toEqual({ kind: 'refuse', reason: 'wallet-network-unknown' });
  });

  it('refuses when the host reports a network other than the one this wallet runs on', async () => {
    // The wallet runs on testnet2 (id 4) but the caller claims id 1. The SDK's
    // trust base is the authority on which side of the comparison is true, so
    // any sentence a prompt could say would be a guess.
    const { evaluateSwitchOffer } = await load(MAINNET_LIVE);
    expect(
      evaluateSwitchOffer({ clientNetwork: { id: 1 }, walletNetwork: { id: 1 }, suppressed: false }),
    ).toEqual({ kind: 'refuse', reason: 'wallet-network-unknown' });
  });

  it('refuses a target this deployment cannot serve', async () => {
    // Mainnet rollout off: the row exists but is not available, and
    // setActiveNetwork would throw on it.
    const { evaluateSwitchOffer } = await load({ ...MAINNET_LIVE, MAINNET_ROLLOUT_ENABLED: 'false' });
    expect(
      evaluateSwitchOffer({ clientNetwork: { id: 1 }, walletNetwork: { id: 4 }, suppressed: false }),
    ).toEqual({ kind: 'refuse', reason: 'coming-soon' });
  });

  it('says not-served-here, not coming-soon, when this deployment has no backend for the target', async () => {
    // Rollout is ON and subscriptions are on, but there is no wallet-api URL for
    // mainnet. The network is live for everyone; only this deployment lacks it,
    // and the copy for that says something different from "coming soon".
    const { evaluateSwitchOffer } = await load({ ...MAINNET_LIVE, WALLET_API_URL_MAINNET: '' });
    expect(
      evaluateSwitchOffer({ clientNetwork: { id: 1 }, walletNetwork: { id: 4 }, suppressed: false }),
    ).toEqual({ kind: 'refuse', reason: 'not-served-here' });
  });

  it('refuses when the user muted this origin for this target', async () => {
    const { evaluateSwitchOffer } = await load(MAINNET_LIVE);
    expect(
      evaluateSwitchOffer({ clientNetwork: { id: 1 }, walletNetwork: { id: 4 }, suppressed: true }),
    ).toEqual({ kind: 'refuse', reason: 'suppressed' });
  });

  describe('order of the refusals', () => {
    it('a muted origin is refused as muted before anything that would name a network', async () => {
      const { evaluateSwitchOffer } = await load(MAINNET_LIVE);
      expect(
        evaluateSwitchOffer({ clientNetwork: { id: 999 }, walletNetwork: { id: -1 }, suppressed: true }),
      ).toEqual({ kind: 'refuse', reason: 'suppressed' });
    });

    it('already-current is reported as itself even when that network is not served here', async () => {
      // No testnet2 backend: SPHERE_NETWORK still resolves to the build fallback
      // testnet2, so the wallet is "on" a network the availability gate would
      // call unavailable. That inconsistent state must be logged as what it is,
      // not as "not served here" for the network the wallet is already on.
      const { evaluateSwitchOffer } = await load({ ...MAINNET_LIVE, WALLET_API_URL_TESTNET2: '' });
      expect(
        evaluateSwitchOffer({ clientNetwork: { id: 4 }, walletNetwork: { id: 4 }, suppressed: false }),
      ).toEqual({ kind: 'refuse', reason: 'already-current' });
    });
  });

  // NEGATIVE CONTROL. This is why resolveSphereNetwork exists: a lookup built over
  // NETWORKS answers id 4 with the legacy alias, which SUPPORTED_NETWORKS does not
  // list and setActiveNetwork throws on.
  it('never resolves id 4 to the legacy testnet alias', async () => {
    const { evaluateSwitchOffer } = await load(MAINNET_LIVE, { walletOn: 'mainnet' });
    const r = evaluateSwitchOffer({ clientNetwork: { id: 4 }, walletNetwork: { id: 1 }, suppressed: false });
    expect(r.kind).toBe('offer');
    if (r.kind === 'offer') expect(r.target).not.toBe('testnet');
  });

  it('only ever offers a target that setActiveNetwork will accept', async () => {
    // The whole point of the pure function: an offer must never become an
    // exception at the click. Feed the offer's own target to the real predicate.
    vi.resetModules();
    setRuntimeConfig(MAINNET_LIVE);
    const offerMod = await import('../../../src/components/connect/networkSwitchOffer');
    const netMod = await import('../../../src/config/network');
    const r = offerMod.evaluateSwitchOffer({
      clientNetwork: { id: 1 },
      walletNetwork: { id: 4 },
      suppressed: false,
    });
    expect(r.kind).toBe('offer');
    if (r.kind === 'offer') expect(netMod.isSwitchableNetwork(r.target)).toBe(true);
  });
});
