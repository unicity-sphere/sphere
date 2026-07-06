import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSphereContext } from '../core/useSphere';
import { SPHERE_KEYS } from '../../queryKeys';
import { getErrorCode } from '../../errors';
import { checkSendQuota, QuotaBlockedError } from '../../quotaGate';
import { SUBSCRIPTION_ENABLED } from '../../../config/subscription';
import type { TransferResult } from '@unicitylabs/sphere-sdk';

export interface TransferParams {
  coinId: string;
  amount: string;
  recipient: string;
  memo?: string;
}

export interface UseTransferReturn {
  transfer: (params: TransferParams) => Promise<TransferResult>;
  isLoading: boolean;
  error: Error | null;
  lastResult: TransferResult | null;
  reset: () => void;
}

export function useTransfer(): UseTransferReturn {
  const { sphere } = useSphereContext();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: TransferParams): Promise<TransferResult> => {
      if (!sphere) throw new Error('Wallet not initialized');

      // Proactive quota gate (spec §2): a hard block must land BEFORE the
      // first submit leaves — after that, #631/#633 keep-open semantics own
      // the outcome. checkSendQuota() never throws by design; the try/catch
      // here is a second, defensive layer so a gate malfunction can never
      // break a send (fail-open at the call site too).
      if (SUBSCRIPTION_ENABLED) {
        try {
          const gate = await checkSendQuota();
          if (gate.verdict === 'block' && gate.info) {
            throw new QuotaBlockedError(gate.info);
          }
          // 'warn' is UI-only (Task 6's SendModal banner) — no hook effect.
        } catch (err) {
          if (err instanceof QuotaBlockedError) throw err;
          // Swallow anything else (defensive fail-open) and proceed to send.
        }
      }

      try {
        return await sphere.payments.send({
          coinId: params.coinId,
          amount: params.amount,
          recipient: params.recipient,
          memo: params.memo,
        });
      } catch (e) {
        // #631/#633: a POSSIBLY-CERTIFIED send rejects with ProofUnconfirmedError
        // (code CERTIFICATION_UNCONFIRMED) — the spend may already be final on-chain and
        // the SDK keeps the intent OPEN, so resume completes it under the same transferId.
        // Treat it as a delivery-pending SUCCESS, NEVER a re-sendable failure: re-issuing a
        // fresh send() would consume a DIFFERENT source and double-pay the recipient.
        if (getErrorCode(e) === 'CERTIFICATION_UNCONFIRMED') {
          // `id` is intentionally empty: ProofUnconfirmedError carries no transferId
          // (the still-open intent + resume own it), and no send UI reads result.id
          // on this path — it exists only to render the "pending" state.
          return { id: '', status: 'pending', tokens: [], tokenTransfers: [], deliveryPending: true };
        }
        throw e;
      }
    },
    onSuccess: () => {
      // Force refetch all payment queries with fresh data.
      // Use refetchQueries (not invalidateQueries) to guarantee a new fetch
      // even if a previous refetch from the transfer:confirmed event is in-flight.
      queryClient.refetchQueries({ queryKey: SPHERE_KEYS.payments.tokens.all });
      queryClient.refetchQueries({ queryKey: SPHERE_KEYS.payments.balance.all });
      queryClient.refetchQueries({ queryKey: SPHERE_KEYS.payments.assets.all });
      queryClient.refetchQueries({ queryKey: SPHERE_KEYS.payments.transactions.all });
    },
    // onError inherited from global QueryClient handler → auto-toast
  });

  return {
    transfer: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    lastResult: mutation.data ?? null,
    reset: mutation.reset,
  };
}
