import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSphereContext } from '../../../../sdk/hooks/core/useSphere';
import { useSubscriptionKeyGuard } from '../../../../sdk/hooks/subscription';
import { isPendingCommitCode } from '../../../../sdk/errors';
import type { IncomingPaymentRequest as SDKPaymentRequest } from '@unicitylabs/sphere-sdk';

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
    accepted: PaymentRequestStatus.ACCEPTED,
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
        symbol: sdk.symbol,
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
 * Incoming payment requests, driven by the PaymentsModule (the SDK list is
 * the source of truth — statuses are read back after every action, never
 * flipped optimistically):
 *
 * - `accept` — local status only; the wallet-api backend has no 'accepted'
 *   state (§16 models open → paid | declined | expired), so the requester is
 *   NOT notified until the request is actually paid.
 * - `reject` — server-confirmed on the wallet-api path: the §16 'declined'
 *   respond happens BEFORE the local flip, and a server rejection (403
 *   non-addressee / 409 non-open, e.g. expired) propagates to the caller —
 *   surface it, the local status stays pending.
 * - `pay` — `payments.payPaymentRequest`: sends the transfer (through the same
 *   payments.send() as a normal send), then links the transferId in the 'paid'
 *   respond. A failed respond after a successful send is logged by the SDK,
 *   never reported as a payment failure. A possibly-committed keep-open reject
 *   (PENDING_COMMIT_CODES — SEND_SYNC_PENDING / CERTIFICATION_UNCONFIRMED / the
 *   E.4 split-checkpoint trio) is presented as a pending SUCCESS, never a
 *   re-payable failure (see `pay` below for the double-pay reasoning).
 */
export const useIncomingPaymentRequests = () => {
    const { sphere } = useSphereContext();
    const { assertReady: requireSubscriptionKey } = useSubscriptionKeyGuard();
    const [requests, setRequests] = useState<IncomingPaymentRequest[]>([]);

    const refresh = useCallback(() => {
        if (!sphere) return;
        // The SDK list is the source of truth. A possibly-committed pay is held by
        // the SDK in a DURABLE 'settling' state (→ ACCEPTED via STATUS_MAP, non-
        // payable) that survives reload — so no client-side override is needed
        // here; bridging the SDK status directly is both correct and reload-safe.
        setRequests(sphere.payments.getPaymentRequests().map(bridgeRequest));
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
        // (paid / rejected / expired), the SDK advances the request's status in
        // its own list, then emits. Re-reading drops a request resolved
        // elsewhere (another window — or this wallet's other session) out of
        // the actionable (PENDING) state, so its Pay/Decline buttons disappear:
        // the UI half of the cross-session-sync fix.
        const handler = () => refresh();
        sphere.on('payment_request:incoming', handler);
        sphere.on('payment_request:paid', handler);
        sphere.on('payment_request:rejected', handler);
        sphere.on('payment_request:expired', handler);
        return () => {
            sphere.off('payment_request:incoming', handler);
            sphere.off('payment_request:paid', handler);
            sphere.off('payment_request:rejected', handler);
            sphere.off('payment_request:expired', handler);
        };
    }, [sphere, refresh]);

    const pendingCount = useMemo(
        () => requests.filter(r => r.status === PaymentRequestStatus.PENDING).length,
        [requests],
    );

    const accept = useCallback(async (request: IncomingPaymentRequest) => {
        if (!sphere) return;
        try {
            await sphere.payments.acceptPaymentRequest(request.id);
        } finally {
            refresh();
        }
    }, [sphere, refresh]);

    const reject = useCallback(async (request: IncomingPaymentRequest) => {
        if (!sphere) return;
        try {
            await sphere.payments.rejectPaymentRequest(request.id);
        } finally {
            refresh();
        }
    }, [sphere, refresh]);

    const pay = useCallback(async (request: IncomingPaymentRequest) => {
        if (!sphere) return;
        // Paying a request routes through payments.send() (certification) — same
        // keyless-send window as a normal send, so it uses the shared readiness
        // guard. handleAction in PaymentRequestModal surfaces the thrown message.
        requireSubscriptionKey();
        try {
            await sphere.payments.payPaymentRequest(request.id);
        } catch (err) {
            // #441: payPaymentRequest routes through the same send() as a normal
            // transfer, so it can reject with a possibly-committed keep-open code
            // (PENDING_COMMIT_CODES). On those the spend is (or may be) on-chain and
            // resume completes it — a second pay would double-pay. We swallow the
            // throw so the modal shows no re-payable error, and rely on the SDK to
            // have marked the request DURABLY 'settling' (→ ACCEPTED, non-payable,
            // survives reload) before it threw.
            //
            // CONTRACT DEPENDENCY: non-payability here is the SDK's job, not this
            // hook's. sphere-sdk >= 0.11.14 (pinned in package.json) sets 'settling'
            // on every possibly-committed throw (PaymentsModule.payPaymentRequest,
            // covered by the sdk deferred-paid tests). This hook must stay on an SDK
            // that upholds it — if a downgrade ever left the request 'pending' on
            // such a throw, the finally→refresh would re-list it payable. The
            // earlier in-memory override that guarded this locally was removed
            // because it did NOT survive reload (its own double-pay gap); the SDK's
            // durable 'settling' is the correct, reload-safe mechanism.
            if (isPendingCommitCode(err)) return;
            // Any OTHER error is a genuine failure — re-throw so PaymentRequestModal
            // surfaces it and the request stays actionable (safe to retry).
            throw err;
        } finally {
            refresh();
        }
    }, [sphere, requireSubscriptionKey, refresh]);

    const clearProcessed = useCallback(() => {
        if (!sphere) return;
        sphere.payments.clearProcessedPaymentRequests();
        refresh();
    }, [sphere, refresh]);

    return { requests, pendingCount, accept, reject, pay, clearProcessed };
};
