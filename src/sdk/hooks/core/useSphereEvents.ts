import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSphereContext } from './useSphere';
import { SPHERE_KEYS } from '../../queryKeys';
import { formatAmount } from '../../index';
import { showTransferToast } from '../../../components/ui/toast-utils';
import { CHAT_KEYS, GROUP_CHAT_KEYS, type DmReceivedDetail } from '../../../components/chat/data/chatTypes';
import type { IncomingTransfer } from '@unicitylabs/sphere-sdk';

// SDK DM shape (local mirror — SDK DTS not always available)
interface SDKDirectMessage {
  id: string;
  senderPubkey: string;
  recipientPubkey: string;
}

export function useSphereEvents(): void {
  const { adapter } = useSphereContext();
  const queryClient = useQueryClient();
  const invalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track seen transfer IDs to prevent duplicate toasts from Nostr re-deliveries
  const seenTransferIdsRef = useRef<Set<string>>(new Set());

  // When adapter instance changes (new wallet, delete, import) —
  // immediately sync identity cache so the UI never shows stale data
  // from the previous wallet.
  useEffect(() => {
    if (!adapter) return;
    if (adapter.identity) {
      queryClient.setQueryData(SPHERE_KEYS.identity.current, { ...adapter.identity });
    } else {
      queryClient.removeQueries({ queryKey: SPHERE_KEYS.identity.all });
    }
  }, [adapter, queryClient]);

  useEffect(() => {
    if (!adapter) return;

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

    // Write adapter.identity directly into the query cache — by the time SDK
    // fires these events, its internal state is already updated.  Plain
    // invalidation can race with the SDK update, returning stale data.
    const refreshIdentityCache = () => {
      if (adapter.identity) {
        queryClient.setQueryData(SPHERE_KEYS.identity.current, { ...adapter.identity });
      }
    };

    const handleNametagChange = () => {
      refreshIdentityCache();
      queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.identity.all });
    };

    const handleIdentityChange = () => {
      refreshIdentityCache();
      queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.identity.all });
      queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.payments.all });
      queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.l1.all });
      // Remove (not invalidate) chat caches — address-scoped queries will
      // refetch with fresh data.  Invalidation alone can race with the
      // address switch and display stale data from the previous address.
      queryClient.removeQueries({ queryKey: CHAT_KEYS.all });
      queryClient.removeQueries({ queryKey: GROUP_CHAT_KEYS.all });
    };

    const handleSyncCompleted = invalidatePayments;

    const handleSyncRemoteUpdate = invalidatePayments;

    // Bridge incoming SDK DMs to lightweight custom event + query invalidation
    const handleDmReceived = (dm: SDKDirectMessage) => {
      const myPubkey = adapter.identity?.chainPubkey;

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

    adapter.on('transfer:incoming', handleIncomingTransfer as (data?: unknown) => void);
    adapter.on('transfer:confirmed', handleTransferConfirmed);
    adapter.on('history:updated', handleHistoryUpdated);
    adapter.on('nametag:registered', handleNametagChange);
    adapter.on('nametag:recovered', handleNametagChange);
    adapter.on('identity:changed', handleIdentityChange);
    adapter.on('sync:completed', handleSyncCompleted);
    adapter.on('sync:remote-update', handleSyncRemoteUpdate);
    adapter.on('message:dm', handleDmReceived as (data?: unknown) => void);
    adapter.on('message:read', handleMessageRead);
    adapter.on('composing:started', handleComposingStarted as (data?: unknown) => void);
    adapter.on('payment_request:incoming', handlePaymentRequestIncoming);

    return () => {
      if (invalidateTimerRef.current) {
        clearTimeout(invalidateTimerRef.current);
        invalidateTimerRef.current = null;
      }
      adapter.off('transfer:incoming', handleIncomingTransfer as (data?: unknown) => void);
      adapter.off('transfer:confirmed', handleTransferConfirmed);
      adapter.off('history:updated', handleHistoryUpdated);
      adapter.off('nametag:registered', handleNametagChange);
      adapter.off('nametag:recovered', handleNametagChange);
      adapter.off('identity:changed', handleIdentityChange);
      adapter.off('sync:completed', handleSyncCompleted);
      adapter.off('sync:remote-update', handleSyncRemoteUpdate);
      adapter.off('message:dm', handleDmReceived as (data?: unknown) => void);
      adapter.off('message:read', handleMessageRead);
      adapter.off('composing:started', handleComposingStarted as (data?: unknown) => void);
      adapter.off('payment_request:incoming', handlePaymentRequestIncoming);
    };
  }, [adapter, queryClient]);
}
