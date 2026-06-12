import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSphereContext } from './useSphere';
import { SPHERE_KEYS } from '../../queryKeys';
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

export function useSphereEvents(): void {
  const { sphere } = useSphereContext();
  const queryClient = useQueryClient();
  const invalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track seen transfer IDs to prevent duplicate toasts from Nostr re-deliveries
  const seenTransferIdsRef = useRef<Set<string>>(new Set());

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

    // Debounced payment invalidation — SDK fires bursts of events during
    // init / sync, so we coalesce them into a single invalidation pass.
    // Uses the parent key so TanStack fires one notification (not four).
    const invalidatePayments = () => {
      if (invalidateTimerRef.current) return; // already scheduled
      invalidateTimerRef.current = setTimeout(() => {
        invalidateTimerRef.current = null;
        queryClient.invalidateQueries({
          queryKey: SPHERE_KEYS.payments.all,
        });
      }, 300);
    };

    const handleIncomingTransfer = (transfer: IncomingTransfer) => {
      invalidatePayments();

      // Deduplicate: Nostr relays may re-deliver the same transfer on reconnect
      if (seenTransferIdsRef.current.has(transfer.id)) return;
      seenTransferIdsRef.current.add(transfer.id);

      const sender = transfer.senderNametag ? `@${transfer.senderNametag}` : 'Someone';
      const firstToken = transfer.tokens[0];
      const symbol = firstToken?.symbol ?? '?';
      const decimals = firstToken?.decimals ?? 0;

      // Sum all token amounts for the total (all tokens share the same coin type)
      let amount: string;
      if (transfer.tokens.length <= 1) {
        amount = firstToken ? formatAmount(firstToken.amount, decimals) : '?';
      } else {
        const totalSmallest = transfer.tokens.reduce(
          (sum, t) => sum + BigInt(t.amount || '0'),
          0n,
        );
        amount = formatAmount(totalSmallest.toString(), decimals);
      }

      showTransferToast({
        sender,
        amount,
        symbol,
        iconUrl: firstToken?.iconUrl,
        memo: transfer.memo,
      });
    };
    const handleTransferConfirmed = invalidatePayments;

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
      // per-identity): clear the toast dedup set so the new address's
      // transfers are never swallowed by ids seen under the old one.
      seenTransferIdsRef.current.clear();
      refreshIdentityCache();
      queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.identity.all });
      queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.payments.all });
      queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.l1.all });
      // Remove (not invalidate) chat caches — address-scoped queries will
      // refetch with fresh data.  Invalidation alone can race with the
      // address switch and display stale data from the previous address.
      queryClient.removeQueries({ queryKey: CHAT_KEYS.all });
      queryClient.removeQueries({ queryKey: GROUP_CHAT_KEYS.all });

      // Send welcome DMs for the new address (fire-and-forget, idempotent)
      sendWelcomeDM(sphere);
    };

    const handleSyncCompleted = invalidatePayments;

    const handleSyncRemoteUpdate = invalidatePayments;

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
    const handleHistoryUpdated = () => {
      queryClient.invalidateQueries({
        queryKey: SPHERE_KEYS.payments.transactions.history,
      });
    };

    // sphere-sdk#515 F2: a background custody save failed — the active
    // custody provider rejected a write. Surface it (never log-only); the
    // SEND pipeline already fails hard on its own writes.
    const handleStorageDegraded = (data: { providerId: string; error: string }) => {
      showToast(
        `Token storage degraded (${data.providerId}): a background save failed — ${data.error}`,
        'error',
        10000,
      );
    };

    sphere.on('transfer:incoming', handleIncomingTransfer);
    sphere.on('transfer:confirmed', handleTransferConfirmed);
    sphere.on('history:updated', handleHistoryUpdated);
    sphere.on('nametag:registered', handleNametagChange);
    sphere.on('nametag:recovered', handleNametagChange);
    sphere.on('identity:changed', handleIdentityChange);
    sphere.on('sync:completed', handleSyncCompleted);
    sphere.on('sync:remote-update', handleSyncRemoteUpdate);
    sphere.on('message:dm', handleDmReceived);
    sphere.on('message:read', handleMessageRead);
    sphere.on('composing:started', handleComposingStarted);
    sphere.on('payment_request:incoming', handlePaymentRequestIncoming);
    sphere.on('storage:degraded', handleStorageDegraded);

    return () => {
      if (invalidateTimerRef.current) {
        clearTimeout(invalidateTimerRef.current);
        invalidateTimerRef.current = null;
      }
      sphere.off('transfer:incoming', handleIncomingTransfer);
      sphere.off('transfer:confirmed', handleTransferConfirmed);
      sphere.off('history:updated', handleHistoryUpdated);
      sphere.off('nametag:registered', handleNametagChange);
      sphere.off('nametag:recovered', handleNametagChange);
      sphere.off('identity:changed', handleIdentityChange);
      sphere.off('sync:completed', handleSyncCompleted);
      sphere.off('sync:remote-update', handleSyncRemoteUpdate);
      sphere.off('message:dm', handleDmReceived);
      sphere.off('message:read', handleMessageRead);
      sphere.off('composing:started', handleComposingStarted);
      sphere.off('payment_request:incoming', handlePaymentRequestIncoming);
      sphere.off('storage:degraded', handleStorageDegraded);
    };
  }, [sphere, queryClient]);
}
