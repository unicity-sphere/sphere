import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSphereContext } from '../../../../sdk/hooks/core/useSphere';
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
        status: STATUS_MAP[sdk.status] ?? PaymentRequestStatus.PENDING,
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
 * - `pay` — `payments.payPaymentRequest`: sends the transfer, then links the
 *   transferId in the 'paid' respond. A failed respond after a successful
 *   send is logged by the SDK, never reported as a payment failure.
 */
export const useIncomingPaymentRequests = () => {
    const { sphere } = useSphereContext();
    const [requests, setRequests] = useState<IncomingPaymentRequest[]>([]);

    const refresh = useCallback(() => {
        if (!sphere) return;
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
        try {
            await sphere.payments.payPaymentRequest(request.id);
        } finally {
            refresh();
        }
    }, [sphere, refresh]);

    const clearProcessed = useCallback(() => {
        if (!sphere) return;
        sphere.payments.clearProcessedPaymentRequests();
        refresh();
    }, [sphere, refresh]);

    return { requests, pendingCount, accept, reject, pay, clearProcessed };
};
