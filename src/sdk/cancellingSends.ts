import type { Sphere } from '@unicitylabs/sphere-sdk';
import type { PendingTransfer } from '@unicitylabs/sphere-sdk/payments-v2';
import { isChainPubkey } from '../utils/identifiers';

/**
 * Sends this session saw end "being cancelled" (sphere-sdk 0.19.0, #835).
 *
 * The SDK leaves such a send out of `pendingTransfers()`, yet until the wallet
 * service confirms its cancel another device of the wallet could still complete
 * it. The duplicate-send guards (SendModal, Connect) read these rows beside
 * `pendingTransfers()`, so sending the same payment again still warns first.
 *
 * In memory for the session: the SDK emits nothing when the cancel is confirmed
 * (sphere-sdk#843), so a row keeps warning until reload. The guard only warns,
 * so a stale row costs one extra confirmation, never a blocked payment.
 */
const rows: { owner: string; row: PendingTransfer }[] = [];

/** The sending address: rows of another address (after a switch) are never this one's duplicates. */
function ownerOf(sphere: Sphere | null): string | null {
  return sphere?.identity?.chainPubkey ?? null;
}

/** How long recording waits for the recipient lookup: the send outcome waits on it. */
export const CANCELLING_LOOKUP_TIMEOUT_MS = 3_000;

/** The recipient as a chain pubkey, resolved the way the send path resolves it; null when it cannot be in time. */
async function chainPubkeyOf(sphere: Sphere | null, recipient: string): Promise<string | null> {
  if (isChainPubkey(recipient)) return recipient;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const peer = await Promise.race([
      Promise.resolve().then(() => sphere?.resolve(recipient)),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), CANCELLING_LOOKUP_TIMEOUT_MS);
      }),
    ]);
    return peer?.chainPubkey ? peer.chainPubkey : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Best effort, and never rejects (callers fire and forget): an unresolvable recipient records nothing. */
export async function rememberCancellingSend(
  sphere: Sphere | null,
  send: { transferId: string; recipient: string; coinId: string; amount: string },
): Promise<void> {
  const owner = ownerOf(sphere);
  const recipient = await chainPubkeyOf(sphere, send.recipient);
  if (owner === null || recipient === null) return;
  rows.push({
    owner,
    row: {
      transferId: send.transferId,
      kind: 'open',
      recipient,
      coinId: send.coinId,
      amount: send.amount,
      legs: { certified: 0, total: 0 },
      deliveryPending: false,
      createdAt: Date.now(),
    },
  });
}

/** The active address's rows only. */
export function cancellingSends(sphere: Sphere | null): readonly PendingTransfer[] {
  const owner = ownerOf(sphere);
  return owner === null ? [] : rows.filter((entry) => entry.owner === owner).map((entry) => entry.row);
}

/** Tests only. */
export function forgetCancellingSends(): void {
  rows.length = 0;
}
