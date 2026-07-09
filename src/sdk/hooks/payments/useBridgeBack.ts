/**
 * useBridgeBack (06 §W3) — burn a bridged balance and hand off to the return
 * service. useBridgeClaims tracks the open returns by polling `/returns/:id`
 * (and should also watch `Released{nullifier}` over Tron RPC for a trustless
 * cross-check — 06 §A2.4). The burned blob is persisted in {BridgeStore} for
 * recovery + self-settle.
 */
import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fromHex, ReturnServiceClient, ReturnServiceError } from '@unicitylabs/bridge-plugin-tron-usdt/wallet';

import { useSphereContext } from '../core/useSphere';
import { SPHERE_KEYS } from '../../queryKeys';
import { getAppBridges } from '../../../bridge/loadBridges';
import { bridgeStoreFor, type PendingReturn } from '../../../bridge/store';
import { runBridgeBack } from '../../../bridge/bridgeBack';

export interface BridgeBackRequest {
  coinIdHex: string;
  tokenId: string;
  destination: string;
  amount: string;
  deadlineSeconds?: number;
}

export function useBridgeBack() {
  const { sphere } = useSphereContext();
  const queryClient = useQueryClient();
  const store = useMemo(() => bridgeStoreFor(sphere?.identity?.chainPubkey ?? 'anon'), [sphere]);

  const mutation = useMutation({
    mutationFn: async (req: BridgeBackRequest) => {
      if (!sphere) throw new Error('Wallet not initialized');
      const bridge = getAppBridges().registry.byCoinId(req.coinIdHex);
      if (!bridge) throw new Error(`No bridge for coin ${req.coinIdHex}`);
      return runBridgeBack({
        sphere,
        bridge,
        store,
        tokenId: req.tokenId,
        destination: req.destination,
        amount: BigInt(req.amount),
        deadlineSeconds: req.deadlineSeconds,
      });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: SPHERE_KEYS.payments.tokens.all });
      queryClient.refetchQueries({ queryKey: SPHERE_KEYS.payments.balance.all });
    },
  });

  return {
    bridgeBack: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    result: mutation.data ?? null,
    reset: mutation.reset,
  };
}

/**
 * Track open bridge-back returns: poll each one's `/returns/:id` and refresh the
 * persisted status. Returns the live records + a `selfSettle` affordance (publish
 * the bundle yourself after the deadline — principal is always claimable).
 */
export function useBridgeClaims(pollMs = 8000) {
  const { sphere } = useSphereContext();
  const queryClient = useQueryClient();
  const store = useMemo(() => bridgeStoreFor(sphere?.identity?.chainPubkey ?? 'anon'), [sphere]);
  const queryKey = useMemo(() => ['bridge', 'claims', sphere?.identity?.chainPubkey] as const, [sphere?.identity?.chainPubkey]);

  const query = useQuery({
    queryKey,
    enabled: !!sphere,
    refetchInterval: pollMs,
    queryFn: async (): Promise<PendingReturn[]> => {
      const active = store.activeReturns();
      await Promise.all(
        active.map(async (r) => {
          const client = new ReturnServiceClient(r.returnServiceUrl);
          if (!r.returnId) {
            // The burn already happened and is persisted (recovery-critical) —
            // if the initial POST /returns never landed a returnId (service
            // outage, transient rejection since fixed, …), retry it here. The
            // service is idempotent on nullifier, so this is always safe to
            // repeat: never re-burns, only ever (re)submits the SAME blob.
            try {
              const rec = await client.postReturn({
                tokenCbor: fromHex(r.burnedTokenCborHex),
                configHash: fromHex(r.configHashHex),
                reasonBytes: fromHex(r.reasonBytesHex),
              });
              store.updateReturn(r.id, { returnId: rec.returnId, status: rec.status, settleTxid: rec.settleTxid });
            } catch (err) {
              // `recoverable: false` (e.g. config_hash_mismatch after a vault
              // redeploy) means resubmitting this exact blob will never work —
              // stop retrying it every poll and surface it as terminal instead
              // of silently spinning forever.
              if (err instanceof ReturnServiceError && !err.recoverable) {
                store.updateReturn(r.id, { status: 'failed' });
              }
              /* else: transient/service down — keep last known status, retry next poll */
            }
            return;
          }
          try {
            const rec = await client.getReturn(r.returnId);
            store.updateReturn(r.id, { status: rec.status, settleTxid: rec.settleTxid });
          } catch {
            /* service down — keep last known status */
          }
        }),
      );
      return store.listReturns();
    },
  });

  const selfSettle = useCallback(
    async (ret: PendingReturn) => {
      // Self-settle: fetch the published bundle and (in a full build) submit
      // fulfillBatch yourself. Here we surface the bundle for the user/relayer.
      if (!ret.returnId) throw new Error('No returnId yet');
      const client = new ReturnServiceClient(ret.returnServiceUrl);
      const rec = await client.getReturn(ret.returnId);
      if (!rec.batchId) throw new Error('Not yet batched — nothing to self-settle');
      return client.getBatch(rec.batchId);
    },
    [],
  );

  const dismissReturn = useCallback(
    (id: string) => {
      store.removeReturn(id);
      queryClient.setQueryData<PendingReturn[]>(queryKey, store.listReturns());
    },
    [queryClient, queryKey, store],
  );

  return {
    claims: query.data ?? [],
    refetch: query.refetch,
    selfSettle,
    dismissReturn,
  };
}
