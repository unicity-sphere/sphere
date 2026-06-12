import { describe, it, expect, afterEach, vi } from "vitest";
import {
  getWalletApiBaseUrl,
  getEngineOverride,
  isWalletApiEnabled,
  isWalletApiRequired,
} from "../../../src/config/walletApi";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getWalletApiBaseUrl / isWalletApiEnabled", () => {
  it("is disabled when VITE_WALLET_API_URL is unset", () => {
    vi.stubEnv("VITE_WALLET_API_URL", "");
    vi.stubEnv("VITE_REQUIRE_WALLET_API", ""); // isolate from local .env (#351 assert)
    expect(getWalletApiBaseUrl()).toBeNull();
    expect(isWalletApiEnabled()).toBe(false);
  });

  it("passes absolute URLs through", () => {
    vi.stubEnv("VITE_WALLET_API_URL", "http://127.0.0.1:3000");
    expect(getWalletApiBaseUrl()).toBe("http://127.0.0.1:3000/");
    expect(isWalletApiEnabled()).toBe(true);
  });

  it("resolves relative URLs (dev/preview proxy paths) against the app origin", () => {
    vi.stubEnv("VITE_WALLET_API_URL", "/wallet-api");
    expect(getWalletApiBaseUrl()).toBe(`${window.location.origin}/wallet-api`);
  });
});

describe("VITE_REQUIRE_WALLET_API composition assert (#351)", () => {
  it("flag unset + URL unset → legacy composition allowed (null, no throw)", () => {
    vi.stubEnv("VITE_REQUIRE_WALLET_API", "");
    vi.stubEnv("VITE_WALLET_API_URL", "");
    expect(isWalletApiRequired()).toBe(false);
    expect(getWalletApiBaseUrl()).toBeNull();
  });

  it("flag set + URL unset → throws naming BOTH vars (never silently legacy)", () => {
    vi.stubEnv("VITE_REQUIRE_WALLET_API", "true");
    vi.stubEnv("VITE_WALLET_API_URL", "");
    expect(isWalletApiRequired()).toBe(true);
    expect(() => getWalletApiBaseUrl()).toThrow(/VITE_REQUIRE_WALLET_API/);
    expect(() => getWalletApiBaseUrl()).toThrow(/VITE_WALLET_API_URL/);
    expect(() => getWalletApiBaseUrl()).toThrow(/custody/);
  });

  it("any non-false flag value arms the assert ('1', 'yes')", () => {
    vi.stubEnv("VITE_WALLET_API_URL", "");
    for (const value of ["1", "yes"]) {
      vi.stubEnv("VITE_REQUIRE_WALLET_API", value);
      expect(isWalletApiRequired()).toBe(true);
      expect(() => getWalletApiBaseUrl()).toThrow(/VITE_WALLET_API_URL/);
    }
  });

  it("explicit opt-outs 'false' and '0' disarm the assert", () => {
    vi.stubEnv("VITE_WALLET_API_URL", "");
    for (const value of ["false", "0"]) {
      vi.stubEnv("VITE_REQUIRE_WALLET_API", value);
      expect(isWalletApiRequired()).toBe(false);
      expect(getWalletApiBaseUrl()).toBeNull();
    }
  });

  it("flag set + URL set → normal wallet-api composition (no throw)", () => {
    vi.stubEnv("VITE_REQUIRE_WALLET_API", "true");
    vi.stubEnv("VITE_WALLET_API_URL", "https://wallet-api.staging.unicity.network");
    expect(getWalletApiBaseUrl()).toBe("https://wallet-api.staging.unicity.network/");
    expect(isWalletApiEnabled()).toBe(true);
  });

  it("isWalletApiEnabled never throws (render-path safety): misconfigured build reports false", () => {
    vi.stubEnv("VITE_REQUIRE_WALLET_API", "true");
    vi.stubEnv("VITE_WALLET_API_URL", "");
    expect(isWalletApiEnabled()).toBe(false);
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
