import { useCallback, useEffect, useRef, useState } from 'react';
import { coinIdsMatch } from '@unicitylabs/sphere-sdk';
import type { Sphere } from '@unicitylabs/sphere-sdk';
import type { PendingTransfer } from '@unicitylabs/sphere-sdk/payments-v2';
import { getPayments } from '../../sdk/payments';
import { useSphereContext } from '../../sdk/hooks/core/useSphere';
import { isChainPubkey } from '../../utils/identifiers';
import type { PendingIntent } from './ConnectContext';

/**
 * THE INVARIANT: the wallet never executes a Connect `send` intent that
 * duplicates a payment already converging.
 *
 * Why the WALLET has to own this — a dApp cannot be trusted to behave, and
 * every layer under this one is blind to it:
 *
 *  - A keep-open send outcome (#631/#665: the spend may already be certified
 *    on-chain, and the SDK converges that SAME transferId in-session) is
 *    reported to the dApp as `{success:true, status:'pending',
 *    deliveryPending:true}` — synthesized in useTransfer, handed on by
 *    ConnectIntentHandler. A dApp that reads `status:'pending'` as "not
 *    finished yet" and re-issues the intent is not misbehaving unreasonably;
 *    it is reading a word that means "still converging" as "did not happen".
 *  - Nothing below dedupes it. `ConnectHost.handleIntentRequest` and the
 *    InFlightRegistry dedupe by REQUEST id, so a fresh request is fresh work;
 *    the ConnectProvider queue is FIFO, not a deduper; and the SDK's
 *    reservation ledger only stops the SAME token being spent twice — a new
 *    transferId simply plans against the remaining free balance.
 *  - Audit probe: seed 100 + 100, send 100 → keep-open; re-send 100 →
 *    delivered. Recipient mailbox: 2 entries. SENT history: two transferIds.
 *    200 delivered for a 100 request.
 *  - It is version-independent (a 0.14.1+ dApp retrying does exactly this), so
 *    the Connect SDK floor in config/connect.ts does NOT mitigate it.
 *
 * "Converging" is exactly `payments.pendingTransfers()` (sphere-sdk 0.14.2):
 * the SDK derives that list ON READ from the intent backstop + delivery
 * journal + shortfalls, so it survives a reload and needs no wallet-side
 * bookkeeping of its own — nothing here is cached, and a re-issue after a
 * refresh or a crash is caught exactly like one in the same session.
 *
 * The read happens when the intent ARRIVES, which is enough for the vector it
 * closes: the SDK writes the backstop row at plan time, i.e. BEFORE the dApp
 * receives any answer at all, so a re-issue can never outrun the row it must
 * see. A row appearing later (another host's send going keep-open while this
 * confirmation sits on screen) is outside the check.
 *
 * The guard NEVER auto-executes and NEVER silently rejects: a match raises a
 * blocking confirmation naming the in-flight transfer (ConnectIntentHandler),
 * because the user may genuinely want to pay the same person the same amount
 * twice.
 */

/**
 * Bounded wait for the check. It is one derived-store read plus at most one
 * recipient resolution, but both can ride the network — and a guard that hangs
 * would strand the dApp's intent behind a modal that never appears. On expiry
 * the check FAILS OPEN (the send modal renders as before): the guard is a
 * safety net over a rare outcome, never a gate that can freeze a payment.
 */
export const DUPLICATE_CHECK_TIMEOUT_MS = 4_000;

/**
 * The exact recipient string the send path spends against — SendIntentModal
 * hands this to the SDK, and the guard resolves this, so both sides can never
 * disagree about who is being paid.
 */
export function sendIntentRecipient(to: string): string {
  return to.startsWith('DIRECT://') ? to : to.replace(/^@/, '');
}

/** Exact decimal-string compare in base units — BigInt on both sides, never a float. */
function sameAmount(rowAmount: string, want: bigint): boolean {
  const raw = rowAmount.trim();
  if (raw === '') return false; // journal-only rows carry no amount
  try {
    return BigInt(raw) === want;
  } catch {
    return false;
  }
}

export interface DuplicateSendTarget {
  /** Recipient chain pubkey, already resolved (case-insensitive on compare). */
  recipientPubkey: string;
  coinId: string;
  /** Base units, decimal string. */
  amount: string;
}

/**
 * The first converging transfer that pays the same recipient the same amount of
 * the same coin, or null.
 *
 * Normalization: pubkey case-insensitive (the SDK lowercases a literal pubkey
 * recipient but a binding-resolved one keeps its published case); coinId via
 * the SDK's own `coinIdsMatch` (registry-canonical, so `UCT` and its 64-hex id
 * are one coin); amount by BigInt equality.
 *
 * A journal-only row (delivery owed, payload gone) carries an empty coinId and
 * amount and therefore never matches — it cannot be compared honestly, and
 * blocking on recipient alone would refuse unrelated payments. A shortfall row
 * (#690) carries the REMAINING amount, so re-issuing the original full amount
 * against one does not match either: that is a partial settlement, a different
 * problem from the duplicate this guard exists for.
 */
