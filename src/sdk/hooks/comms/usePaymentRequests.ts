import { useState, useEffect, useCallback } from 'react';
import { useSphereContext } from '../core/useSphere';
import type { IncomingPaymentRequest as SDKPaymentRequest } from '../../types';

export interface UsePaymentRequestsReturn {
  requests: SDKPaymentRequest[];
  isLoading: boolean;
  respondToRequest: (
    requestId: string,
    senderPubkey: string,
    responseType: 'accepted' | 'rejected' | 'paid',
  ) => Promise<void>;
}

export function usePaymentRequests(): UsePaymentRequestsReturn {
  const { adapter } = useSphereContext();
  const [requests, setRequests] = useState<SDKPaymentRequest[]>([]);
  const [isLoading] = useState(false);

  useEffect(() => {
    if (!adapter) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        cleanup = await adapter.onPaymentRequest((req) => {
          setRequests((prev) => [...prev, req]);
        });
      } catch {
        // Payment requests not available
      }
    })();

    return () => { cleanup?.(); };
  }, [adapter]);

  const respondToRequest = useCallback(
    async (
      requestId: string,
      senderPubkey: string,
      responseType: 'accepted' | 'rejected' | 'paid',
    ) => {
      if (!adapter) throw new Error('Wallet not initialized');
      await adapter.sendPaymentRequestResponse(senderPubkey, {
        requestId,
        responseType,
      });
      setRequests((prev) =>
        prev.filter((r) => r.id !== requestId),
      );
    },
    [adapter],
  );

  return { requests, isLoading, respondToRequest };
}
