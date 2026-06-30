/**
 * useBridgeBack (06 §W3) — burn a bridged balance and hand off to the return
 * service. useBridgeClaims tracks the open returns by polling `/returns/:id`
 * (and should also watch `Released{nullifier}` over Tron RPC for a trustless
 * cross-check — 06 §A2.4). The burned blob is persisted in {BridgeStore} for
 * recovery + self-settle.
 */
import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ReturnServiceClient } from '@unicitylabs/bridge-plugin-tron-usdt/lib/wallet/index.js';

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
      const bridge = getAppBridges().loaded.find((l) => l.plugin.coinIdHex === req.coinIdHex.toLowerCase());
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
  const store = useMemo(() => bridgeStoreFor(sphere?.identity?.chainPubkey ?? 'anon'), [sphere]);

  const query = useQuery({
    queryKey: ['bridge', 'claims', sphere?.identity?.chainPubkey],
    enabled: !!sphere,
    refetchInterval: pollMs,
    queryFn: async (): Promise<PendingReturn[]> => {
      const active = store.activeReturns();
      await Promise.all(
        active.map(async (r) => {
          if (!r.returnId) return;
          try {
            const rec = await new ReturnServiceClient(r.returnServiceUrl).getReturn(r.returnId);
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

  return {
    claims: query.data ?? [],
    refetch: query.refetch,
    selfSettle,
  };
}
