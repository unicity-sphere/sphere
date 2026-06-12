import { describe, it, expect, afterEach, vi } from "vitest";
import {
  getWalletApiBaseUrl,
  getEngineOverride,
  isWalletApiEnabled,
} from "../../../src/config/walletApi";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getWalletApiBaseUrl / isWalletApiEnabled", () => {
  it("is disabled when VITE_WALLET_API_URL is unset", () => {
    vi.stubEnv("VITE_WALLET_API_URL", "");
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
