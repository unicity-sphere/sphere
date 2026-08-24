import { useEffect, useRef, type MutableRefObject } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSphereContext } from './useSphere';
import { SPHERE_KEYS } from '../../queryKeys';
import { diag } from '../../diag';
import { formatAmount } from '../../index';
import { showToast, showTransferToast } from '../../../components/ui/toast-utils';
import { CHAT_KEYS, GROUP_CHAT_KEYS, type DmReceivedDetail } from '../../../components/chat/data/chatTypes';
import { sendWelcomeDM } from '../../welcomeDM';
import type { IncomingTransfer } from '@unicitylabs/sphere-sdk';

// SDK DM shape (local mirror — SDK DTS not always available)
interface SDKDirectMessage {
  id: string;
  senderPubkey: string;
  recipientPubkey: string;
}

/** How long a coalesced incoming-payment toast stays up while more tokens land. */
const INCOMING_TOAST_MS = 6000;
/** Coarse because a history refetch re-walks every page (useTransactionHistory). */
const HISTORY_INVALIDATE_MS = 2500;

const PAYMENTS_INVALIDATE_MS = 300;

/** Leading-edge coalesce: first call schedules, the rest of the burst rides it. */
function coalesce(
  timer: MutableRefObject<ReturnType<typeof setTimeout> | null>,
  ms: number,
  label: string,
  run: () => void
): () => void {
  return () => {
    if (timer.current) {
      diag(`${label}:coalesced`);
      return;
    }
    timer.current = setTimeout(() => {
      timer.current = null;
      diag(`${label}:fired`);
      run();
    }, ms);
  };
}

const HISTORY_KEY = SPHERE_KEYS.payments.transactions.history;
function isHistoryKey(key: readonly unknown[]): boolean {
  return key.length >= HISTORY_KEY.length && HISTORY_KEY.every((part, i) => key[i] === part);
}

