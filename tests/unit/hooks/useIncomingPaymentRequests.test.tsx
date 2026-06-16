import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  useIncomingPaymentRequests,
  PaymentRequestStatus,
} from "../../../src/components/wallet/L3/hooks/useIncomingPaymentRequests";

// ============================================================================
// Fake sphere: implements exactly the PaymentsModule surface the hook is
// allowed to use. There is deliberately NO getTransport() — the legacy
// implementation bypassed the module via the transport, which silently
// no-ops on the wallet-api path; any regression to it throws here.
// ============================================================================

type SdkStatus = "pending" | "accepted" | "rejected" | "paid" | "expired";

interface FakeSdkRequest {
  id: string;
  senderPubkey: string;
  senderNametag?: string;
  amount: string;
  coinId: string;
  symbol: string;
  message?: string;
  requestId: string;
  timestamp: number;
  status: SdkStatus;
}

function makeRequest(id: string, status: SdkStatus = "pending"): FakeSdkRequest {
  return {
    id,
    senderPubkey: "02".padEnd(66, "a"),
    senderNametag: "alice",
    amount: "1000",
    coinId: "coin-1",
    symbol: "UCT",
    requestId: `req-${id}`,
    timestamp: Date.now(),
    status,
  };
}

function makeFakeSphere(initial: FakeSdkRequest[] = []) {
  const requests = [...initial];
  const listeners = new Map<string, Set<(data: unknown) => void>>();

  const find = (id: string) => requests.find((r) => r.id === id);

  const sphere = {
    on: (evt: string, fn: (data: unknown) => void) => {
      if (!listeners.has(evt)) listeners.set(evt, new Set());
      listeners.get(evt)!.add(fn);
    },
    off: (evt: string, fn: (data: unknown) => void) => {
      listeners.get(evt)?.delete(fn);
    },
    payments: {
      getPaymentRequests: vi.fn(() => requests.map((r) => ({ ...r }))),
      acceptPaymentRequest: vi.fn(async (id: string) => {
        const r = find(id);
        if (r) r.status = "accepted";
      }),
      rejectPaymentRequest: vi.fn(async (id: string) => {
        const r = find(id);
        if (r) r.status = "rejected";
      }),
      payPaymentRequest: vi.fn(async (id: string) => {
        const r = find(id);
        if (r) r.status = "paid";
        return { success: true, id: "transfer-1" };
      }),
      clearProcessedPaymentRequests: vi.fn(() => {
        for (let i = requests.length - 1; i >= 0; i--) {
          if (requests[i].status !== "pending") requests.splice(i, 1);
        }
      }),
    },
    // Test-side helpers
    _receive: (r: FakeSdkRequest) => {
      requests.unshift(r);
      listeners.get("payment_request:incoming")?.forEach((fn) => fn({ ...r }));
    },
    // Simulate a resolution driven elsewhere (another window / this wallet's
    // other session): the SDK advances the status in its own list, THEN emits
    // the matching event. Mirrors sphere-sdk's paid/rejected/expired surface.
    _resolveRemote: (id: string, status: "paid" | "rejected" | "expired") => {
      const r = find(id);
      if (r) r.status = status;
      const evt = `payment_request:${status}`;
      listeners.get(evt)?.forEach((fn) => fn(r ? { ...r } : { id, status }));
    },
  };
  return sphere;
}

let fakeSphere: ReturnType<typeof makeFakeSphere> | null = null;

vi.mock("../../../src/sdk/hooks/core/useSphere", () => ({
  useSphereContext: () => ({ sphere: fakeSphere }),
}));

beforeEach(() => {
  fakeSphere = null;
});

