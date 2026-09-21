import { useCallback, useState } from 'react';
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { Sphere } from '@unicitylabs/sphere-sdk';
import type { BridgePayments } from '@unicitylabs/bridge-core';

import { useSphereContext } from '../../sdk/hooks/core/useSphere';
import { getPayments } from '../../sdk/payments';
import { SPHERE_KEYS } from '../../sdk/queryKeys';
import { bridgeAssetByCoin } from './assets';
import { runBridgeIn, resumeBridgeMint, type BridgeInProgress, type BridgeInResult, type WalletSide } from './bridgeIn';
import { bridgeStoreFor, type PendingLock } from './store';
import type { BridgeAsset, BridgeWalletOption } from './types';

export interface BridgeInRequest {
  readonly asset: BridgeAsset;
  readonly wallet: BridgeWalletOption;
  readonly amount: bigint;
}

export function useBridgeIn() {
  const { sphere } = useSphereContext();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<BridgeInProgress | null>(null);

  const mutation = useMutation({
    mutationFn: async (req: BridgeInRequest): Promise<BridgeInResult> => {
      const side = walletSide(sphere);
      return runBridgeIn({
        ...req.wallet.open(),
        ...side,
        amount: req.amount,
        onProgress: setProgress,
      });
    },
    onSuccess: () => refreshBalances(queryClient),
  });

  const pendingMints = useCallback((): PendingLock[] => {
    const key = sphere?.identity?.chainPubkey;
    return key ? bridgeStoreFor(key).pendingMints() : [];
  }, [sphere]);

  const resume = useCallback(
    async (lock: PendingLock): Promise<BridgeInResult> => {
      const side = walletSide(sphere);
      const asset = bridgeAssetByCoin(lock.coinIdHex);
      if (!asset) throw new Error('This deposit belongs to an asset that is no longer configured.');
      const result = await resumeBridgeMint({ ...asset.resumeDeps(), payments: side.payments, store: side.store, lock });
      refreshBalances(queryClient);
      return result;
    },
    [sphere, queryClient],
  );

  const discard = useCallback(
    (lockId: string) => {
      const key = sphere?.identity?.chainPubkey;
      if (key) bridgeStoreFor(key).removeLock(lockId);
    },
    [sphere],
  );

  const reset = useCallback(() => {
    setProgress(null);
    mutation.reset();
  }, [mutation]);

  return {
    bridgeIn: mutation.mutateAsync,
    isRunning: mutation.isPending,
    error: mutation.error,
    progress,
    result: mutation.data ?? null,
    reset,
    pendingMints,
    resume,
    discard,
  };
}

function walletSide(sphere: Sphere | null): WalletSide {
  if (!sphere) throw new Error('Wallet not initialized');
  const payments = getPayments(sphere);
  if (!payments) throw new Error('The wallet is restarting; try again in a moment.');
  const chainPubkey = sphere.identity?.chainPubkey;
  if (!chainPubkey) throw new Error('Wallet identity unavailable');
  const networkId = sphere.networkId;
  if (typeof networkId !== 'number') {
    throw new Error('Unicity network id unavailable (trust base not loaded); cannot bridge in yet.');
  }
  return {
    payments: payments as BridgePayments,
    recipientPubkey: fromHex(chainPubkey),
    networkId,
    store: bridgeStoreFor(chainPubkey),
  };
}

function refreshBalances(queryClient: QueryClient): void {
  queryClient.refetchQueries({ queryKey: SPHERE_KEYS.payments.tokens.all });
  queryClient.refetchQueries({ queryKey: SPHERE_KEYS.payments.balance.all });
  queryClient.refetchQueries({ queryKey: SPHERE_KEYS.payments.assets.all });
}

function fromHex(hex: string): Uint8Array {
  const s = hex.startsWith('0x') ? hex.slice(2) : hex;
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}
