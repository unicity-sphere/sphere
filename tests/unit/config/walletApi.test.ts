import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import {
  getWalletApiBaseUrl,
  getEngineOverride,
  isWalletApiEnabled,
  isWalletApiRequired,
} from "../../../src/config/walletApi";

/** The build default network — the only one the legacy single URL can serve. */
const DEFAULT_NET = "testnet2" as const;

function setRuntimeConfig(config: Record<string, string>): void {
  (window as unknown as { __SPHERE_RUNTIME_CONFIG__?: unknown }).__SPHERE_RUNTIME_CONFIG__ = config;
}

beforeEach(() => {
  // Containers always write every key; dev/Pages ship {} and fall back to env.
  setRuntimeConfig({});
  // Isolate from the developer's local .env: these are read at call time, so a
  // machine that happens to define them would otherwise change the outcome.
  vi.stubEnv('VITE_WALLET_API_URL_TESTNET2', '');
  vi.stubEnv('VITE_WALLET_API_URL_MAINNET', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  setRuntimeConfig({});
});

describe("getWalletApiBaseUrl / isWalletApiEnabled", () => {
  it("is disabled when VITE_WALLET_API_URL is unset", () => {
    vi.stubEnv("VITE_WALLET_API_URL", "");
    vi.stubEnv("VITE_REQUIRE_WALLET_API", ""); // isolate from local .env (#351 assert)
    expect(getWalletApiBaseUrl(DEFAULT_NET)).toBeNull();
    expect(isWalletApiEnabled(DEFAULT_NET)).toBe(false);
  });

  it("passes absolute URLs through", () => {
    vi.stubEnv("VITE_WALLET_API_URL", "http://127.0.0.1:3000");
    expect(getWalletApiBaseUrl(DEFAULT_NET)).toBe("http://127.0.0.1:3000/");
    expect(isWalletApiEnabled(DEFAULT_NET)).toBe(true);
  });

  it("resolves relative URLs (dev/preview proxy paths) against the app origin", () => {
    vi.stubEnv("VITE_WALLET_API_URL", "/wallet-api");
    expect(getWalletApiBaseUrl(DEFAULT_NET)).toBe(`${window.location.origin}/wallet-api`);
  });
});

describe("per-network resolution", () => {
  it("the legacy single URL serves ONLY the build default network", () => {
    vi.stubEnv("VITE_WALLET_API_URL", "https://wallet-api.staging.unicity.network");
    vi.stubEnv("VITE_REQUIRE_WALLET_API", "");

    expect(isWalletApiEnabled(DEFAULT_NET)).toBe(true);
    // Never let one deployment's backend answer for another network: the SDK
    // client is bound to the network and its sign-in would be refused.
    expect(isWalletApiEnabled("mainnet")).toBe(false);
    expect(getWalletApiBaseUrl("mainnet")).toBeNull();
  });

  it("a runtime per-network URL enables that network and wins over the legacy env", () => {
    vi.stubEnv("VITE_WALLET_API_URL", "https://legacy.example");
    setRuntimeConfig({
      WALLET_API_URL_TESTNET2: "https://tn2.example",
      WALLET_API_URL_MAINNET: "https://mainnet.example",
    });

    expect(getWalletApiBaseUrl(DEFAULT_NET)).toBe("https://tn2.example/");
    expect(getWalletApiBaseUrl("mainnet")).toBe("https://mainnet.example/");
    expect(isWalletApiEnabled("mainnet")).toBe(true);
  });

  it("an empty runtime value means 'not set on the container' and falls back to env", () => {
    vi.stubEnv("VITE_WALLET_API_URL", "https://legacy.example");
    setRuntimeConfig({ WALLET_API_URL_TESTNET2: "", WALLET_API_URL_MAINNET: "" });

    expect(getWalletApiBaseUrl(DEFAULT_NET)).toBe("https://legacy.example/");
    expect(isWalletApiEnabled("mainnet")).toBe(false);
  });

  it("a network outside SUPPORTED_NETWORKS is never wallet-api served — and no #351 throw", () => {
    vi.stubEnv("VITE_WALLET_API_URL", "https://wallet-api.staging.unicity.network");
    vi.stubEnv("VITE_REQUIRE_WALLET_API", "true");
    // Subject changed from 'dev' (the network sphere-sdk 0.16.0-dev.1 deleted)
    // to 'testnet', now the only NetworkType with no RUNTIME_KEY entry. The
    // invariant is the same one and it is the load-bearing half: a network the
    // switcher cannot select gets no URL AND does not arm the #351 assert, so
    // a REQUIRE_WALLET_API deployment is not thrown by merely being asked
    // about a network it never offers.
    expect(getWalletApiBaseUrl("testnet")).toBeNull();
    expect(isWalletApiEnabled("testnet")).toBe(false);
  });
});

describe("VITE_REQUIRE_WALLET_API composition assert (#351)", () => {
  // "no throw" here means only that THIS module stays quiet; the SDK still
  // refuses a walletApi-less composition at Sphere.init. There is no legacy
  // local-custody composition for the null to select any more.
  it("flag unset + URL unset → null, and this module does not throw", () => {
    vi.stubEnv("VITE_REQUIRE_WALLET_API", "");
    vi.stubEnv("VITE_WALLET_API_URL", "");
    expect(isWalletApiRequired()).toBe(false);
    expect(getWalletApiBaseUrl(DEFAULT_NET)).toBeNull();
  });

  it("flag set + URL unset → throws naming the var to set", () => {
    vi.stubEnv("VITE_REQUIRE_WALLET_API", "true");
    vi.stubEnv("VITE_WALLET_API_URL", "");
    expect(isWalletApiRequired()).toBe(true);
    expect(() => getWalletApiBaseUrl(DEFAULT_NET)).toThrow(/VITE_REQUIRE_WALLET_API/);
    expect(() => getWalletApiBaseUrl(DEFAULT_NET)).toThrow(/WALLET_API_URL_TESTNET2/);
    expect(() => getWalletApiBaseUrl(DEFAULT_NET)).toThrow(/custody/);
  });

  it("any non-false flag value arms the assert ('1', 'yes')", () => {
    vi.stubEnv("VITE_WALLET_API_URL", "");
    for (const value of ["1", "yes"]) {
      vi.stubEnv("VITE_REQUIRE_WALLET_API", value);
      expect(isWalletApiRequired()).toBe(true);
      expect(() => getWalletApiBaseUrl(DEFAULT_NET)).toThrow(/WALLET_API_URL/);
    }
  });

  it("explicit opt-outs 'false' and '0' disarm the assert", () => {
    vi.stubEnv("VITE_WALLET_API_URL", "");
    for (const value of ["false", "0"]) {
      vi.stubEnv("VITE_REQUIRE_WALLET_API", value);
      expect(isWalletApiRequired()).toBe(false);
      expect(getWalletApiBaseUrl(DEFAULT_NET)).toBeNull();
    }
  });

  it("flag set + URL set → normal wallet-api composition (no throw)", () => {
    vi.stubEnv("VITE_REQUIRE_WALLET_API", "true");
    vi.stubEnv("VITE_WALLET_API_URL", "https://wallet-api.staging.unicity.network");
    expect(getWalletApiBaseUrl(DEFAULT_NET)).toBe("https://wallet-api.staging.unicity.network/");
    expect(isWalletApiEnabled(DEFAULT_NET)).toBe(true);
  });

  it("isWalletApiEnabled never throws (render-path safety): misconfigured build reports false", () => {
    vi.stubEnv("VITE_REQUIRE_WALLET_API", "true");
    vi.stubEnv("VITE_WALLET_API_URL", "");
    expect(isWalletApiEnabled(DEFAULT_NET)).toBe(false);
  });
});

describe("getEngineOverride", () => {
  it("is null when neither override is set", () => {
    vi.stubEnv("VITE_AGGREGATOR_URL", "");
    vi.stubEnv("VITE_TRUSTBASE_URL", "");
    expect(getEngineOverride(DEFAULT_NET)).toBeNull();
  });

  it("resolves both URLs when both are set", () => {
    vi.stubEnv("VITE_AGGREGATOR_URL", "/local-agg");
    vi.stubEnv("VITE_TRUSTBASE_URL", "/local-agg/trustbase.json");
    expect(getEngineOverride(DEFAULT_NET)).toEqual({
      aggregatorUrl: `${window.location.origin}/local-agg`,
      trustBaseUrl: `${window.location.origin}/local-agg/trustbase.json`,
    });
  });

  it("fails loud when only one of the pair is set (trustbase mixing guard)", () => {
    vi.stubEnv("VITE_AGGREGATOR_URL", "/local-agg");
    vi.stubEnv("VITE_TRUSTBASE_URL", "");
    expect(() => getEngineOverride(DEFAULT_NET)).toThrow(/must be set together/);

    vi.stubEnv("VITE_AGGREGATOR_URL", "");
    vi.stubEnv("VITE_TRUSTBASE_URL", "/local-agg/trustbase.json");
    expect(() => getEngineOverride(DEFAULT_NET)).toThrow(/must be set together/);
  });

  it("does not follow a network switch — that would mix trustbases", () => {
    // A gateway+trustbase pair IS a network, and there is only one pair of
    // vars, so the override describes the network the deployment starts on.
    // Applying it to another network is exactly the mixing the pairing rule
    // exists to prevent; before switching existed this could not arise.
    vi.stubEnv("VITE_AGGREGATOR_URL", "/local-agg");
    vi.stubEnv("VITE_TRUSTBASE_URL", "/local-agg/trustbase.json");

    expect(getEngineOverride("testnet")).toBeNull();
    expect(getEngineOverride("mainnet")).toBeNull();
    // ...and still applies where it was configured.
    expect(getEngineOverride(DEFAULT_NET)).not.toBeNull();
  });

  it("still validates the pairing before scoping (a half-set override is a bug anywhere)", () => {
    vi.stubEnv("VITE_AGGREGATOR_URL", "/local-agg");
    vi.stubEnv("VITE_TRUSTBASE_URL", "");
    expect(() => getEngineOverride("testnet")).toThrow(/must be set together/);
  });
});
describe('a whitespace-only URL is a MISSING url, not a configured one', () => {
  beforeEach(() => {
    // testnet2 is LEGACY_URL_NETWORK, so it also falls back to the single global
    // URL — which a developer's .env sets. The suite's setup does not stub that
    // one, and without it these cases pass for the wrong reason.
    vi.stubEnv('VITE_WALLET_API_URL', '');
  });

  it('does not make a network selectable', () => {
    // `-z` in the shell and `!== ''` in TS both accept ' '. It then reaches
    // `new URL(' ', origin)`, which resolves to the WALLET'S OWN origin — so the
    // network would launch with its custody backend pointing at the app rather
    // than failing closed.
    setRuntimeConfig({ WALLET_API_URL_TESTNET2: '   ' });
    expect(isWalletApiEnabled(DEFAULT_NET)).toBe(false);
    expect(getWalletApiBaseUrl(DEFAULT_NET)).toBeNull();
  });

  it('still accepts a real url with incidental padding', () => {
    setRuntimeConfig({ WALLET_API_URL_TESTNET2: '  https://wallet-api.example  ' });
    // Normalised through `new URL`, hence the trailing slash.
    expect(getWalletApiBaseUrl(DEFAULT_NET)).toBe('https://wallet-api.example/');
  });
});
