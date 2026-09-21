import { useCallback, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { Sphere } from '@unicitylabs/sphere-sdk';
import type { BridgePayments } from '@unicitylabs/bridge-core';

import { useSphereContext } from '../../sdk/hooks/core/useSphere';
import { getPayments } from '../../sdk/payments';
import { SPHERE_KEYS } from '../../sdk/queryKeys';
import { bridgeAssets } from './assets';
import { dismissReturn, recoverBurns, runBridgeOut, syncReturns } from './bridgeOut';
import { bridgeStoreFor, type BridgeStore, type PendingReturn } from './store';
import type { BridgeAsset } from './types';

export interface BridgeOutRequest {
  readonly asset: BridgeAsset;
  readonly tokens: readonly { id: string; amount: bigint }[];
  readonly destination: string;
}

const RETURNS_KEY = (identity: string | undefined) => ['bridge', 'returns', identity] as const;
const POLL_MS = 8000;

export function useBridgeOut() {
  const { sphere } = useSphereContext();
  const queryClient = useQueryClient();
  const identity = sphere?.identity?.chainPubkey;
  const store = useMemo(() => (identity ? bridgeStoreFor(identity) : null), [identity]);
  const assetById = useCallback((id: string) => bridgeAssets().find((a) => a.id === id), []);
  const returnsKey = useMemo(() => RETURNS_KEY(identity), [identity]);

  useEffect(() => {
    if (!sphere || !store) return;
    const payments = getPayments(sphere);
    if (!payments) return;
    let cancelled = false;
    recoverBurns(payments as BridgePayments, store, bridgeAssets()).then((recovered) => {
      if (!cancelled && recovered.length > 0) queryClient.invalidateQueries({ queryKey: returnsKey });
    });
    return () => {
      cancelled = true;
    };
  }, [sphere, store, queryClient, returnsKey]);

  const returns = useQuery({
    queryKey: returnsKey,
    enabled: !!store,
    queryFn: () => (store ? syncReturns(store, assetById) : Promise.resolve([] as PendingReturn[])),
    refetchInterval: (query) => ((query.state.data ?? []).some((r) => r.status !== 'settled' && r.status !== 'failed') ? POLL_MS : false),
  });

  const mutation = useMutation({
    mutationFn: async (req: BridgeOutRequest): Promise<PendingReturn[]> => {
      const { payments, store } = walletSide(sphere);
      const records: PendingReturn[] = [];
      for (const token of req.tokens) {
        records.push(await runBridgeOut({ payments, store, asset: req.asset, tokenId: token.id, amount: token.amount, destination: req.destination }));
        queryClient.setQueryData(returnsKey, store.listReturns());
      }
      return records;
    },
    onSettled: () => {
      refreshBalances(queryClient);
      queryClient.invalidateQueries({ queryKey: returnsKey });
    },
  });

  const dismiss = useCallback(
    (id: string) => {
      if (!store) return;
      dismissReturn(store, id);
      queryClient.setQueryData(returnsKey, store.listReturns());
    },
    [store, queryClient, returnsKey],
  );

  return {
    bridgeOut: mutation.mutateAsync,
    isRunning: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
    returns: returns.data ?? [],
    refreshReturns: returns.refetch,
    dismiss,
  };
}

function walletSide(sphere: Sphere | null): { payments: BridgePayments; store: BridgeStore } {
  if (!sphere) throw new Error('Wallet not initialized');
  const payments = getPayments(sphere);
  if (!payments) throw new Error('The wallet is restarting; try again in a moment.');
  const identity = sphere.identity?.chainPubkey;
  if (!identity) throw new Error('Wallet identity unavailable');
  return { payments: payments as BridgePayments, store: bridgeStoreFor(identity) };
}

function refreshBalances(queryClient: QueryClient): void {
  queryClient.refetchQueries({ queryKey: SPHERE_KEYS.payments.tokens.all });
  queryClient.refetchQueries({ queryKey: SPHERE_KEYS.payments.balance.all });
  queryClient.refetchQueries({ queryKey: SPHERE_KEYS.payments.assets.all });
}
