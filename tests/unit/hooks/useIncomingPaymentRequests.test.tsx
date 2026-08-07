import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { SphereError } from "@unicitylabs/sphere-sdk";
import {
  useIncomingPaymentRequests,
  PaymentRequestStatus,
} from "../../../src/components/wallet/L3/hooks/useIncomingPaymentRequests";
import { PENDING_COMMIT_CODES } from "../../../src/sdk/errors";
import { SubscriptionNotReadyError, type SubscriptionKeyStatus } from "../../../src/sdk/subscription/keyStatus";
import * as subscriptionConfig from "../../../src/config/subscription";

// ============================================================================
// Fake sphere: implements exactly the payments.requests surface the hook is
// allowed to use. There is deliberately NO getTransport() — the legacy
// implementation bypassed the module via the transport, which silently
// no-ops on the wallet-api path; any regression to it throws here.
// ============================================================================

type SdkStatus = "pending" | "rejected" | "paid" | "expired" | "settling";

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
      requests: {
        list: vi.fn(() => requests.map((r) => ({ ...r }))),
        decline: vi.fn(async (id: string) => {
          const r = find(id);
          if (r) r.status = "rejected";
        }),
        pay: vi.fn(async (id: string) => {
          const r = find(id);
          if (r) r.status = "paid";
          return { success: true, id: "transfer-1" };
        }),
        dismissProcessed: vi.fn(() => {
          for (let i = requests.length - 1; i >= 0; i--) {
            if (requests[i].status !== "pending") requests.splice(i, 1);
          }
        }),
      },
    },
    // Test-side helpers
    _setStatus: (id: string, status: SdkStatus) => {
      const r = find(id);
      if (r) r.status = status;
    },
    _receive: (r: FakeSdkRequest) => {
      requests.unshift(r);
      listeners.get("payment_request:incoming")?.forEach((fn) => fn({ ...r }));
    },
    // Simulate a resolution driven elsewhere (another window / this wallet's
    // other session): the SDK advances the status in its own list, THEN emits
    // payment_request:updated. Mirrors sphere-sdk's payments surface.
    _resolveRemote: (id: string, status: "paid" | "rejected" | "expired") => {
      const r = find(id);
      if (r) r.status = status;
      listeners.get("payment_request:updated")?.forEach((fn) => fn({ id, status }));
    },
  };
  return sphere;
}

let fakeSphere: ReturnType<typeof makeFakeSphere> | null = null;
let subscriptionKeyStatus: SubscriptionKeyStatus = "ready";

vi.mock("../../../src/sdk/hooks/core/useSphere", () => ({
  useSphereContext: () => ({ sphere: fakeSphere, subscriptionKeyStatus }),
}));
// SUBSCRIPTION_ENABLED defaults false here (gate inert for the existing tests);
// the readiness-gate tests flip it on. Rest of the module stays real.
vi.mock("../../../src/config/subscription", async (orig) => ({
  ...(await orig<typeof import("../../../src/config/subscription")>()),
  SUBSCRIPTION_ENABLED: false,
}));

beforeEach(() => {
  fakeSphere = null;
  subscriptionKeyStatus = "ready";
  (subscriptionConfig as { SUBSCRIPTION_ENABLED: boolean }).SUBSCRIPTION_ENABLED = false;
});

