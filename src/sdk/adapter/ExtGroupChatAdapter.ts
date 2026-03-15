/// <reference types="chrome" />

/**
 * ExtGroupChatAdapter — IGroupChatAdapter for Chrome extension mode.
 *
 * All group chat operations are routed to the background service worker
 * via chrome.runtime.sendMessage({ type: 'POPUP_GC_*' }).
 */

import type { IGroupChatAdapter } from './group-chat-types';

/** Send a message to the background worker */
async function sendBg<T = unknown>(message: Record<string, unknown>): Promise<T> {
  const response = await chrome.runtime.sendMessage(message);
  if (response && typeof response === 'object' && 'error' in response && !response.success) {
    throw new Error(response.error as string);
  }
  return response as T;
}

export class ExtGroupChatAdapter implements IGroupChatAdapter {
  // Lifecycle
  async connect() {
    await sendBg({ type: 'POPUP_GC_CONNECT' });
  }

  async load() {
    await sendBg({ type: 'POPUP_GC_LOAD' });
  }

  async getConnectionStatus() {
    const r = await sendBg<{ success: boolean; connected: boolean }>({
      type: 'POPUP_GC_GET_STATUS',
    });
    return r.connected;
  }

  // Groups
  async getGroups() {
    const r = await sendBg<{ success: boolean; groups: unknown[] }>({
      type: 'POPUP_GC_GET_GROUPS',
    });
    return r.groups as Awaited<ReturnType<IGroupChatAdapter['getGroups']>>;
  }

  async getGroup(groupId: string) {
    const r = await sendBg<{ success: boolean; group: unknown }>({
      type: 'POPUP_GC_GET_GROUP',
      groupId,
    });
    return r.group as Awaited<ReturnType<IGroupChatAdapter['getGroup']>>;
  }

  async fetchAvailableGroups() {
    const r = await sendBg<{ success: boolean; groups: unknown[] }>({
      type: 'POPUP_GC_FETCH_AVAILABLE',
    });
    return r.groups as Awaited<ReturnType<IGroupChatAdapter['fetchAvailableGroups']>>;
  }

  async joinGroup(groupId: string, inviteCode?: string) {
    const r = await sendBg<{ success: boolean; joined: boolean }>({
      type: 'POPUP_GC_JOIN',
      groupId,
      ...(inviteCode && { inviteCode }),
    });
    return r.joined;
  }

  async leaveGroup(groupId: string) {
    const r = await sendBg<{ success: boolean; left: boolean }>({
      type: 'POPUP_GC_LEAVE',
      groupId,
    });
    return r.left;
  }

  async createGroup(options: import('@unicitylabs/sphere-sdk').CreateGroupOptions) {
    const r = await sendBg<{ success: boolean; group: unknown }>({
      type: 'POPUP_GC_CREATE',
      options,
    });
    return r.group as Awaited<ReturnType<IGroupChatAdapter['createGroup']>>;
  }

  async deleteGroup(groupId: string) {
    const r = await sendBg<{ success: boolean; deleted: boolean }>({
      type: 'POPUP_GC_DELETE_GROUP',
      groupId,
    });
    return r.deleted;
  }

  async createInvite(groupId: string) {
    const r = await sendBg<{ success: boolean; inviteCode: string | null }>({
      type: 'POPUP_GC_CREATE_INVITE',
      groupId,
    });
    return r.inviteCode;
  }

  // Messages
  async sendMessage(groupId: string, content: string, replyToId?: string) {
    const r = await sendBg<{ success: boolean; message: unknown }>({
      type: 'POPUP_GC_SEND_MESSAGE',
      groupId,
      content,
      ...(replyToId && { replyToId }),
    });
    return r.message as Awaited<ReturnType<IGroupChatAdapter['sendMessage']>>;
  }

  async getMessages(groupId: string) {
    const r = await sendBg<{ success: boolean; messages: unknown[] }>({
      type: 'POPUP_GC_GET_MESSAGES',
      groupId,
    });
    return r.messages as Awaited<ReturnType<IGroupChatAdapter['getMessages']>>;
  }

