import { burnIdentifiers, burnTransitionId, decodeBridgeBackReason, nullifier, type BridgeBackReason } from '@unicitylabs/bridge-plugin';
import {
  buildBridgeBackBurnReason,
  mintedAgainst,
  ReturnServiceClient,
  ReturnServiceError,
  type LoadedBridge,
  type ReturnRecord,
} from '@unicitylabs/bridge-plugin/wallet';

import type { BridgeOutSide, ReturnServiceRecord } from '../types';

const ZERO_ADDRESS = new Uint8Array(20);
const RETURN_DEADLINE_SECONDS = 3600;

export function bridgeOut(bridge: LoadedBridge, recipientOf: (destination: string) => Uint8Array): BridgeOutSide {
  const cfg = bridge.bridgeConfig;
  const client = new ReturnServiceClient(bridge.manifest.returnServiceUrl);
  return {
    reasonFor: ({ amount, destination }) => {
      const reason: BridgeBackReason = {
        version: 1n,
        recipient: recipientOf(destination),
        amount,
        feeRecipient: ZERO_ADDRESS,
        feeAmount: 0n,
        deadline: BigInt(Math.floor(Date.now() / 1000) + RETURN_DEADLINE_SECONDS),
      };
      return buildBridgeBackBurnReason(cfg, reason).reasonBytes;
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
      };
    },
    backs: (justification) => mintedAgainst(bridge, justification),
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

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function toHex(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s;
}
