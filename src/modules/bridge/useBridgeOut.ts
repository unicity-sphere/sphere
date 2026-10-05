import { useCallback, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { Sphere, Token } from '@unicitylabs/sphere-sdk';
import type { BridgePayments } from '@unicitylabs/bridge-core';

import { useSphereContext } from '../../sdk/hooks/core/useSphere';
import { getPayments } from '../../sdk/payments';
import { SPHERE_KEYS } from '../../sdk/queryKeys';
import { bridgeAssets } from './assets';
import { recoverBurns, retryReturn, runBridgeOut, syncReturns } from './bridgeOut';
import { returnCandidates, splitReturnable, type ReturnableSplit } from './returnable';
import { bridgeStoreFor, isTerminalReturn, type BridgeStore, type PendingReturn } from './store';
import type { BridgeAsset, ReturnServiceTiming } from './types';

export interface BridgeOutRequest {
  readonly asset: BridgeAsset;
  readonly tokens: readonly { id: string; amount: bigint }[];
  readonly destination: string;
  /** The per-token fee the user was shown and accepted. */
  readonly maxFee: bigint;
}

const RETURNS_KEY = (identity: string | undefined) => ['bridge', 'returns', identity] as const;
const POLL_MS = 8000;
const FEE_REFRESH_MS = 60_000;

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
    refetchInterval: (query) => ((query.state.data ?? []).some((r) => !isTerminalReturn(r)) ? POLL_MS : false),
  });

  const waiting = (returns.data ?? []).find((r) => r.status === 'queued' || r.status === 'proving');
  const timing = useQuery({
    queryKey: ['bridge', 'timing', identity, waiting?.assetId],
    enabled: !!waiting,
    queryFn: (): Promise<ReturnServiceTiming | null> => assetById(waiting?.assetId ?? '')?.out?.returns.timing() ?? Promise.resolve(null),
    refetchInterval: POLL_MS,
  });

  const mutation = useMutation({
    mutationFn: async (req: BridgeOutRequest): Promise<PendingReturn[]> => {
      const { payments, store } = walletSide(sphere);
      const records: PendingReturn[] = [];
      for (const token of req.tokens) {
        records.push(await runBridgeOut({ payments, store, asset: req.asset, tokenId: token.id, amount: token.amount, maxFee: req.maxFee, destination: req.destination }));
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
      store.removeReturn(id);
      queryClient.setQueryData(returnsKey, store.listReturns());
    },
    [store, queryClient, returnsKey],
  );

  const retry = useCallback(
    async (id: string) => {
      const asset = store && assetById(store.getReturn(id)?.assetId ?? '');
      if (!store || !asset) return;
      await retryReturn(store, asset, id);
      queryClient.setQueryData(returnsKey, store.listReturns());
    },
    [store, assetById, queryClient, returnsKey],
  );

  return {
    bridgeOut: mutation.mutateAsync,
    isRunning: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
    returns: returns.data ?? [],
    timing: timing.data ?? null,
    refreshReturns: returns.refetch,
    dismiss,
    retry,
  };
}

/** What the asset's return service takes from each burned token; `undefined` until it has answered. */
export function useReturnFee(asset: BridgeAsset | undefined): { fee: bigint | undefined; error: Error | null } {
  const out = asset?.out;
  const query = useQuery({
    queryKey: ['bridge', 'returnFee', asset?.id],
    enabled: !!out,
    queryFn: () => (out ? out.fee() : Promise.reject(new Error('This asset cannot be bridged out.'))),
    refetchInterval: FEE_REFRESH_MS,
    retry: false,
  });
  return { fee: query.data, error: query.error };
}

export function useReturnableTokens(asset: BridgeAsset | undefined, tokens: readonly Token[]): ReturnableSplit & { isLoading: boolean } {
  const { sphere } = useSphereContext();
  const candidates = useMemo(() => (asset ? returnCandidates(asset, tokens) : []), [tokens, asset]);
  const query = useQuery({
    queryKey: ['bridge', 'returnable', asset?.id, candidates.map((t) => t.id)],
    enabled: !!sphere && !!asset?.out,
    staleTime: Infinity,
    queryFn: (): Promise<ReturnableSplit> => {
      const payments = getPayments(sphere);
      const out = asset?.out;
      if (!payments || !out) return Promise.resolve({ eligible: [], ineligible: candidates });
      return splitReturnable(payments as BridgePayments, out, candidates);
    },
  });
  return { eligible: query.data?.eligible ?? [], ineligible: query.data?.ineligible ?? [], isLoading: query.isLoading };
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
