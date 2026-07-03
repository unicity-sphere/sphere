/**
 * useBridgeIn (06 §W2) — drives lock→mint from the UI with a `TronSigner`
 * (TronLink). Surfaces the multi-step progress (approve → lock → "locking on
 * Tron" → mint) so the modal can show a sub-state, and refreshes balances on
 * completion. Pending-lock recovery lives in {BridgeStore} (resume on reopen).
 */
import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { TronSigner } from '@unicitylabs/bridge-plugin-tron-usdt/lib/wallet/index.js';

import { useSphereContext } from '../core/useSphere';
import { SPHERE_KEYS } from '../../queryKeys';
import { createBridgeInDeps, createResumeDeps, getAppBridges } from '../../../bridge/loadBridges';
import { bridgeStoreFor } from '../../../bridge/store';
import { runBridgeIn, resumeBridgeMint, type BridgeInProgress } from '../../../bridge/bridgeIn';

export interface UseBridgeInArgs {
  /** Override the Tron signer (default: TronLink). Injectable for tests/managed key. */
  signer?: TronSigner;
}

export interface BridgeInRequest {
  /** Bridged coin id (64-hex) the user picked. */
  coinIdHex: string;
  /** Amount in the asset's smallest unit (string from the input). */
  amount: string;
  /** One-time max approve to reduce future prompts. */
  maxApprove?: boolean;
}

export function useBridgeIn(opts: UseBridgeInArgs = {}) {
  const { sphere } = useSphereContext();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<BridgeInProgress | null>(null);

  const store = useMemo(() => {
    const key = sphere?.identity?.chainPubkey ?? 'anon';
    return bridgeStoreFor(key);
  }, [sphere]);

  const mutation = useMutation({
    mutationFn: async (req: BridgeInRequest) => {
      if (!sphere) throw new Error('Wallet not initialized');
      const bridge = getAppBridges().registry.byCoinId(req.coinIdHex);
      if (!bridge) throw new Error(`No bridge configured for coin ${req.coinIdHex}`);

      const networkId = unicityNetworkId(sphere);
      const amount = BigInt(req.amount);
      const MAX_UINT256 = (1n << 256n) - 1n;

      return runBridgeIn({
        sphere,
        ...createBridgeInDeps(bridge, opts.signer),
        store,
        amount,
        networkId,
        approveAmount: req.maxApprove ? MAX_UINT256 : amount,
        onProgress: setProgress,
      });
    },
    onSuccess: () => refreshBalances(queryClient),
  });

  const resumePending = useCallback(async () => {
    if (!sphere) return;
    for (const lock of store.pendingMints()) {
      if (!lock.lockTxid) continue;
      const bridge = getAppBridges().registry.byCoinId(lock.coinIdHex);
      if (!bridge) continue;
      try {
        const { adapter, receipts } = createResumeDeps(bridge);
        await resumeBridgeMint(sphere, adapter, receipts, store, lock);
      } catch {
        // leave it pending; the user can retry
      }
    }
    refreshBalances(queryClient);
  }, [sphere, store, queryClient]);

  return {
    bridgeIn: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    progress,
    result: mutation.data ?? null,
    reset: () => {
      setProgress(null);
      mutation.reset();
    },
    pendingMints: () => store.pendingMints(),
    resumePending,
  };
}

function refreshBalances(queryClient: ReturnType<typeof useQueryClient>): void {
  queryClient.refetchQueries({ queryKey: SPHERE_KEYS.payments.tokens.all });
  queryClient.refetchQueries({ queryKey: SPHERE_KEYS.payments.balance.all });
  queryClient.refetchQueries({ queryKey: SPHERE_KEYS.payments.assets.all });
}

/**
 * The Unicity network id the wallet mints on — read from the SDK's root trust base
 * (`sphere.networkId`, e.g. testnet2 = 4), the single source of truth. The bridge-in
 * plan needs it for `TokenId.fromSalt`, which MUST match the mint network, so we
 * fail loudly rather than derive a wrong-network token id from a stale default.
 */
function unicityNetworkId(sphere: { networkId?: number }): number {
  const id = sphere.networkId;
  if (typeof id !== 'number') {
    throw new Error('Unicity network id unavailable (trust base not loaded); cannot bridge in yet.');
  }
  return id;
}
