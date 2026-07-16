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

  it("'dev' is never wallet-api served — it composes local custody", () => {
    vi.stubEnv("VITE_WALLET_API_URL", "https://wallet-api.staging.unicity.network");
    vi.stubEnv("VITE_REQUIRE_WALLET_API", "true");
    // Exempt from the #351 assert on purpose: arming it would break the very
    // deployment used to verify switching (Pages sets REQUIRE_WALLET_API).
    expect(getWalletApiBaseUrl("dev")).toBeNull();
    expect(isWalletApiEnabled("dev")).toBe(false);
  });
});

describe("VITE_REQUIRE_WALLET_API composition assert (#351)", () => {
  it("flag unset + URL unset → legacy composition allowed (null, no throw)", () => {
    vi.stubEnv("VITE_REQUIRE_WALLET_API", "");
    vi.stubEnv("VITE_WALLET_API_URL", "");
    expect(isWalletApiRequired()).toBe(false);
    expect(getWalletApiBaseUrl(DEFAULT_NET)).toBeNull();
  });

  it("flag set + URL unset → throws naming the var to set (never silently legacy)", () => {
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
    expect(getEngineOverride()).toBeNull();
  });

  it("resolves both URLs when both are set", () => {
    vi.stubEnv("VITE_AGGREGATOR_URL", "/local-agg");
    vi.stubEnv("VITE_TRUSTBASE_URL", "/local-agg/trustbase.json");
    expect(getEngineOverride()).toEqual({
      aggregatorUrl: `${window.location.origin}/local-agg`,
      trustBaseUrl: `${window.location.origin}/local-agg/trustbase.json`,
    });
  });

  it("fails loud when only one of the pair is set (trustbase mixing guard)", () => {
    vi.stubEnv("VITE_AGGREGATOR_URL", "/local-agg");
    vi.stubEnv("VITE_TRUSTBASE_URL", "");
    expect(() => getEngineOverride()).toThrow(/must be set together/);

    vi.stubEnv("VITE_AGGREGATOR_URL", "");
    vi.stubEnv("VITE_TRUSTBASE_URL", "/local-agg/trustbase.json");
    expect(() => getEngineOverride()).toThrow(/must be set together/);
  });
});
