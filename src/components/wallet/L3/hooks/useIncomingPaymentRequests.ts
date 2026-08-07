import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSphereContext } from '../../../../sdk/hooks/core/useSphere';
import { useSubscriptionKeyGuard } from '../../../../sdk/hooks/subscription';
import { isPendingCommitCode } from '../../../../sdk/errors';
import type { PaymentRequestView as SDKPaymentRequest } from '@unicitylabs/sphere-sdk/payments-v2';

export const PaymentRequestStatus = {
    PENDING: 'PENDING',
    ACCEPTED: 'ACCEPTED',
    REJECTED: 'REJECTED',
    PAID: 'PAID',
    // Backend model is open → paid | declined | expired (§16): a stale request
    // can expire server-side; a pay/reject attempt on it surfaces a 409.
    EXPIRED: 'EXPIRED'
} as const;

export type PaymentRequestStatus = typeof PaymentRequestStatus[keyof typeof PaymentRequestStatus];

const STATUS_MAP: Record<SDKPaymentRequest['status'], PaymentRequestStatus> = {
    pending: PaymentRequestStatus.PENDING,
    rejected: PaymentRequestStatus.REJECTED,
    paid: PaymentRequestStatus.PAID,
    expired: PaymentRequestStatus.EXPIRED,
    // #441: the SDK holds a possibly-committed pay in a DURABLE 'settling' state
    // (survives reload via its journal) until the linked transfer resolves. Money
    // has (or may have) left the wallet, so the request must be NON-payable —
    // surface it as ACCEPTED ('Payment Sent'), the same non-actionable state the
    // (now-removed) in-memory override used, but durable across reload.
    settling: PaymentRequestStatus.ACCEPTED,
};

export interface IncomingPaymentRequest {
    id: string;
    senderPubkey: string;
    amount: bigint;
    coinId: string;
    symbol: string;
    message?: string;
    recipientNametag: string;
    requestId: string;
    timestamp: number;
    status: PaymentRequestStatus;
}

/** Bridge SDK payment request to legacy IncomingPaymentRequest model */
function bridgeRequest(sdk: SDKPaymentRequest): IncomingPaymentRequest {
    return {
        id: sdk.id,
        senderPubkey: sdk.senderPubkey,
        amount: BigInt(sdk.amount || '0'),
        coinId: sdk.coinId,
        symbol: sdk.symbol ?? '',
        message: sdk.message,
        // Legacy model uses recipientNametag to display "From" (the requester)
        recipientNametag: sdk.senderNametag ?? '',
        requestId: sdk.requestId,
        timestamp: sdk.timestamp,
        // sdk.status widens to `string` here (no compile check on the union), so an
        // UNKNOWN/unmapped status must default NON-payable — NEVER PENDING. A future
        // SDK status we haven't mapped would otherwise fall through to payable and
        // risk a double-pay. ACCEPTED = non-actionable 'Payment Sent'.
        status: STATUS_MAP[sdk.status] ?? PaymentRequestStatus.ACCEPTED,
    };
}

/**
 * Incoming payment requests, driven by paymentsV2.requests (the SDK list is
 * the source of truth — statuses are read back after every action, never
 * flipped optimistically):
 *
 * - `reject` — server-confirmed on the wallet-api path: the §16 'declined'
 *   respond happens BEFORE the local flip, and a server rejection (403
 *   non-addressee / 409 non-open, e.g. expired) propagates to the caller —
 *   surface it, the local status stays pending.
 * - `pay` — `paymentsV2.requests.pay`: sends the transfer (through the same
 *   paymentsV2.send() as a normal send), then links the transferId in the
 *   'paid' respond. A failed respond after a successful send is logged by the
 *   SDK, never reported as a payment failure. A possibly-committed keep-open
 *   reject (PENDING_COMMIT_CODES — SEND_SYNC_PENDING / CERTIFICATION_UNCONFIRMED
 *   / the E.4 split-checkpoint trio) is presented as a pending SUCCESS, never a
 *   re-payable failure (see `pay` below for the double-pay reasoning).
 */
