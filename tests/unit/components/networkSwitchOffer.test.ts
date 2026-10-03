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
  vi.doUnmock('../../../src/config/networkCapabilities');
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
      movesRealFunds: true,
    });
  });

  // "Does this target move real funds" is asked of the wallet's fail-closed test-money
  // allowlist (config/networkCapabilities), the same predicate every other money gate uses,
  // not of the name 'mainnet'. The only way to see that from here is to take a target OUT of
  // the allowlist: with two served networks there is no third to try, and a second
  // real-value network is exactly what the allowlist exists to deny until it is listed on
  // purpose. The name is never 'mainnet' in this case, so a string compare cannot pass it.
  it('flags a served target the test-money allowlist does not list, whatever it is called', async () => {
    vi.resetModules();
    setRuntimeConfig(MAINNET_LIVE);
    localStorage.setItem('sphere_active_network', 'mainnet');
    vi.doMock('../../../src/config/networkCapabilities', async (importOriginal) => {
      const real = await importOriginal<typeof import('../../../src/config/networkCapabilities')>();
      return { ...real, isTestMoney: (network: string) => network !== 'testnet2' && real.isTestMoney(network) };
    });
    const { evaluateSwitchOffer } = await import('../../../src/components/connect/networkSwitchOffer');

    const r = evaluateSwitchOffer({
      clientNetwork: { id: 4 },
      walletNetwork: { id: 1 },
      suppressed: false,
    });

    expect(r).toMatchObject({ kind: 'offer', target: 'testnet2', movesRealFunds: true });
  });

  it('does not flag a target the allowlist lists, so the flag is not simply always on', async () => {
    const { evaluateSwitchOffer } = await load(MAINNET_LIVE, { walletOn: 'mainnet' });
    const r = evaluateSwitchOffer({ clientNetwork: { id: 4 }, walletNetwork: { id: 1 }, suppressed: false });
    expect(r).toMatchObject({ kind: 'offer', target: 'testnet2', movesRealFunds: false });
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
      movesRealFunds: false,
    });
  });

  // The id the peer sent is the ONLY thing that decides the target. The name it
  // sent is display text we never trust: a hostile origin can label id 1
  // "Testnet" and would otherwise talk a user onto real funds.
  //
  // The realistic attack is a name that MATCHES a network the wallet knows, not
  // a made-up string, so each row dresses one network's id in the other's name.
  // Both forms a peer could send are covered (the display label and the registry
  // key), and both directions, so a rewrite cannot pass by special-casing one.
  it.each([
    {
      why: 'id 1 named Testnet (display label)',
      client: { id: 1, name: 'Testnet' },
      walletOn: undefined,
      wallet: { id: 4 },
      expected: { target: 'mainnet', targetLabel: 'Mainnet', currentLabel: 'Testnet', movesRealFunds: true },
    },
    {
      why: 'id 1 named testnet2 (registry key)',
      client: { id: 1, name: 'testnet2' },
      walletOn: undefined,
      wallet: { id: 4 },
      expected: { target: 'mainnet', targetLabel: 'Mainnet', currentLabel: 'Testnet', movesRealFunds: true },
    },
    {
      why: 'id 4 named Mainnet (the reverse)',
      client: { id: 4, name: 'Mainnet' },
      walletOn: 'mainnet' as const,
      wallet: { id: 1 },
      expected: { target: 'testnet2', targetLabel: 'Testnet', currentLabel: 'Mainnet', movesRealFunds: false },
    },
  ])('takes target and both labels from the id alone: $why', async ({ client, walletOn, wallet, expected }) => {
    const { evaluateSwitchOffer } = await load(MAINNET_LIVE, { walletOn });
    expect(evaluateSwitchOffer({ clientNetwork: client, walletNetwork: wallet, suppressed: false })).toEqual({
      kind: 'offer',
      ...expected,
    });
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

  // A malformed id gets no validation of its own: resolveSphereNetwork matches by
  // strict equality, so none of these can match an entry and each falls out as
  // an unknown network. Zero is in the table on purpose: it is a legal id, and
  // it must be refused because no network holds it, never for being falsy. While
  // no network holds 0 that reason is the same as for the malformed ids, so this
  // row cannot tell a truthiness check from a registry miss; if a network ever
  // does hold 0, it needs its own row expecting an offer.
  it.each([
    ['NaN', Number.NaN],
    ['a negative id', -1],
    ['a fractional id', 1.5],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['zero (a legal id no network holds)', 0],
  ])('refuses %s as an unknown network', async (_label, id) => {
    const { evaluateSwitchOffer } = await load(MAINNET_LIVE);
    expect(
      evaluateSwitchOffer({ clientNetwork: { id }, walletNetwork: { id: 4 }, suppressed: false }),
    ).toEqual({ kind: 'refuse', reason: 'unknown-network' });
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

    it('the wallet side is judged before the peer id is resolved', async () => {
      // Both sides are bad. Resolving the peer first would report the peer's
      // fault, but comparing anything against a wallet network we do not trust is
      // a guess, so the wallet's own state is the more truthful reason.
      const { evaluateSwitchOffer } = await load(MAINNET_LIVE);
      expect(
        evaluateSwitchOffer({ clientNetwork: { id: 999 }, walletNetwork: { id: -1 }, suppressed: false }),
      ).toEqual({ kind: 'refuse', reason: 'wallet-network-unknown' });
    });

    it('a wallet that disagrees with this deployment is not reported as already-current', async () => {
      // The host claims id 1 while this deployment runs testnet2 (id 4), and the
      // dApp declares testnet2. Answering "already on that network" would take
      // the host's claim at face value; the trust base says the claim is wrong.
      const { evaluateSwitchOffer } = await load(MAINNET_LIVE);
      expect(
        evaluateSwitchOffer({ clientNetwork: { id: 4 }, walletNetwork: { id: 1 }, suppressed: false }),
      ).toEqual({ kind: 'refuse', reason: 'wallet-network-unknown' });
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
