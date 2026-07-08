/**
 * Bridge-out orchestration (06 §A1.2): burn → hand off to the return service.
 * The user signs only the Unicity burn; the Part-B service proves + releases USDT
 * on Tron (no Tron gas to receive). Pure of React; `useBridgeBack` wraps it.
 *
 * Recovery-critical: the burned-token blob is persisted in {BridgeStore} *before*
 * the service call — losing it makes the release unrecoverable (ZK_BACK3 §13), but
 * anyone can resubmit it.
 */
import type { Sphere } from '@unicitylabs/sphere-sdk';
import {
  buildBridgeBackBurnReason,
  finalizeBridgeBack,
  fromHex,
  ReturnServiceClient,
  toEvmAddressHex,
  toHex,
  type BridgeBackReason,
  type LoadedBridge,
} from '@unicitylabs/bridge-plugin-tron-usdt/wallet';

import type { BridgeStore, PendingReturn } from './store';

const ZERO_ADDR = new Uint8Array(20);

export interface BridgeBackArgs {
  sphere: Sphere;
  bridge: LoadedBridge;
  store: BridgeStore;
  /** The wallet token id to burn (split to the exact amount first, then pass the child). */
  tokenId: string;
  /** Tron destination (base58 `T…` or hex) the USDT is released to. */
  destination: string;
  /** Amount in the asset's smallest unit. */
  amount: bigint;
  /** Seconds from now the relayer fee is guaranteed by (principal is always claimable). */
  deadlineSeconds?: number;
}

export interface BridgeBackResult {
  nullifierHex: string;
  returnId?: string;
  burnedTokenCborHex: string;
}

/** Burn the bridged token, persist the blob, and POST the witness to the return service. */
export async function runBridgeBack(args: BridgeBackArgs): Promise<BridgeBackResult> {
  const { sphere, bridge, store, tokenId, amount } = args;

  // Tron dest → 20-byte recipient; fee subsidized (0) while the service runs free.
  const recipient = fromHex(toEvmAddressHex(args.destination));
  const deadline = BigInt(Math.floor(Date.now() / 1000) + (args.deadlineSeconds ?? 3600));
  const reason: BridgeBackReason = {
    version: 1n,
    recipient,
    amount,
    feeRecipient: ZERO_ADDR,
    feeAmount: 0n,
    deadline,
  };

  // Pure: the canonical reason bytes + the BurnPredicate payload (no SDK needed).
  const { reasonBytes, reasonHash } = buildBridgeBackBurnReason(bridge.bridgeConfig, reason);

  // Sign + certify the burn (engine). Terminal — the token can never move again.
  const burn = await sphere.payments.bridgeBurn({ tokenId, reasonHash, reasonBytes });
  if (!burn.success) throw new Error(burn.error);

  const { preview, witnessRequest } = finalizeBridgeBack({
    configHash: bridge.configHash,
    reason,
    reasonBytes,
    burnStateId: burn.burnStateId,
    burnTxHash: burn.burnTxHash,
    burnedTokenCbor: burn.burnedTokenCbor,
  });

  // PERSIST the burned blob + nullifier BEFORE the network call (recovery).
  const pending: PendingReturn = {
    id: toHex(preview.nullifier),
    coinIdHex: bridge.plugin.coinIdHex,
    nullifierHex: toHex(preview.nullifier),
    burnedTokenCborHex: toHex(burn.burnedTokenCbor),
    reasonBytesHex: toHex(reasonBytes),
    configHashHex: toHex(bridge.configHash),
    recipient: args.destination,
    amount: amount.toString(),
    deadline: deadline.toString(),
    returnServiceUrl: bridge.manifest.returnServiceUrl,
    createdAt: Date.now(),
    status: 'queued',
  };
  store.persistReturn(pending);

  // Hand off to the return service (idempotent on nullifier). A service outage
  // doesn't lose anything — the blob is persisted and resubmittable.
  try {
    const client = new ReturnServiceClient(bridge.manifest.returnServiceUrl);
    const rec = await client.postReturn(witnessRequest);
    store.updateReturn(pending.id, { returnId: rec.returnId, status: rec.status });
    return { nullifierHex: pending.nullifierHex, returnId: rec.returnId, burnedTokenCborHex: pending.burnedTokenCborHex };
  } catch {
    // Burn is done + persisted; the user (or anyone) can resubmit later.
    return { nullifierHex: pending.nullifierHex, burnedTokenCborHex: pending.burnedTokenCborHex };
  }
}