describe("useIncomingPaymentRequests", () => {
  it("seeds from payments.getPaymentRequests() on mount (sign-in backfill)", () => {
    fakeSphere = makeFakeSphere([makeRequest("a"), makeRequest("b", "expired")]);

    const { result } = renderHook(() => useIncomingPaymentRequests());

    expect(result.current.requests).toHaveLength(2);
    expect(result.current.requests[0].status).toBe(PaymentRequestStatus.PENDING);
    expect(result.current.requests[1].status).toBe(PaymentRequestStatus.EXPIRED);
    expect(result.current.pendingCount).toBe(1);
    // Legacy bridge fields preserved
    expect(result.current.requests[0].amount).toBe(1000n);
    expect(result.current.requests[0].recipientNametag).toBe("alice");
  });

  it("adds requests on payment_request:incoming", async () => {
    fakeSphere = makeFakeSphere();
    const { result } = renderHook(() => useIncomingPaymentRequests());
    expect(result.current.requests).toHaveLength(0);

    act(() => {
      fakeSphere!._receive(makeRequest("live-1"));
    });

    await waitFor(() => expect(result.current.requests).toHaveLength(1));
    expect(result.current.pendingCount).toBe(1);
  });

  it.each([
    ["paid", PaymentRequestStatus.PAID],
    ["rejected", PaymentRequestStatus.REJECTED],
    ["expired", PaymentRequestStatus.EXPIRED],
  ] as const)(
    "drops a request from the actionable view on payment_request:%s (cross-session)",
    async (sdkStatus, uiStatus) => {
      fakeSphere = makeFakeSphere([makeRequest("a")]);
      const { result } = renderHook(() => useIncomingPaymentRequests());
      expect(result.current.pendingCount).toBe(1);
      expect(result.current.requests[0].status).toBe(PaymentRequestStatus.PENDING);

      // Another window (or this wallet's other session) resolves the request.
      act(() => {
        fakeSphere!._resolveRemote("a", sdkStatus);
      });

      // The request leaves the actionable (PENDING) state — its Pay/Decline
      // buttons disappear — and the status reflects the resolution.
      await waitFor(() => expect(result.current.requests[0].status).toBe(uiStatus));
      expect(result.current.pendingCount).toBe(0);
    },
  );

  it("pays through payments.payPaymentRequest (no raw transfer + paid flip)", async () => {
    fakeSphere = makeFakeSphere([makeRequest("a")]);
    const { result } = renderHook(() => useIncomingPaymentRequests());

    await act(() => result.current.pay(result.current.requests[0]));

    expect(fakeSphere.payments.payPaymentRequest).toHaveBeenCalledWith("a");
    expect(result.current.requests[0].status).toBe(PaymentRequestStatus.PAID);
  });

  it("rejects through payments.rejectPaymentRequest (server-confirmed)", async () => {
    fakeSphere = makeFakeSphere([makeRequest("a")]);
    const { result } = renderHook(() => useIncomingPaymentRequests());

    await act(() => result.current.reject(result.current.requests[0]));

    expect(fakeSphere.payments.rejectPaymentRequest).toHaveBeenCalledWith("a");
    expect(result.current.requests[0].status).toBe(PaymentRequestStatus.REJECTED);
  });

  it("propagates a server reject failure and does NOT flip the status", async () => {
    fakeSphere = makeFakeSphere([makeRequest("a")]);
    // 403 non-addressee / 409 non-open propagate from the module — the
    // request must stay pending locally (the respond IS the state change).
    fakeSphere.payments.rejectPaymentRequest.mockRejectedValueOnce(
      new Error("HTTP 409: request is not open"),
    );
    const { result } = renderHook(() => useIncomingPaymentRequests());

    await expect(
      act(() => result.current.reject(result.current.requests[0])),
    ).rejects.toThrow(/409/);

    expect(result.current.requests[0].status).toBe(PaymentRequestStatus.PENDING);
  });

  it("propagates a pay failure and leaves the request pending", async () => {
    fakeSphere = makeFakeSphere([makeRequest("a")]);
    fakeSphere.payments.payPaymentRequest.mockRejectedValueOnce(
      new Error("INSUFFICIENT_FUNDS"),
    );
    const { result } = renderHook(() => useIncomingPaymentRequests());

    await expect(
      act(() => result.current.pay(result.current.requests[0])),
    ).rejects.toThrow(/INSUFFICIENT_FUNDS/);

    expect(result.current.requests[0].status).toBe(PaymentRequestStatus.PENDING);
  });

  it("clearProcessed delegates to the module and keeps pending requests", async () => {
    fakeSphere = makeFakeSphere([makeRequest("a"), makeRequest("b", "paid")]);
    const { result } = renderHook(() => useIncomingPaymentRequests());
    expect(result.current.requests).toHaveLength(2);

    act(() => result.current.clearProcessed());

    await waitFor(() => expect(result.current.requests).toHaveLength(1));
    expect(result.current.requests[0].id).toBe("a");
  });
});