describe("useIncomingPaymentRequests", () => {
  it("seeds from payments.requests.list() on mount (sign-in backfill)", () => {
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
    "drops a request from the actionable view on payment_request:updated (%s, cross-session)",
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

  it("pays through payments.requests.pay (no raw transfer + paid flip)", async () => {
    fakeSphere = makeFakeSphere([makeRequest("a")]);
    const { result } = renderHook(() => useIncomingPaymentRequests());

    await act(() => result.current.pay(result.current.requests[0]));

    expect(fakeSphere.payments.requests.pay).toHaveBeenCalledWith("a");
    expect(result.current.requests[0].status).toBe(PaymentRequestStatus.PAID);
  });

  it("rejects through payments.requests.decline (server-confirmed)", async () => {
    fakeSphere = makeFakeSphere([makeRequest("a")]);
    const { result } = renderHook(() => useIncomingPaymentRequests());

    await act(() => result.current.reject(result.current.requests[0]));

    expect(fakeSphere.payments.requests.decline).toHaveBeenCalledWith("a");
    expect(result.current.requests[0].status).toBe(PaymentRequestStatus.REJECTED);
  });

  it("propagates a server reject failure and does NOT flip the status", async () => {
    fakeSphere = makeFakeSphere([makeRequest("a")]);
    // 403 non-addressee / 409 non-open propagate from the module — the
    // request must stay pending locally (the respond IS the state change).
    fakeSphere.payments.requests.decline.mockRejectedValueOnce(
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
    fakeSphere.payments.requests.pay.mockRejectedValueOnce(
      new Error("INSUFFICIENT_FUNDS"),
    );
    const { result } = renderHook(() => useIncomingPaymentRequests());

    await expect(
      act(() => result.current.pay(result.current.requests[0])),
    ).rejects.toThrow(/INSUFFICIENT_FUNDS/);

    expect(result.current.requests[0].status).toBe(PaymentRequestStatus.PENDING);
  });

  // #441: requests.pay routes through the same send() as a normal transfer,
  // so it can reject with the possibly-committed keep-open codes. The SDK (0.11.14+)
  // marks the request DURABLY 'settling' (survives reload via its journal) before
  // re-throwing — mirrored here by _setStatus(id, 'settling'). The app swallows the
  // throw and maps 'settling' → ACCEPTED (non-payable). Without that mapping the
  // finally-refresh re-lists it as payable → one-click double-pay.
  it.each(PENDING_COMMIT_CODES)(
    "a %s pay reject is swallowed and the request is held NON-payable via the SDK's durable 'settling' status (no double-pay) (#441)",
    async (code) => {
      fakeSphere = makeFakeSphere([makeRequest("a")]);
      fakeSphere.payments.requests.pay.mockImplementationOnce(async (id: string) => {
        fakeSphere!._setStatus(id, "settling"); // the real SDK's durable mark
        throw new SphereError("possibly committed on-chain", code);
      });
      const { result } = renderHook(() => useIncomingPaymentRequests());
      expect(result.current.pendingCount).toBe(1);

      // pay() RESOLVES (does not throw) — the money is (or may be) on-chain.
      await act(() => result.current.pay(result.current.requests[0]));

      // Mapped to ACCEPTED ('Payment Sent', non-payable) via STATUS_MAP['settling'].
      expect(fakeSphere.payments.requests.pay).toHaveBeenCalledTimes(1);
      expect(result.current.requests[0].status).toBe(PaymentRequestStatus.ACCEPTED);
      expect(result.current.pendingCount).toBe(0);
    },
  );

  it("a 'settling' request stays NON-payable across a remount/reload — the durable SDK status, no in-memory override (#441)", async () => {
    // The SDK durably lists the request 'settling' (its journal survives reload).
    fakeSphere = makeFakeSphere([makeRequest("a", "settling")]);
    const { result, unmount } = renderHook(() => useIncomingPaymentRequests());
    expect(result.current.requests[0].status).toBe(PaymentRequestStatus.ACCEPTED);
    expect(result.current.pendingCount).toBe(0);

    // Remount (a reload / new tab): a fresh hook over the SAME SDK list. The old
    // in-memory override was empty here — its reload gap, the exact double-pay
    // this fix closes. The SDK's durable 'settling' keeps it non-payable.
    unmount();
    const { result: result2 } = renderHook(() => useIncomingPaymentRequests());
    expect(result2.current.requests[0].status).toBe(PaymentRequestStatus.ACCEPTED);
    expect(result2.current.pendingCount).toBe(0);
  });

  it("a settling request advances to PAID when the SDK resolves its linked transfer (resume/cross-session) (#441)", async () => {
    fakeSphere = makeFakeSphere([makeRequest("a", "settling")]);
    const { result } = renderHook(() => useIncomingPaymentRequests());
    expect(result.current.requests[0].status).toBe(PaymentRequestStatus.ACCEPTED); // settling → non-payable

    // SDK later advances the request to a real terminal status (deferred paid).
    act(() => {
      fakeSphere!._resolveRemote("a", "paid");
    });

    await waitFor(() => expect(result.current.requests[0].status).toBe(PaymentRequestStatus.PAID));
    expect(result.current.pendingCount).toBe(0);
  });

  it("refuses to pay while the subscription key is not ready (same keyless-send guard as a normal send)", async () => {
    (subscriptionConfig as { SUBSCRIPTION_ENABLED: boolean }).SUBSCRIPTION_ENABLED = true;
    subscriptionKeyStatus = "provisioning";
    fakeSphere = makeFakeSphere([makeRequest("a")]);
    const { result } = renderHook(() => useIncomingPaymentRequests());

    await expect(
      act(() => result.current.pay(result.current.requests[0])),
    ).rejects.toBeInstanceOf(SubscriptionNotReadyError);

    // The keyless send never left, and the request stays actionable.
    expect(fakeSphere.payments.requests.pay).not.toHaveBeenCalled();
    expect(result.current.requests[0].status).toBe(PaymentRequestStatus.PENDING);
  });

  it("pays once the subscription key is ready (gate is transparent)", async () => {
    (subscriptionConfig as { SUBSCRIPTION_ENABLED: boolean }).SUBSCRIPTION_ENABLED = true;
    subscriptionKeyStatus = "ready";
    fakeSphere = makeFakeSphere([makeRequest("a")]);
    const { result } = renderHook(() => useIncomingPaymentRequests());

    await act(() => result.current.pay(result.current.requests[0]));

    expect(fakeSphere.payments.requests.pay).toHaveBeenCalledWith("a");
    expect(result.current.requests[0].status).toBe(PaymentRequestStatus.PAID);
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