export function findDuplicatePending(
  rows: readonly PendingTransfer[],
  target: DuplicateSendTarget,
): PendingTransfer | null {
  const wantPubkey = target.recipientPubkey.trim().toLowerCase();
  if (wantPubkey === '') return null;
  let wantAmount: bigint;
  try {
    wantAmount = BigInt(target.amount.trim());
  } catch {
    return null;
  }
  return (
    rows.find(
      (row) =>
        row.recipient.trim().toLowerCase() === wantPubkey &&
        row.coinId !== '' &&
        coinIdsMatch(row.coinId, target.coinId) &&
        sameAmount(row.amount, wantAmount),
    ) ?? null
  );
}

/**
 * Resolve an intent recipient to a chain pubkey the same way the send path
 * does: the SDK's `resolveRecipientInfo` takes a literal chain pubkey as the
 * answer and sends everything else through the peer resolver (`sphere.resolve`,
 * the one SendModal and LookupModal use). Returns null when it cannot be
 * resolved — the send itself would then fail INVALID_RECIPIENT anyway.
 */
async function resolveRecipientPubkey(sphere: Sphere | null, to: string): Promise<string | null> {
  const identifier = sendIntentRecipient(to);
  if (isChainPubkey(identifier)) return identifier;
  const peer = await sphere?.resolve(identifier);
  return peer?.chainPubkey ? peer.chainPubkey : null;
}

export type DuplicateSendGuard =
  | { status: 'checking'; match: null }
  | { status: 'clear'; match: null }
  | { status: 'duplicate'; match: PendingTransfer };

const CLEAR: DuplicateSendGuard = { status: 'clear', match: null };
const CHECKING: DuplicateSendGuard = { status: 'checking', match: null };

export interface UseDuplicateSendGuardReturn {
  guard: DuplicateSendGuard;
  /** The user looked at the warning and chose to pay twice anyway. */
  approveAnyway: () => void;
}

/**
 * Runs the invariant above for the `send` intent at the head of the queue.
 * Non-send intents (and no intent at all) are always 'clear'.
 */
export function useDuplicateSendGuard(intent: PendingIntent | null): UseDuplicateSendGuardReturn {
  const { sphere } = useSphereContext();
  // Stamped with the intent it answers. A verdict is NEVER read for another
  // intent: a send whose check has not settled reads 'checking' from the render
  // itself, so the send modal cannot flash on screen in the frame before the
  // effect starts (useEffect runs after paint — that frame is real).
  const [checked, setChecked] = useState<{ intentId: number; guard: DuplicateSendGuard } | null>(null);
  // Generation counter: the head advances (and StrictMode re-runs effects)
  // while a check is in flight — only the newest run may write state.
  const runRef = useRef(0);

  const isSend = intent !== null && intent.action === 'send';
  // Two identical back-to-back send intents — the double-pay case itself —
  // differ ONLY by id, so the id has to be a dependency.
  const intentId = intent?.id ?? null;
  const to = isSend ? String(intent.params.to ?? '') : '';
  const coinId = isSend ? String(intent.params.coinId ?? '') : '';
  const amount = isSend ? String(intent.params.amount ?? '') : '';

  useEffect(() => {
    const run = ++runRef.current;
    if (!isSend || intentId === null) return;

    let done = false;
    // `timer` is initialized before anything can call settle() — the timeout
    // callback and the async pass below both run after this statement.
    const settle = (next: DuplicateSendGuard) => {
      if (done || runRef.current !== run) return;
      done = true;
      clearTimeout(timer);
      setChecked({ intentId, guard: next });
    };
    const timer = setTimeout(() => settle(CLEAR), DUPLICATE_CHECK_TIMEOUT_MS);

    void (async () => {
      try {
        const payments = getPayments(sphere);
        if (!payments) return settle(CLEAR);
        const rows = await payments.pendingTransfers();
        // Nothing is converging: the overwhelmingly common case, and it costs
        // no recipient resolution at all.
        if (rows.length === 0) return settle(CLEAR);
        const recipientPubkey = await resolveRecipientPubkey(sphere, to);
        if (recipientPubkey === null) return settle(CLEAR);
        const match = findDuplicatePending(rows, { recipientPubkey, coinId, amount });
        settle(match === null ? CLEAR : { status: 'duplicate', match });
      } catch {
        // Fail open — see DUPLICATE_CHECK_TIMEOUT_MS.
        settle(CLEAR);
      }
    })();

    return () => clearTimeout(timer);
  }, [sphere, isSend, intentId, to, coinId, amount]);

  // Stamped with the intent the user was actually looking at, so an override
  // can never leak to a later payment.
  const approveAnyway = useCallback(() => {
    if (intentId !== null) setChecked({ intentId, guard: CLEAR });
  }, [intentId]);

  const guard: DuplicateSendGuard = !isSend
    ? CLEAR
    : checked !== null && checked.intentId === intentId
      ? checked.guard
      : CHECKING;

  return { guard, approveAnyway };
}
