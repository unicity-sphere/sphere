import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getIpfsHttpResolver } from "../../../../../../src/components/wallet/L3/services/IpfsHttpResolver";

// ==========================================
// Mock fetch globally
// ==========================================

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the IPFS config to return a single gateway
vi.mock("../../../../../../src/config/ipfs.config", () => ({
  getAllBackendGatewayUrls: () => ["https://ipfs-test.example.com"],
  getBackendGatewayUrl: () => "https://ipfs-test.example.com",
  IPNS_RESOLUTION_CONFIG: {
    gatewayPathTimeoutMs: 5000,
    perGatewayTimeoutMs: 5000,
  },
}));

// Mock the IPNS subscription client
vi.mock("../../../../../../src/components/wallet/L3/services/IpnsSubscriptionClient", () => ({
  getIpnsSubscriptionClient: () => ({
    subscribe: vi.fn(() => () => {}),
    isConnected: () => false,
  }),
}));

// ==========================================
// Test Suite
// ==========================================

describe("IpfsHttpResolver error classification", () => {
  let resolver: ReturnType<typeof getIpfsHttpResolver>;
  const testIpnsName = "12D3KooWTestPeerId1234567890";

  beforeEach(() => {
    vi.clearAllMocks();
    // Get a fresh resolver instance
    resolver = getIpfsHttpResolver();
    // Clear cache to avoid interference between tests
    resolver.invalidateIpnsCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("HTTP 404 response", () => {
    it("should return NOT_FOUND error type for HTTP 404", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Map([["X-IPNS-Source", "cache"]]),
      });

      const result = await resolver.resolveIpnsName(testIpnsName);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe("NOT_FOUND");
    });
  });

  describe("HTTP 500 with 'routing: not found' message", () => {
    it("should return NOT_FOUND error type for Kubo routing not found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Map([["X-IPNS-Source", "kubo"]]),
        json: async () => ({ Message: "routing: not found" }),
      });

      const result = await resolver.resolveIpnsName(testIpnsName);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe("NOT_FOUND");
    });

    it("should return NOT_FOUND for case-insensitive routing not found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Map([["X-IPNS-Source", "kubo"]]),
        json: async () => ({ Message: "Routing: Not Found" }),
      });

      const result = await resolver.resolveIpnsName(testIpnsName);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe("NOT_FOUND");
    });
  });

  describe("HTTP 500 with other error message", () => {
    it("should return NETWORK_ERROR for HTTP 500 with server error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Map([["X-IPNS-Source", "unknown"]]),
        json: async () => ({ Message: "Internal Server Error" }),
      });

      const result = await resolver.resolveIpnsName(testIpnsName);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe("NETWORK_ERROR");
    });
  });

  describe("HTTP 503 Service Unavailable", () => {
    it("should return NETWORK_ERROR for HTTP 503", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        headers: new Map([["X-IPNS-Source", "unknown"]]),
      });

      const result = await resolver.resolveIpnsName(testIpnsName);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe("NETWORK_ERROR");
    });
  });

  describe("Timeout (AbortError)", () => {
    it("should return TIMEOUT error type for AbortError", async () => {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValueOnce(abortError);

      const result = await resolver.resolveIpnsName(testIpnsName);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe("TIMEOUT");
    });
  });

  describe("Network error", () => {
    it("should return NETWORK_ERROR for fetch failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Failed to fetch"));

      const result = await resolver.resolveIpnsName(testIpnsName);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe("NETWORK_ERROR");
    });
  });

  describe("Parse error", () => {
    it("should return PARSE_ERROR when response is missing Extra field", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([["X-IPNS-Source", "cache"]]),
        json: async () => ({}), // Missing Extra field
      });

      const result = await resolver.resolveIpnsName(testIpnsName);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe("PARSE_ERROR");
    });
  });

  describe("Cache behavior for NOT_FOUND", () => {
    it("should NOT record cache failure for NOT_FOUND errors", async () => {
      // First request returns NOT_FOUND
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Map([["X-IPNS-Source", "cache"]]),
      });

      const result1 = await resolver.resolveIpnsName(testIpnsName);
      expect(result1.success).toBe(false);
      expect(result1.errorType).toBe("NOT_FOUND");

      // Clear mock to verify second request is made (not blocked by failure backoff)
      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Map([["X-IPNS-Source", "cache"]]),
      });

      // Second request should NOT be blocked by failure backoff
      // (if it was, the mock wouldn't be called)
      const result2 = await resolver.resolveIpnsName(testIpnsName);

      // Verify fetch was called again (not blocked by backoff)
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result2.success).toBe(false);
      expect(result2.errorType).toBe("NOT_FOUND");
    });

    it("should record cache failure for NETWORK_ERROR", async () => {
      // First request returns network error
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result1 = await resolver.resolveIpnsName(testIpnsName);
      expect(result1.success).toBe(false);
      expect(result1.errorType).toBe("NETWORK_ERROR");

      // Second request should be blocked by failure backoff
      mockFetch.mockClear();

      const result2 = await resolver.resolveIpnsName(testIpnsName);

      // Verify fetch was NOT called (blocked by backoff)
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result2.success).toBe(false);
      // Should return cached failure status
    });
  });
});