export const useIncomingPaymentRequests = () => {
    const { sphere } = useSphereContext();
    const { assertReady: requireSubscriptionKey } = useSubscriptionKeyGuard();
    const [requests, setRequests] = useState<IncomingPaymentRequest[]>([]);

    const refresh = useCallback(() => {
        const paymentsV2 = sphere?.paymentsV2;
        if (!paymentsV2) return;
        // The SDK list is the source of truth. A possibly-committed pay is held by
        // the SDK in a DURABLE 'settling' state (→ ACCEPTED via STATUS_MAP, non-
        // payable) that survives reload — so no client-side override is needed
        // here; bridging the SDK status directly is both correct and reload-safe.
        setRequests(paymentsV2.requests.list().map(bridgeRequest));
    }, [sphere]);

    useEffect(() => {
        if (!sphere) {
            setRequests([]);
            return;
        }

        // Seed from the module: requests that arrived before this hook
        // mounted (e.g. the wallet-api sign-in backfill) are not re-emitted.
        refresh();

        // The SDK list is the source of truth: on incoming AND on resolution
        // (payment_request:updated — paid / rejected / expired / settling), the
        // SDK advances the request's status in its own list, then emits.
        // Re-reading drops a request resolved elsewhere (another window — or
        // this wallet's other session) out of the actionable (PENDING) state,
        // so its Pay/Decline buttons disappear: the UI half of the
        // cross-session-sync fix.
        const handler = () => refresh();
        sphere.on('payment_request:incoming', handler);
        sphere.on('payment_request:updated', handler);
        return () => {
            sphere.off('payment_request:incoming', handler);
            sphere.off('payment_request:updated', handler);
        };
    }, [sphere, refresh]);

    const pendingCount = useMemo(
        () => requests.filter(r => r.status === PaymentRequestStatus.PENDING).length,
        [requests],
    );


    const reject = useCallback(async (request: IncomingPaymentRequest) => {
        const paymentsV2 = sphere?.paymentsV2;
        if (!paymentsV2) return;
        try {
            await paymentsV2.requests.decline(request.id);
        } finally {
            refresh();
        }
    }, [sphere, refresh]);

    const pay = useCallback(async (request: IncomingPaymentRequest) => {
        const paymentsV2 = sphere?.paymentsV2;
        if (!paymentsV2) return;
        // Paying a request routes through paymentsV2.send() (certification) — same
        // keyless-send window as a normal send, so it uses the shared readiness
        // guard. handleAction in PaymentRequestModal surfaces the thrown message.
        requireSubscriptionKey();
        try {
            await paymentsV2.requests.pay(request.id);
        } catch (err) {
            // #441: requests.pay routes through the same send() as a normal
            // transfer, so it can reject with a possibly-committed keep-open code
            // (PENDING_COMMIT_CODES). On those the spend is (or may be) on-chain and
            // resume completes it — a second pay would double-pay. We swallow the
            // throw so the modal shows no re-payable error, and rely on the SDK to
            // have marked the request DURABLY 'settling' (→ ACCEPTED, non-payable,
            // survives reload) before it threw.
            //
            // CONTRACT DEPENDENCY: non-payability here is the SDK's job, not this
            // hook's. The paymentsV2 vertical owns the settling durability: it sets
            // 'settling' on every possibly-committed throw (its settling journal
            // survives reload). This hook must stay on an SDK that upholds it — if
            // a downgrade ever left the request 'pending' on such a throw, the
            // finally→refresh would re-list it payable. The earlier in-memory
            // override that guarded this locally was removed because it did NOT
            // survive reload (its own double-pay gap); the SDK's durable 'settling'
            // is the correct, reload-safe mechanism.
            if (isPendingCommitCode(err)) return;
            // Any OTHER error is a genuine failure — re-throw so PaymentRequestModal
            // surfaces it and the request stays actionable (safe to retry).
            throw err;
        } finally {
            refresh();
        }
    }, [sphere, requireSubscriptionKey, refresh]);

    const clearProcessed = useCallback(() => {
        const paymentsV2 = sphere?.paymentsV2;
        if (!paymentsV2) return;
        paymentsV2.requests.dismissProcessed();
        refresh();
    }, [sphere, refresh]);

    return { requests, pendingCount, reject, pay, clearProcessed };
};
