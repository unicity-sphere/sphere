/**
 * IGroupChatAdapter — platform-independent interface for NIP-29 group chat.
 *
 * Implementations:
 * - DirectGroupChatAdapter (web) — wraps GroupChatModule
 * - ExtGroupChatAdapter (extension) — sends POPUP_GC_* messages
 */

import type {
  GroupData,
  GroupMessageData,
  GroupMemberData,
  GroupRole,
  CreateGroupOptions,
} from '@unicitylabs/sphere-sdk';

/** Mirrored from SDK (not exported) */
interface GroupMessagesPage {
  messages: GroupMessageData[];
  hasMore: boolean;
}

/** Mirrored from SDK (not exported) */
interface GetGroupMessagesPageOptions {
  limit?: number;
  until?: number;
}

export interface IGroupChatAdapter {
  // Lifecycle
  connect(): Promise<void>;
  load(): Promise<void>;
  getConnectionStatus(): Promise<boolean>;

  // Groups
  getGroups(): Promise<GroupData[]>;
  getGroup(groupId: string): Promise<GroupData | null>;
  fetchAvailableGroups(): Promise<GroupData[]>;
  joinGroup(groupId: string, inviteCode?: string): Promise<boolean>;
  leaveGroup(groupId: string): Promise<boolean>;
  createGroup(options: CreateGroupOptions): Promise<GroupData | null>;
  deleteGroup(groupId: string): Promise<boolean>;
  createInvite(groupId: string): Promise<string | null>;

  // Messages
  sendMessage(groupId: string, content: string, replyToId?: string): Promise<GroupMessageData | null>;
  getMessages(groupId: string): Promise<GroupMessageData[]>;
  getMessagesPage(groupId: string, options?: GetGroupMessagesPageOptions): Promise<GroupMessagesPage>;
  fetchMessages(groupId: string, since?: number, limit?: number): Promise<GroupMessageData[]>;
  deleteMessage(groupId: string, messageId: string): Promise<boolean>;

  // Members
  getMembers(groupId: string): Promise<GroupMemberData[]>;
  getMember(groupId: string, pubkey: string): Promise<GroupMemberData | null>;
  kickUser(groupId: string, userPubkey: string, reason?: string): Promise<boolean>;

  // Unread
  getTotalUnreadCount(): Promise<number>;
  markGroupAsRead(groupId: string): Promise<void>;

  // Permissions
  isCurrentUserAdmin(groupId: string): Promise<boolean>;
  isCurrentUserModerator(groupId: string): Promise<boolean>;
  isCurrentUserRelayAdmin(): Promise<boolean>;
  canWriteToGroup(groupId: string): Promise<boolean>;
  canModerateGroup(groupId: string): Promise<boolean>;
  getCurrentUserRole(groupId: string): Promise<GroupRole | null>;

  // Info
  getMyPublicKey(): Promise<string | null>;
  getRelayUrls(): Promise<string[]>;
}
