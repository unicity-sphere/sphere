/// <reference types="chrome" />

/**
 * Background message handler — routes POPUP_* and SPHERE_* messages.
 *
 * POPUP_* messages come from the popup window UI.
 * SPHERE_* messages come from web pages via content script (legacy window.sphere API).
 */

import { walletManager } from './wallet-manager';
import {
  initConnectHost,
  destroyConnectHost,
  getConnectApproval,
  resolveConnectApproval,
  getConnectIntent,
  resolveConnectIntent,
  getConnectedSites,
  revokeConnectedSite,
  setDmAutoApprove,
} from './connect-host';
import type { PermissionScope } from '@unicitylabs/sphere-sdk/connect';

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
}

/**
 * Handle POPUP_* messages from the popup window.
 */
export async function handlePopupMessage(
  message: Record<string, unknown>,
): Promise<unknown> {
  const type = message.type as string;

  try {
    switch (type) {
      // --- Wallet lifecycle ---

      case 'POPUP_GET_STATE':
        return { success: true, state: await walletManager.getState() };

      case 'POPUP_CREATE_WALLET': {
        const { password } = message as { password: string };
        const result = await walletManager.createWallet(password);
        initConnectHost();
        return { success: true, ...result, state: await walletManager.getState() };
      }

      case 'POPUP_IMPORT_WALLET': {
        const { mnemonic, password } = message as { mnemonic: string; password: string };
        const identity = await walletManager.importWallet(mnemonic, password);
        initConnectHost();
        return { success: true, identity, state: await walletManager.getState() };
      }

      case 'POPUP_UNLOCK_WALLET': {
        const { password } = message as { password: string };
        const identity = await walletManager.unlock(password);
        initConnectHost();
        return { success: true, identity, state: await walletManager.getState() };
      }

      case 'POPUP_LOCK_WALLET':
        await walletManager.lock();
        destroyConnectHost();
        return { success: true, state: await walletManager.getState() };

      case 'POPUP_RESET_WALLET':
        await walletManager.resetWallet();
        destroyConnectHost();
        return { success: true, state: await walletManager.getState() };

      // --- Identity ---

      case 'POPUP_GET_IDENTITY':
        return { success: true, identity: walletManager.getFullIdentity() };

      // --- Tokens & Balance ---

      case 'POPUP_GET_TOKENS':
        return { success: true, tokens: walletManager.getTokens() };

      case 'POPUP_GET_ASSETS': {
        const coinId = message.coinId as string | undefined;
        return { success: true, assets: await walletManager.getAssets(coinId) };
      }

      case 'POPUP_GET_TRANSACTION_HISTORY':
        return { success: true, history: walletManager.getTransactionHistory() };

      case 'POPUP_FINALIZE_TOKENS':
        return { success: true, ...(await walletManager.finalizeTokens()) };

      // --- Send ---

      case 'POPUP_SEND_TOKENS': {
        const { recipient, coinId, amount, memo } = message as {
          recipient: string; coinId: string; amount: string; memo?: string;
        };
        const result = await walletManager.sendTokens({ recipient, coinId, amount, memo });
        return { success: true, ...result };
      }

      // --- L1 ---

      case 'POPUP_GET_L1_BALANCE':
        return { success: true, balance: await walletManager.getL1Balance() };

      case 'POPUP_SEND_L1': {
        const { to, amount, useVested, feeRate } = message as {
          to: string; amount: string; useVested?: boolean; feeRate?: number;
        };
        return await walletManager.sendL1({ to, amount, useVested, feeRate });
      }

      case 'POPUP_GET_L1_TRANSACTIONS': {
        const limit = message.limit as number | undefined;
        return { success: true, transactions: await walletManager.getL1Transactions(limit) };
      }

      case 'POPUP_GET_L1_UTXOS':
        return { success: true, utxos: await walletManager.getL1Utxos() };

      case 'POPUP_ESTIMATE_L1_FEE': {
        const { to, amount, feeRate, useVested } = message as {
          to: string; amount: string; feeRate?: number; useVested?: boolean;
        };
        return { success: true, estimate: await walletManager.estimateL1Fee({ to, amount, feeRate, useVested }) };
      }

      // --- Communications ---

      case 'POPUP_SEND_DM': {
        const { recipient, content } = message as { recipient: string; content: string };
        const dm = await walletManager.sendDM(recipient, content);
        return { success: true, id: dm.id, timestamp: dm.timestamp };
      }

      case 'POPUP_SEND_PAYMENT_REQUEST': {
        const { recipient, amount, coinId, message: msg } = message as {
          recipient: string; amount: string; coinId: string; message?: string;
        };
        return await walletManager.sendPaymentRequest(recipient, { amount, coinId, message: msg });
      }

      // --- Nametag ---

      case 'POPUP_CHECK_NAMETAG_AVAILABLE': {
        const nametag = message.nametag as string;
        return { success: true, available: await walletManager.isNametagAvailable(nametag) };
      }

      case 'POPUP_REGISTER_NAMETAG': {
        const nametag = message.nametag as string;
        const result = await walletManager.registerNametag(nametag);
        return { success: true, result };
      }

      case 'POPUP_RESOLVE': {
        const identifier = message.identifier as string;
        const result = await walletManager.resolve(identifier);
        return { success: true, result };
      }

      case 'POPUP_RESOLVE_NAMETAG': {
        const nametag = message.nametag as string;
        const result = await walletManager.resolveNametag(nametag);
        return { success: true, result };
      }

      // --- Export ---

      case 'POPUP_EXPORT_WALLET':
        return { success: true, walletJson: walletManager.exportWallet() };

      case 'POPUP_GET_MNEMONIC':
        return { success: true, mnemonic: walletManager.getMnemonic() };

      // --- Address Discovery ---

      case 'POPUP_DISCOVER_ADDRESSES': {
        const result = await walletManager.discoverAddresses();
        return { success: true, result };
      }

      // --- Message Signing ---

      case 'POPUP_SIGN_MESSAGE': {
        const msg = message.message as string;
        const signature = walletManager.signMessage(msg);
        return { success: true, signature };
      }

      // --- Address Management ---

      case 'POPUP_GET_ACTIVE_ADDRESSES':
        return { success: true, addresses: walletManager.getActiveAddresses() };

      case 'POPUP_GET_ALL_ADDRESSES':
        return { success: true, addresses: walletManager.getAllTrackedAddresses() };

      case 'POPUP_GET_CURRENT_INDEX':
        return { success: true, index: walletManager.getCurrentAddressIndex() };

      case 'POPUP_SWITCH_ADDRESS': {
        const { index, nametag } = message as { index: number; nametag?: string };
        await walletManager.switchToAddress(index, nametag ? { nametag } : undefined);
        return { success: true };
      }

      case 'POPUP_DERIVE_ADDRESS': {
        const { index } = message as { index: number };
        const address = walletManager.deriveAddress(index);
        return { success: true, address };
      }

      case 'POPUP_SET_ADDRESS_HIDDEN': {
        const { index, hidden } = message as { index: number; hidden: boolean };
        await walletManager.setAddressHidden(index, hidden);
        return { success: true };
      }

      case 'POPUP_GET_WALLET_INFO':
        return { success: true, info: walletManager.getWalletInfo() };

      // --- Payments (Extended) ---

      case 'POPUP_GET_BALANCE':
        return { success: true, balance: walletManager.getPaymentsBalance() };

      case 'POPUP_GET_FIAT_BALANCE':
        return { success: true, fiatBalance: await walletManager.getFiatBalance() };

      case 'POPUP_SYNC': {
        const syncResult = await walletManager.syncPayments();
        return { success: true, ...syncResult };
      }

      // --- L1 (Extended) ---

      case 'POPUP_L1_RESOLVE_ADDRESS': {
        const destination = message.destination as string;
        const address = await walletManager.l1ResolveAddress(destination);
        return { success: true, address };
      }

      // --- Communications (Extended) ---

      case 'POPUP_GET_CONVERSATIONS': {
        const conversations = walletManager.getConversations();
        // Serialize Map to plain object for chrome.runtime.sendMessage
        const serialized: Record<string, unknown> = {};
        if (conversations instanceof Map) {
          for (const [key, value] of conversations) {
            serialized[key] = value;
          }
        }
        return { success: true, conversations: conversations instanceof Map ? serialized : conversations };
      }

      case 'POPUP_GET_CONVERSATION': {
        const { peerPubkey } = message as { peerPubkey: string };
        const messages = walletManager.getConversation(peerPubkey);
        return { success: true, messages };
      }

      case 'POPUP_GET_CONVERSATION_PAGE': {
        const { peerPubkey, limit: pgLimit } = message as { peerPubkey: string; limit?: number };
        const page = walletManager.getConversationPage(peerPubkey, pgLimit ? { limit: pgLimit } : undefined);
        return { success: true, page };
      }

      case 'POPUP_GET_UNREAD_COUNT': {
        const pk = message.peerPubkey as string | undefined;
        const count = walletManager.getUnreadCount(pk);
        return { success: true, count };
      }

      case 'POPUP_MARK_AS_READ': {
        const { messageIds } = message as { messageIds: string[] };
        await walletManager.markAsRead(messageIds);
        return { success: true };
      }

      case 'POPUP_SEND_COMPOSING': {
        const { recipient: compRecipient } = message as { recipient: string };
        await walletManager.sendComposingIndicator(compRecipient);
        return { success: true };
      }

      case 'POPUP_DELETE_CONVERSATION': {
        const { peerPubkey } = message as { peerPubkey: string };
        await walletManager.deleteConversation(peerPubkey);
        return { success: true };
      }

      case 'POPUP_RESOLVE_PEER_NAMETAG': {
        const { pubkey } = message as { pubkey: string };
        const nametag = await walletManager.resolvePeerNametag(pubkey);
        return { success: true, nametag };
      }

      case 'POPUP_SEND_PAYMENT_REQUEST_RESPONSE': {
        const { senderPubkey, requestId, responseType } = message as {
          senderPubkey: string; requestId: string; responseType: string;
        };
        await walletManager.sendPaymentRequestResponse(senderPubkey, { requestId, responseType });
        return { success: true };
      }

      // --- Group Chat ---

      case 'POPUP_GC_CONNECT':
        await walletManager.gcConnect();
        return { success: true };

      case 'POPUP_GC_LOAD':
        await walletManager.gcLoad();
        return { success: true };

      case 'POPUP_GC_GET_STATUS':
        return { success: true, connected: walletManager.gcGetConnectionStatus() };

      case 'POPUP_GC_GET_GROUPS':
        return { success: true, groups: walletManager.gcGetGroups() };

      case 'POPUP_GC_GET_GROUP': {
        const { groupId } = message as { groupId: string };
        return { success: true, group: walletManager.gcGetGroup(groupId) };
      }

      case 'POPUP_GC_FETCH_AVAILABLE':
        return { success: true, groups: await walletManager.gcFetchAvailableGroups() };

      case 'POPUP_GC_JOIN': {
        const { groupId, inviteCode } = message as { groupId: string; inviteCode?: string };
        const joined = await walletManager.gcJoinGroup(groupId, inviteCode);
        return { success: true, joined };
      }

      case 'POPUP_GC_LEAVE': {
        const { groupId } = message as { groupId: string };
        const left = await walletManager.gcLeaveGroup(groupId);
        return { success: true, left };
      }

      case 'POPUP_GC_CREATE': {
        const { options } = message as { options: unknown };
        const group = await walletManager.gcCreateGroup(options);
        return { success: true, group };
      }

      case 'POPUP_GC_DELETE_GROUP': {
        const { groupId } = message as { groupId: string };
        const deleted = await walletManager.gcDeleteGroup(groupId);
        return { success: true, deleted };
      }

      case 'POPUP_GC_CREATE_INVITE': {
        const { groupId } = message as { groupId: string };
        const inviteCode = await walletManager.gcCreateInvite(groupId);
        return { success: true, inviteCode };
      }

      case 'POPUP_GC_SEND_MESSAGE': {
        const { groupId, content: gcContent, replyToId } = message as {
          groupId: string; content: string; replyToId?: string;
        };
        const gcMsg = await walletManager.gcSendMessage(groupId, gcContent, replyToId);
        return { success: true, message: gcMsg };
      }

      case 'POPUP_GC_GET_MESSAGES': {
        const { groupId } = message as { groupId: string };
        return { success: true, messages: walletManager.gcGetMessages(groupId) };
      }

      case 'POPUP_GC_GET_MESSAGES_PAGE': {
        const { groupId, limit: gcLimit, until } = message as {
          groupId: string; limit?: number; until?: number;
        };
        const gcPage = walletManager.gcGetMessagesPage(groupId, { limit: gcLimit, until });
        return { success: true, page: gcPage };
      }

      case 'POPUP_GC_FETCH_MESSAGES': {
        const { groupId, since, limit: fetchLimit } = message as {
          groupId: string; since?: number; limit?: number;
        };
        const fetched = await walletManager.gcFetchMessages(groupId, since, fetchLimit);
        return { success: true, messages: fetched };
      }

      case 'POPUP_GC_DELETE_MESSAGE': {
        const { groupId, messageId } = message as { groupId: string; messageId: string };
        const msgDeleted = await walletManager.gcDeleteMessage(groupId, messageId);
        return { success: true, deleted: msgDeleted };
      }

      case 'POPUP_GC_GET_MEMBERS': {
        const { groupId } = message as { groupId: string };
        return { success: true, members: walletManager.gcGetMembers(groupId) };
      }

      case 'POPUP_GC_GET_MEMBER': {
        const { groupId, pubkey } = message as { groupId: string; pubkey: string };
        return { success: true, member: walletManager.gcGetMember(groupId, pubkey) };
      }

      case 'POPUP_GC_KICK_USER': {
        const { groupId, userPubkey, reason } = message as {
          groupId: string; userPubkey: string; reason?: string;
        };
        const kicked = await walletManager.gcKickUser(groupId, userPubkey, reason);
        return { success: true, kicked };
      }

      case 'POPUP_GC_GET_UNREAD_COUNT':
        return { success: true, count: walletManager.gcGetTotalUnreadCount() };

      case 'POPUP_GC_MARK_READ': {
        const { groupId } = message as { groupId: string };
        walletManager.gcMarkGroupAsRead(groupId);
        return { success: true };
      }

      case 'POPUP_GC_IS_ADMIN': {
        const { groupId } = message as { groupId: string };
        return { success: true, isAdmin: walletManager.gcIsCurrentUserAdmin(groupId) };
      }

      case 'POPUP_GC_IS_MODERATOR': {
        const { groupId } = message as { groupId: string };
        return { success: true, isModerator: walletManager.gcIsCurrentUserModerator(groupId) };
      }

      case 'POPUP_GC_IS_RELAY_ADMIN':
        return { success: true, isRelayAdmin: await walletManager.gcIsCurrentUserRelayAdmin() };

      case 'POPUP_GC_CAN_WRITE': {
        const { groupId } = message as { groupId: string };
        return { success: true, canWrite: walletManager.gcCanWriteToGroup(groupId) };
      }

      case 'POPUP_GC_CAN_MODERATE': {
        const { groupId } = message as { groupId: string };
        return { success: true, canModerate: await walletManager.gcCanModerateGroup(groupId) };
      }

      case 'POPUP_GC_GET_USER_ROLE': {
        const { groupId } = message as { groupId: string };
        return { success: true, role: walletManager.gcGetCurrentUserRole(groupId) };
      }

      case 'POPUP_GC_GET_MY_PUBKEY':
        return { success: true, pubkey: walletManager.gcGetMyPublicKey() };

      case 'POPUP_GC_GET_RELAY_URLS':
        return { success: true, urls: walletManager.gcGetRelayUrls() };

      // --- Generic Proxy Call (ES Proxy from popup) ---

      case 'SPHERE_PROXY_CALL': {
        const { path, args } = message as { path: string[]; args: unknown[] };
        const result = await walletManager.proxyCall(path, args ?? []);
        return { success: true, result };
      }

      // --- Connect Protocol ---

      case 'POPUP_GET_CONNECT_APPROVAL':
        return { success: true, approval: getConnectApproval() };

      case 'POPUP_RESOLVE_CONNECT_APPROVAL': {
        const { id, approved, grantedPermissions } = message as {
          id: string; approved: boolean; grantedPermissions: string[];
        };
        const ok = resolveConnectApproval(id, approved, grantedPermissions as PermissionScope[]);
        return { success: ok };
      }

      case 'POPUP_GET_CONNECT_INTENT':
        return { success: true, intent: getConnectIntent() };

      case 'POPUP_RESOLVE_CONNECT_INTENT': {
        const { id, result } = message as {
          id: string;
          result: { result?: unknown; error?: { code: number; message: string } };
        };
        const ok = resolveConnectIntent(id, result);
        return { success: ok };
      }

      case 'POPUP_GET_CONNECTED_SITES':
        return { success: true, sites: await getConnectedSites() };

      case 'POPUP_REVOKE_CONNECTED_SITE': {
        const { origin } = message as { origin: string };
        await revokeConnectedSite(origin);
        return { success: true };
      }

      case 'POPUP_SET_DM_AUTO_APPROVE':
        setDmAutoApprove();
        return { success: true };

      default:
        return { success: false, error: `Unknown popup message type: ${type}` };
    }
  } catch (error) {
    console.error('[MessageHandler] Error handling', type, ':', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * Handle SPHERE_* messages from content scripts (legacy window.sphere API).
 */
export async function handleContentMessage(
  message: Record<string, unknown>,
): Promise<unknown> {
  const type = message.type as string;

  // For legacy API, most operations require wallet to be unlocked
  if (!walletManager.isUnlocked()) {
    return { type: `${type}_RESPONSE`, success: false, error: 'Wallet is locked' };
  }

  try {
    switch (type) {
      case 'SPHERE_CONNECT':
        return { type: 'SPHERE_CONNECT_RESPONSE', success: true, identity: walletManager.getFullIdentity() };

      case 'SPHERE_DISCONNECT':
        return { type: 'SPHERE_DISCONNECT_RESPONSE', success: true };

      case 'SPHERE_GET_ACTIVE_IDENTITY':
        return { type: 'SPHERE_GET_ACTIVE_IDENTITY_RESPONSE', success: true, identity: walletManager.getFullIdentity() };

      case 'SPHERE_GET_BALANCES':
        return { type: 'SPHERE_GET_BALANCES_RESPONSE', success: true, tokens: walletManager.getTokens() };

      case 'SPHERE_RESOLVE_NAMETAG': {
        const nametag = message.nametag as string;
        const result = await walletManager.resolveNametag(nametag);
        return { type: 'SPHERE_RESOLVE_NAMETAG_RESPONSE', success: true, resolution: result };
      }

      case 'SPHERE_CHECK_NAMETAG_AVAILABLE': {
        const nametag = message.nametag as string;
        const available = await walletManager.isNametagAvailable(nametag);
        return { type: 'SPHERE_CHECK_NAMETAG_AVAILABLE_RESPONSE', success: true, available };
      }

      case 'SPHERE_GET_MY_NAMETAG': {
        const identity = walletManager.getFullIdentity();
        return { type: 'SPHERE_GET_MY_NAMETAG_RESPONSE', success: true, nametag: identity?.nametag };
      }

      default:
        return { type: `${type}_RESPONSE`, success: false, error: `Unknown message type: ${type}` };
    }
  } catch (error) {
    return { type: `${type}_RESPONSE`, success: false, error: getErrorMessage(error) };
  }
}