  async getMessagesPage(
    groupId: string,
    options?: { limit?: number; until?: number },
  ) {
    const r = await sendBg<{ success: boolean; page: unknown }>({
      type: 'POPUP_GC_GET_MESSAGES_PAGE',
      groupId,
      ...(options && { limit: options.limit, until: options.until }),
    });
    return r.page as Awaited<ReturnType<IGroupChatAdapter['getMessagesPage']>>;
  }

  async fetchMessages(groupId: string, since?: number, limit?: number) {
    const r = await sendBg<{ success: boolean; messages: unknown[] }>({
      type: 'POPUP_GC_FETCH_MESSAGES',
      groupId,
      ...(since !== undefined && { since }),
      ...(limit !== undefined && { limit }),
    });
    return r.messages as Awaited<ReturnType<IGroupChatAdapter['fetchMessages']>>;
  }

  async deleteMessage(groupId: string, messageId: string) {
    const r = await sendBg<{ success: boolean; deleted: boolean }>({
      type: 'POPUP_GC_DELETE_MESSAGE',
      groupId,
      messageId,
    });
    return r.deleted;
  }

  // Members
  async getMembers(groupId: string) {
    const r = await sendBg<{ success: boolean; members: unknown[] }>({
      type: 'POPUP_GC_GET_MEMBERS',
      groupId,
    });
    return r.members as Awaited<ReturnType<IGroupChatAdapter['getMembers']>>;
  }

  async getMember(groupId: string, pubkey: string) {
    const r = await sendBg<{ success: boolean; member: unknown }>({
      type: 'POPUP_GC_GET_MEMBER',
      groupId,
      pubkey,
    });
    return r.member as Awaited<ReturnType<IGroupChatAdapter['getMember']>>;
  }

  async kickUser(groupId: string, userPubkey: string, reason?: string) {
    const r = await sendBg<{ success: boolean; kicked: boolean }>({
      type: 'POPUP_GC_KICK_USER',
      groupId,
      userPubkey,
      ...(reason && { reason }),
    });
    return r.kicked;
  }

  // Unread
  async getTotalUnreadCount() {
    const r = await sendBg<{ success: boolean; count: number }>({
      type: 'POPUP_GC_GET_UNREAD_COUNT',
    });
    return r.count;
  }

  async markGroupAsRead(groupId: string) {
    await sendBg({ type: 'POPUP_GC_MARK_READ', groupId });
  }

  // Permissions
  async isCurrentUserAdmin(groupId: string) {
    const r = await sendBg<{ success: boolean; isAdmin: boolean }>({
      type: 'POPUP_GC_IS_ADMIN',
      groupId,
    });
    return r.isAdmin;
  }

  async isCurrentUserModerator(groupId: string) {
    const r = await sendBg<{ success: boolean; isModerator: boolean }>({
      type: 'POPUP_GC_IS_MODERATOR',
      groupId,
    });
    return r.isModerator;
  }

  async isCurrentUserRelayAdmin() {
    const r = await sendBg<{ success: boolean; isRelayAdmin: boolean }>({
      type: 'POPUP_GC_IS_RELAY_ADMIN',
    });
    return r.isRelayAdmin;
  }

  async canWriteToGroup(groupId: string) {
    const r = await sendBg<{ success: boolean; canWrite: boolean }>({
      type: 'POPUP_GC_CAN_WRITE',
      groupId,
    });
    return r.canWrite;
  }

  async canModerateGroup(groupId: string) {
    const r = await sendBg<{ success: boolean; canModerate: boolean }>({
      type: 'POPUP_GC_CAN_MODERATE',
      groupId,
    });
    return r.canModerate;
  }

  async getCurrentUserRole(groupId: string) {
    const r = await sendBg<{ success: boolean; role: string | null }>({
      type: 'POPUP_GC_GET_USER_ROLE',
      groupId,
    });
    return r.role as Awaited<ReturnType<IGroupChatAdapter['getCurrentUserRole']>>;
  }

  // Info
  async getMyPublicKey() {
    const r = await sendBg<{ success: boolean; pubkey: string | null }>({
      type: 'POPUP_GC_GET_MY_PUBKEY',
    });
    return r.pubkey;
  }

  async getRelayUrls() {
    const r = await sendBg<{ success: boolean; urls: string[] }>({
      type: 'POPUP_GC_GET_RELAY_URLS',
    });
    return r.urls;
  }
}
