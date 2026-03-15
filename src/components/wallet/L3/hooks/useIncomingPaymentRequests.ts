import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSphereContext } from '../../../../sdk/hooks/core/useSphere';
import type { IncomingPaymentRequest as SDKPaymentRequest } from '@unicitylabs/sphere-sdk';

export const PaymentRequestStatus = {
    PENDING: 'PENDING',
    ACCEPTED: 'ACCEPTED',
    REJECTED: 'REJECTED',
    PAID: 'PAID'
} as const;

export type PaymentRequestStatus = typeof PaymentRequestStatus[keyof typeof PaymentRequestStatus];

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
        status: PaymentRequestStatus.PENDING,
    };
}

export const useIncomingPaymentRequests = () => {
    const { adapter } = useSphereContext();
    const [requests, setRequests] = useState<IncomingPaymentRequest[]>([]);

    useEffect(() => {
        if (!adapter) return;

        const handler = (sdkReq: SDKPaymentRequest) => {
            setRequests(prev => [...prev, bridgeRequest(sdkReq)]);
        };

        adapter.on('payment_request:incoming', handler as (data?: unknown) => void);

        return () => {
            adapter.off('payment_request:incoming', handler as (data?: unknown) => void);
        };
    }, [adapter]);

    const updateStatus = useCallback(async (
        request: IncomingPaymentRequest,
        status: typeof PaymentRequestStatus[keyof typeof PaymentRequestStatus],
        responseType: 'accepted' | 'rejected' | 'paid',
    ) => {
        if (!adapter) return;
        await adapter.sendPaymentRequestResponse(request.senderPubkey, {
            requestId: request.requestId,
            responseType,
        });
        setRequests(prev =>
            prev.map(r => r.id === request.id ? { ...r, status } : r)
        );
    }, [adapter]);

    const pendingCount = useMemo(
        () => requests.filter(r => r.status === PaymentRequestStatus.PENDING).length,
        [requests],
    );

    const accept = useCallback(
        (request: IncomingPaymentRequest) => updateStatus(request, PaymentRequestStatus.ACCEPTED, 'accepted'),
        [updateStatus],
    );

    const reject = useCallback(
        (request: IncomingPaymentRequest) => updateStatus(request, PaymentRequestStatus.REJECTED, 'rejected'),
        [updateStatus],
    );

    const paid = useCallback(
        (request: IncomingPaymentRequest) => updateStatus(request, PaymentRequestStatus.PAID, 'paid'),
        [updateStatus],
    );

    const clearProcessed = useCallback(
        () => setRequests(prev => prev.filter(r => r.status === PaymentRequestStatus.PENDING)),
        [],
    );

    return { requests, pendingCount, accept, reject, paid, clearProcessed };
};
