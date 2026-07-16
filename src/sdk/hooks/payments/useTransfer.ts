import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSphereContext } from '../core/useSphere';
import { SPHERE_KEYS } from '../../queryKeys';
import { getErrorCode, isPendingCommitCode, isQuotaRateLimit, isGatewayAuthError } from '../../errors';
import { checkSendQuota, QuotaBlockedError } from '../../quotaGate';
import { useSubscriptionKeyGuard } from '../subscription';
import { SUBSCRIPTION_ENABLED } from '../../../config/subscription';
import { useUpgrade, type UpgradeReason } from '../../../components/upgrade';
import { getUtilization } from '../../../services/subscriptionApi';
import { getStoredSubscriptionKey } from '../../../config/storageKeys';
import { showToast } from '../../../components/ui/toast-utils';
import type { TransferResult } from '@unicitylabs/sphere-sdk';

/**
 * Fire-and-forget disambiguation for a 401/403 submit rejection (spec §1
 * "401 branch"). The proxy 401 is byte-identical for missing/invalid/revoked/
 * expired keys, so the only way to tell "expired" (renew CTA) apart from
 * "invalid/revoked" (re-provision signal) is a follow-up `/api/utilization`
 * call. Never awaited by the caller — the synthetic pending result must
 * return immediately regardless of how long this takes or how it resolves.
 */
function disambiguateGatewayAuthError(openUpgrade: (reason?: UpgradeReason) => void): void {
  const apiKey = getStoredSubscriptionKey();
  if (!apiKey) return;

  const warnKeyRejected = (): void => {
    console.warn('subscription key rejected by gateway; re-provisioning runs at next load');
    showToast(
      'Subscription key was rejected — open Settings → Subscription to re-activate',
      'error',
      6000,
    );
  };

  getUtilization(apiKey)
    .then((info) => {
      if (info.status === 'expired') {
        openUpgrade('expired');
      } else {
        // 401 with a non-expired status back from /api/utilization means the
        // key itself is invalid/revoked (the proxy can't distinguish these
        // cases up front) — same re-provision signal as an outright reject.
        warnKeyRejected();
      }
    })
    .catch(warnKeyRejected);
}

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
  const { assertReady: requireSubscriptionKey } = useSubscriptionKeyGuard();
  const queryClient = useQueryClient();
  // Rules of hooks: must be called unconditionally at the top level. This
  // requires UpgradeProvider to stay mounted ABOVE ConnectProvider in
  // main.tsx: ConnectProvider renders ConnectIntentHandler (and thus
  // SendIntentModal → useTransfer) as a SIBLING of its children, so only
  // providers above ConnectProvider are ancestors of the Connect intent
  // modals. Reordering main.tsx would make this throw on the dApp
  // send-intent path.
  const { openUpgrade } = useUpgrade();

  const mutation = useMutation({
    mutationFn: async (params: TransferParams): Promise<TransferResult> => {
      if (!sphere) throw new Error('Wallet not initialized');

      // Subscription-key readiness gate: refuse the send until the live oracle
      // holds the per-wallet key, else it hits the aggregator unauthenticated
      // (→ 401, false "delivery pending"). Fires BEFORE checkSendQuota (which
      // needs a key to meter anyway). Shared with pay/mint via the guard hook.
      requireSubscriptionKey();

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
        // (code CERTIFICATION_UNCONFIRMED). It ALONE carries the JsonRpcNetworkError
        // cause, so the reactive 429/401 annotation (spec §1) keys off it specifically
        // — the shared pending-commit conversion below then owns the money-safe return.
        if (getErrorCode(e) === 'CERTIFICATION_UNCONFIRMED') {
          // Reactive 429/401 annotation (spec §1). Purely additive — the
          // synthetic pending result below is returned in ALL cases,
          // regardless of the branch taken here; #631/#633 keep-open
          // semantics are never altered by this block.
          // INVARIANT: nothing in this annotation block may throw past it —
          // a possibly-certified spend MUST reach the synthetic pending
          // return below, or the UI would misreport a finalized-on-chain
          // spend as a re-sendable failure (double-pay risk). Even the
          // "synchronous" parts can throw (e.g. getStoredSubscriptionKey →
          // localStorage.getItem raises SecurityError in storage-blocked
          // iframes), so the whole block is fail-open.
          if (SUBSCRIPTION_ENABLED) {
            try {
              if (isQuotaRateLimit(e)) {
                openUpgrade('quota');
              } else if (isGatewayAuthError(e)) {
                // Fire-and-forget: the /api/utilization round trip must never
                // delay the pending result below.
                disambiguateGatewayAuthError(openUpgrade);
              }
            } catch {
              // Swallow everything: annotation is best-effort, money-safety
              // (the pending return) always wins.
            }
          }
        }
        // Every possibly-committed "keep-open" send code — SEND_SYNC_PENDING (#665),
        // CERTIFICATION_UNCONFIRMED (#631/#633), and the E.4 split-checkpoint trio
        // CHECKPOINT_PERSIST_FAILED / SPLIT_CHECKPOINT_LOST / CHECKPOINT_TRUSTBASE_MISMATCH
        // (sphere-sdk#501, all re-thrown RAW by the SDK) — means the spend is (or may be)
        // already committed on-chain and the intent stays OPEN, so resume completes the
        // ORIGINAL payment under the same transferId. Present ALL of them as a
        // delivery-pending SUCCESS, NEVER a re-sendable failure: re-issuing a fresh send()
        // would consume a DIFFERENT source and double-pay the recipient. (See the single
        // PENDING_COMMIT_CODES definition in ../../errors — shared with the pay path.)
        // `id` is intentionally empty: these errors carry no transferId (the still-open
        // intent + resume own it) and no send UI reads result.id on this path — it exists
        // only to render the "pending" state.
        if (isPendingCommitCode(e)) {
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