export function useSphereEvents(): void {
  const { sphere } = useSphereContext();
  const queryClient = useQueryClient();
  const invalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track seen transfer IDs to prevent duplicate toasts from Nostr re-deliveries
  const seenTransferIdsRef = useRef<Set<string>>(new Set());
  /** Running total per (sender, symbol) behind one coalesced incoming toast (#490). */
  const incomingTotalsRef = useRef<Map<string, { smallest: bigint; decimals: number }>>(new Map());
  const incomingGroupTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // One deferred-delivery toast per transfer — the SDK re-emits the
  // delivery:deferred attention code on every replay pass that hits the
  // recipient's full mailbox again.
  const deferredToastIdsRef = useRef<Set<string>>(new Set());

  // When sphere instance changes (new wallet, delete, import) —
  // immediately sync identity cache so the UI never shows stale data
  // from the previous wallet.
  useEffect(() => {
    if (sphere?.identity) {
      queryClient.setQueryData(SPHERE_KEYS.identity.current, { ...sphere.identity });
    } else {
      queryClient.removeQueries({ queryKey: SPHERE_KEYS.identity.all });
    }
  }, [sphere, queryClient]);

  useEffect(() => {
    if (!sphere) return;

    // Coalesced invalidation: the SDK fires bursts during init/sync and one
    // event per token during a receive. The parent key fires one notification
    // rather than four — EXCEPT the transaction history, which is refreshed on
    // its own far slower timer because useTransactionHistory walks the cursor to
    // completeness (up to 50 sequential pages). Sweeping it up here cost one full
    // re-walk per received token: 388 GET /v1/history in a 34 s receive.
    const invalidatePayments = coalesce(invalidateTimerRef, PAYMENTS_INVALIDATE_MS, 'invalidate', () => {
      queryClient.invalidateQueries({
        queryKey: SPHERE_KEYS.payments.all,
        predicate: (query) => !isHistoryKey(query.queryKey),
      });
    });

    const invalidateHistory = coalesce(historyTimerRef, HISTORY_INVALIDATE_MS, 'history-invalidate', () => {
      queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.payments.transactions.history });
    });

    const handleIncomingTransfer = (transfer: IncomingTransfer) => {
      diag('event:transfer:incoming');
      invalidatePayments();

      // Deduplicate: Nostr relays may re-deliver the same transfer on reconnect
      if (seenTransferIdsRef.current.has(transfer.id)) return;
      seenTransferIdsRef.current.add(transfer.id);

      const sender = transfer.senderNametag ? `@${transfer.senderNametag}` : 'Someone';
      const firstToken = transfer.tokens[0];
      const symbol = firstToken?.symbol ?? '?';
      const decimals = firstToken?.decimals ?? 0;

      // The SDK announces one event per TOKEN, not per payment, so a 54-token
      // payment would otherwise fire 54 near-identical toasts and bury the
      // wallet (#490). Accumulate per (sender, symbol) and drive a single
      // toast whose amount climbs as the tokens land — which also gives the
      // user live progress instead of a wall of noise.
      const groupKey = `incoming:${transfer.senderPubkey || sender}:${symbol}`;
      const carried = incomingTotalsRef.current.get(groupKey);
      const totalSmallest =
        (carried?.smallest ?? 0n) + transfer.tokens.reduce((sum, t) => sum + BigInt(t.amount || '0'), 0n);
      incomingTotalsRef.current.set(groupKey, { smallest: totalSmallest, decimals });
      // The group is only alive while its toast is: clear it a beat after the
      // toast's own dismissal so a later, unrelated payment starts from zero.
      const stale = incomingGroupTimersRef.current.get(groupKey);
      if (stale !== undefined) clearTimeout(stale);
      incomingGroupTimersRef.current.set(
        groupKey,
        setTimeout(() => {
          incomingTotalsRef.current.delete(groupKey);
          incomingGroupTimersRef.current.delete(groupKey);
          // By now the drain has flushed and the real balance has caught up, so
          // the progress line would only duplicate it.
          queryClient.setQueryData(SPHERE_KEYS.incoming.progress, null);
        }, INCOMING_TOAST_MS + 500),
      );

      // The confirmed balance cannot move until the drain's acks flush
      // (ACK_BATCH_SIZE=200, so once at the end for a big receive) and the
      // server inventory is re-pulled. Publish the running total so the wallet
      // can show the money arriving instead of sitting at its old value.
      queryClient.setQueryData(SPHERE_KEYS.incoming.progress, {
        amount: formatAmount(totalSmallest.toString(), decimals),
        symbol,
        sender,
        at: Date.now(),
      });

      showTransferToast(
        {
          sender,
          amount: formatAmount(totalSmallest.toString(), decimals),
          symbol,
          iconUrl: firstToken?.iconUrl,
          memo: transfer.memo,
        },
        INCOMING_TOAST_MS,
        groupKey,
      );
    };
    // transfer:updated replaces transfer:confirmed / transfer:delivery_pending /
    // transfer:failed on the v2 vertical — any outcome refreshes the payment queries.
    const handleTransferUpdated = invalidatePayments;

    // Write sphere.identity directly into the query cache — by the time SDK
    // fires these events, its internal state is already updated.  Plain
    // invalidation can race with the SDK update, returning stale data.
    const refreshIdentityCache = () => {
      if (sphere.identity) {
        queryClient.setQueryData(SPHERE_KEYS.identity.current, { ...sphere.identity });
      }
    };

    const handleNametagChange = () => {
      refreshIdentityCache();
      queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.identity.all });
    };

    const handleIdentityChange = () => {
      // New identity = new transfer stream (wallet-api sessions are
      // per-identity): clear the toast dedup sets so the new address's
      // transfers are never swallowed by ids seen under the old one.
      seenTransferIdsRef.current.clear();
      deferredToastIdsRef.current.clear();
      refreshIdentityCache();
      queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.identity.all });
      queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.payments.all });
      // Remove (not invalidate) chat caches — address-scoped queries will
      // refetch with fresh data.  Invalidation alone can race with the
      // address switch and display stale data from the previous address.
      queryClient.removeQueries({ queryKey: CHAT_KEYS.all });
      queryClient.removeQueries({ queryKey: GROUP_CHAT_KEYS.all });

      // Send welcome DMs for the new address (fire-and-forget, idempotent)
      sendWelcomeDM(sphere);
    };

    // inventory:updated replaces sync:completed / sync:remote-update — the
    // wallet-api inventory mirror changed, re-read tokens()/assets().
    const handleInventoryUpdated = () => {
      diag('event:inventory:updated');
      invalidatePayments();
    };

    // Bridge incoming SDK DMs to lightweight custom event + query invalidation
    const handleDmReceived = (dm: SDKDirectMessage) => {
      const myPubkey = sphere.identity?.chainPubkey;

      // Only process DMs belonging to the current address — the mux delivers
      // events for ALL addresses, and processing other addresses' DMs would
      // pollute the current address's query cache with stale data.
      if (dm.senderPubkey !== myPubkey && dm.recipientPubkey !== myPubkey) return;

      const isFromMe = dm.senderPubkey === myPubkey;
      const peerPubkey = isFromMe ? dm.recipientPubkey : dm.senderPubkey;

      // Invalidate chat queries so UI re-reads from SDK
      queryClient.invalidateQueries({ queryKey: CHAT_KEYS.all });

      // Dispatch lightweight event for UI components (useChat, MiniChatWindow)
      const detail: DmReceivedDetail = { peerPubkey, messageId: dm.id, isFromMe };
      window.dispatchEvent(new CustomEvent('dm-received', { detail }));

      // Invalidate SDK communication queries
      queryClient.invalidateQueries({
        queryKey: SPHERE_KEYS.communications.all,
      });
    };

    // Bridge read receipts — SDK already updated isRead, just invalidate
    const handleMessageRead = () => {
      queryClient.invalidateQueries({ queryKey: CHAT_KEYS.all });
    };

    // Bridge composing indicators to custom event
    const handleComposingStarted = (data: { senderPubkey: string; senderNametag?: string; expiresIn: number }) => {
      window.dispatchEvent(new CustomEvent('dm-typing', { detail: data }));
    };

    // Bridge incoming payment requests to custom event
    const handlePaymentRequestIncoming = () => {
      window.dispatchEvent(new Event('payment-requests-updated'));
    };

    // Invalidate history query immediately when SDK saves a new history entry
    // Emitted once PER RECORD (sphere-sdk History.post), i.e. once per received
    // token — never invalidate straight through.
    const handleHistoryUpdated = invalidateHistory;

    // transfer:attention replaces split:checkpoint-stuck / delivery:undeliverable /
    // delivery:deferred — one event, toast keyed by `code`:
    //  - 'split:checkpoint-stuck' (sphere-sdk#501 / E.4): a certified split is
    //    STUCK on a keep-open checkpoint error. The intent stays OPEN and the
    //    funds are safe — it retries on the next resume — but the E.4 contract
    //    requires a LOUD signal (not a silent retry). `detail` carries the
    //    checkpoint error code (e.g. SPLIT_CHECKPOINT_LOST).
    //  - 'delivery:undeliverable' (sphere-sdk#517 item 1, #434): a journaled
    //    post-commit delivery exhausted its bounded replay budget and is POISON —
    //    kept journaled, never auto-retried. The spend is final on-chain and the
    //    recipient has NOT received it, so it must not strand silently.
    //  - 'delivery:deferred' (§3.1 / sphere-sdk#621, #434): recipient's mailbox is
    //    full (429) — the delivery stays journaled and retries after the deferral
    //    window. Not a failure; toast once per transfer so replay passes don't
    //    re-announce the same deferral.
    const handleTransferAttention = (data: { transferId: string; code: string; detail?: string }) => {
      switch (data.code) {
        case 'split:checkpoint-stuck':
          showToast(
            `A split payment is stuck settling (${data.detail ?? data.code}) — your funds are safe and it will retry on ` +
              `reconnect. If it persists, contact support with reference ${data.transferId.slice(0, 8)}.`,
            'error',
            15000,
          );
          break;
        case 'delivery:undeliverable':
          showToast(
            `A sent transfer could not be delivered after repeated attempts — the funds are ` +
              `committed to the recipient but undelivered. Contact support with reference ` +
              `${data.transferId.slice(0, 8)}.`,
            'error',
            15000,
          );
          break;
        case 'delivery:deferred':
          if (deferredToastIdsRef.current.has(data.transferId)) return;
          deferredToastIdsRef.current.add(data.transferId);
          showToast(
            "Recipient can't receive yet (inbox full) — delivery will retry automatically.",
            'info',
            8000,
          );
          break;
        // Other codes (e.g. 'sync:pending', 'mint:unresolved') resolve on their
        // own via resume — no toast.
      }
    };

    sphere.on('transfer:incoming', handleIncomingTransfer);
    // v2 vertical: transfer:updated fires for every outgoing-transfer outcome
    // (confirmed, delivery pending, failed) — the spend state changed either
    // way, so balances/inventory/history must refresh.
    sphere.on('transfer:updated', handleTransferUpdated);
    sphere.on('history:updated', handleHistoryUpdated);
    sphere.on('nametag:registered', handleNametagChange);
    sphere.on('nametag:recovered', handleNametagChange);
    sphere.on('identity:changed', handleIdentityChange);
    sphere.on('inventory:updated', handleInventoryUpdated);
    sphere.on('message:dm', handleDmReceived);
    sphere.on('message:read', handleMessageRead);
    sphere.on('composing:started', handleComposingStarted);
    sphere.on('payment_request:incoming', handlePaymentRequestIncoming);
    sphere.on('transfer:attention', handleTransferAttention);

    return () => {
      for (const timer of [invalidateTimerRef, historyTimerRef]) {
        if (timer.current === null) continue;
        clearTimeout(timer.current);
        timer.current = null;
      }
      sphere.off('transfer:incoming', handleIncomingTransfer);
      sphere.off('transfer:updated', handleTransferUpdated);
      sphere.off('history:updated', handleHistoryUpdated);
      sphere.off('nametag:registered', handleNametagChange);
      sphere.off('nametag:recovered', handleNametagChange);
      sphere.off('identity:changed', handleIdentityChange);
      sphere.off('inventory:updated', handleInventoryUpdated);
      sphere.off('message:dm', handleDmReceived);
      sphere.off('message:read', handleMessageRead);
      sphere.off('composing:started', handleComposingStarted);
      sphere.off('payment_request:incoming', handlePaymentRequestIncoming);
      sphere.off('transfer:attention', handleTransferAttention);
    };
  }, [sphere, queryClient]);
}
