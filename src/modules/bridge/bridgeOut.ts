import { burnForReturn, recoverPendingBurns, type BridgePayments } from '@unicitylabs/bridge-core';
import { fromHex, toHex } from '@unicitylabs/bridge-plugin';
import { logger } from '@unicitylabs/sphere-sdk';

import type { BridgeStore, PendingReturn } from './store';
import type { BridgeAsset, BridgeOutSide, ReturnServiceRecord } from './types';

export const RETRY_DELAY_MS = 60_000;

export interface BridgeOutArgs {
  readonly payments: BridgePayments;
  readonly store: BridgeStore;
  readonly asset: BridgeAsset;
  readonly tokenId: string;
  readonly amount: bigint;
  readonly destination: string;
}

export async function runBridgeOut(args: BridgeOutArgs): Promise<PendingReturn> {
  const { payments, store, asset, tokenId, amount, destination } = args;
  const out = outSide(asset);
  if (!asset.presentation.validateAddress(destination)) {
    throw new Error(`Enter a valid ${asset.chain.name} destination address.`);
  }
  const reasonBytes = out.reasonFor({ amount, destination });

  let record: PendingReturn | undefined;
  await burnForReturn(payments, {
    tokenId,
    reasonBytes,
    persist: async (burnedToken) => {
      const identity = await out.identify(burnedToken);
      if (!identity) throw new Error('The burned token does not belong to this asset.');
      record = {
        id: identity.nullifierHex,
        coinIdHex: asset.coinIdHex,
        assetId: asset.id,
        burnedTokenHex: toHex(burnedToken),
        reasonBytesHex: toHex(reasonBytes),
        destination,
        amount: amount.toString(),
        createdAt: Date.now(),
        status: 'burned',
      };
      if (!store.persistReturn(record)) {
        throw new Error('Could not save the burned token locally; the wallet keeps it. Free some storage and open Bridge again.');
      }
    },
  });
  if (!record) throw new Error('The burn produced no record.');
  return submitReturn(store, out, record);
}

export async function submitReturn(store: BridgeStore, out: BridgeOutSide, record: PendingReturn): Promise<PendingReturn> {
  try {
    const burnedToken = fromHex(record.burnedTokenHex);
    const rec = await out.returns.submit(burnedToken, await reasonOf(out, record, burnedToken));
    store.updateReturn(record.id, fromService(rec, record));
  } catch (err) {
    const refusal = out.returns.refusal(err);
    if (refusal) {
      store.updateReturn(record.id, { status: 'failed', message: refusal.message, recoverable: refusal.recoverable, failedAt: Date.now() });
    }
  }
  return store.getReturn(record.id) ?? record;
}

export async function syncReturns(store: BridgeStore, assetById: (id: string) => BridgeAsset | undefined): Promise<PendingReturn[]> {
  await Promise.all(
    store.activeReturns().map(async (record) => {
      const asset = assetById(record.assetId);
      const out = asset?.out;
      if (!out) return;
      if (!record.returnId) {
        if (record.status !== 'failed' || dueForRetry(record)) await submitReturn(store, out, record);
        return;
      }
      try {
        const rec = await out.returns.status(record.returnId);
        if (rec === null) {
          await submitReturn(store, out, { ...record, returnId: undefined });
          return;
        }
        store.updateReturn(record.id, fromService(rec, record));
      } catch {
        return;
      }
      const current = store.getReturn(record.id);
      if (current && dueForRetry(current)) await submitReturn(store, out, current);
    }),
  );
  return store.listReturns();
}

export async function retryReturn(store: BridgeStore, asset: BridgeAsset, id: string): Promise<PendingReturn | undefined> {
  const record = store.getReturn(id);
  if (!record || !asset.out) return record;
  return submitReturn(store, asset.out, record);
}

async function reasonOf(out: BridgeOutSide, record: PendingReturn, burnedToken: Uint8Array): Promise<Uint8Array> {
  if (record.reasonBytesHex) return fromHex(record.reasonBytesHex);
  return (await out.identify(burnedToken))?.reasonBytes ?? new Uint8Array();
}

function fromService(rec: ReturnServiceRecord, record: PendingReturn): Partial<PendingReturn> {
  const failed = rec.status === 'failed';
  return {
    returnId: rec.returnId,
    status: rec.status,
    settleTxid: rec.settleTxid,
    message: rec.message,
    recoverable: failed ? rec.recoverable : undefined,
    failedAt: failed ? (record.failedAt ?? Date.now()) : undefined,
    queuePosition: rec.queuePosition,
    sinceMs: rec.sinceMs,
  };
}

function dueForRetry(r: PendingReturn): boolean {
  return r.status === 'failed' && r.recoverable === true && Date.now() - (r.failedAt ?? 0) >= RETRY_DELAY_MS;
}

export async function recoverBurns(
  payments: BridgePayments,
  store: BridgeStore,
  assets: readonly BridgeAsset[],
): Promise<PendingReturn[]> {
  const recovered: PendingReturn[] = [];
  await recoverPendingBurns(payments, async (burnedToken, burnId) => {
    for (const asset of assets) {
      const identity = await asset.out?.identify(burnedToken);
      if (!identity) continue;
      const record: PendingReturn = {
        id: identity.nullifierHex,
        coinIdHex: asset.coinIdHex,
        assetId: asset.id,
        burnedTokenHex: toHex(burnedToken),
        reasonBytesHex: toHex(identity.reasonBytes),
        destination: identity.destination,
        amount: identity.amount.toString(),
        createdAt: Date.now(),
        status: 'burned',
      };
      const existing = store.getReturn(record.id);
      if (existing) return;
      if (!store.persistReturn(record)) throw new Error('Could not save a recovered burn; the wallet keeps it.');
      recovered.push(record);
      return;
    }
    logger.warn('Bridge', `burn ${burnId}: no configured asset recognises the burned token; it stays in the wallet journal`);
    throw new Error('No configured asset recognises this burned token; the wallet keeps it.');
  }).catch(() => {
  });
  return recovered;
}

function outSide(asset: BridgeAsset): BridgeOutSide {
  if (!asset.out) throw new Error(`${asset.label} cannot be bridged out from this wallet.`);
  return asset.out;
}
