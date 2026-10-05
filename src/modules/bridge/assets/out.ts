import { burnIdentifiers, burnTransitionId, bytesEqual, decodeBridgeBackReason, nullifier, toHex } from '@unicitylabs/bridge-plugin';
import {
  buildBridgeBackBurnReason,
  feeTerms,
  mintedAgainst,
  parseFeeQuote,
  ReturnServiceClient,
  ReturnServiceError,
  type FeeTerms,
  type LoadedBridge,
  type ReturnRecord,
} from '@unicitylabs/bridge-plugin/wallet';

import type { BridgeOutSide, BridgePayout, ReturnServiceRecord } from '../types';

export interface BridgeOutOptions {
  /** The most this wallet lets a return service take from one burned token, in the asset's smallest unit. */
  readonly feeCap: bigint;
  /** When set, the only account a fee may go to; a service that names another is refused. */
  readonly feeRecipient?: Uint8Array;
  readonly payout?: BridgePayout;
}

export function bridgeOut(bridge: LoadedBridge, recipientOf: (destination: string) => Uint8Array, options: BridgeOutOptions): BridgeOutSide {
  const cfg = bridge.bridgeConfig;
  const client = new ReturnServiceClient(bridge.manifest.returnServiceUrl);
  const { feeCap, feeRecipient, payout } = options;
  const payable = (terms: FeeTerms): FeeTerms => {
    if (terms.feeAmount > feeCap) {
      throw new Error(`The return service asks a fee above what this wallet allows for ${bridge.manifest.symbol}.`);
    }
    if (terms.feeAmount > 0n && feeRecipient && !bytesEqual(terms.feeRecipient, feeRecipient)) {
      throw new Error('The return service names a fee recipient other than the account this wallet pays.');
    }
    return terms;
  };
  return {
    fee: async () => payable(parseFeeQuote(await client.getFees(), Date.now())).feeAmount,
    reasonFor: async ({ amount, destination, maxFee }) => {
      const recipient = recipientOf(destination);
      const terms = payable(feeTerms(await client.getFees(), { amount, maxFee, nowMs: Date.now() }));
      return buildBridgeBackBurnReason(cfg, { version: 1n, recipient, amount, ...terms }).reasonBytes;
    },
    identify: async (burnedToken) => {
      const ids = await burnIdentifiers(burnedToken);
      let reason;
      try {
        reason = decodeBridgeBackReason(ids.reasonBytes);
      } catch {
        return null;
      }
      if (!bytesEqual(reason.vault, cfg.vault) || !bytesEqual(reason.coinId, cfg.coinId)) return null;
      return {
        nullifierHex: toHex(nullifier(bridge.configHash, burnTransitionId(ids.burnStateId, ids.burnTxHash))),
        destination: `0x${toHex(reason.recipient)}`,
        amount: reason.amount,
        fee: reason.feeAmount,
        reasonBytes: ids.reasonBytes,
      };
    },
    backs: (justification) => mintedAgainst(bridge, justification),
    ...(payout ? { payout } : {}),
    returns: {
      submit: async (burnedToken, reasonBytes) =>
        serviceRecord(await client.postReturn({ tokenCbor: burnedToken, configHash: bridge.configHash, reasonBytes })),
      status: async (returnId) => {
        try {
          return serviceRecord(await client.getReturn(returnId));
        } catch (err) {
          if (err instanceof Error && /HTTP 404/.test(err.message)) return null;
          throw err;
        }
      },
      refusal: (err) => (err instanceof ReturnServiceError ? { message: err.message, recoverable: err.recoverable } : null),
      timing: async () => {
        try {
          const health = await client.getHealth();
          return { provingSinceMs: health.provingSinceMs ?? undefined, averageProofMs: health.averageProofMs ?? undefined };
        } catch {
          return null;
        }
      },
    },
  };
}

function serviceRecord(rec: ReturnRecord): ReturnServiceRecord {
  return {
    returnId: rec.returnId,
    status: rec.status,
    settleTxid: rec.settleTxid,
    message: rec.message,
    recoverable: rec.failure?.recoverable,
    queuePosition: rec.queuePosition ?? undefined,
    sinceMs: rec.updatedAtMs,
  };
}
