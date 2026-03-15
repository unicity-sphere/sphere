/**
 * DirectGroupChatAdapter — IGroupChatAdapter for web mode.
 *
 * Wraps a real GroupChatModule instance. Sync methods are wrapped
 * in Promise.resolve() to satisfy the async interface contract.
 */

import type { GroupChatModule } from '@unicitylabs/sphere-sdk';
import type { IGroupChatAdapter } from './group-chat-types';

export class DirectGroupChatAdapter implements IGroupChatAdapter {
  private gc: GroupChatModule;
  constructor(gc: GroupChatModule) {
    this.gc = gc;
  }

  // Lifecycle
  async connect() {
    return this.gc.connect();
  }

  async load() {
    return this.gc.load();
  }

  async getConnectionStatus() {
    return this.gc.getConnectionStatus();
  }

  // Groups
  async getGroups() {
    return this.gc.getGroups();
  }

  async getGroup(groupId: string) {
    return this.gc.getGroup(groupId);
  }

  async fetchAvailableGroups() {
    return this.gc.fetchAvailableGroups();
  }

  async joinGroup(groupId: string, inviteCode?: string) {
    return this.gc.joinGroup(groupId, inviteCode);
  }

  async leaveGroup(groupId: string) {
    return this.gc.leaveGroup(groupId);
  }

  async createGroup(options: import('@unicitylabs/sphere-sdk').CreateGroupOptions) {
    return this.gc.createGroup(options);
  }

  async deleteGroup(groupId: string) {
    return this.gc.deleteGroup(groupId);
  }

  async createInvite(groupId: string) {
    return this.gc.createInvite(groupId);
  }

  // Messages
  async sendMessage(groupId: string, content: string, replyToId?: string) {
    return this.gc.sendMessage(groupId, content, replyToId);
  }

  async getMessages(groupId: string) {
    return this.gc.getMessages(groupId);
  }

  async getMessagesPage(
    groupId: string,
    options?: { limit?: number; until?: number },
  ) {
    return this.gc.getMessagesPage(groupId, options);
  }

  async fetchMessages(groupId: string, since?: number, limit?: number) {
    return this.gc.fetchMessages(groupId, since, limit);
  }

  async deleteMessage(groupId: string, messageId: string) {
    return this.gc.deleteMessage(groupId, messageId);
  }

  // Members
  async getMembers(groupId: string) {
    return this.gc.getMembers(groupId);
  }

  async getMember(groupId: string, pubkey: string) {
    return this.gc.getMember(groupId, pubkey);
  }

  async kickUser(groupId: string, userPubkey: string, reason?: string) {
    return this.gc.kickUser(groupId, userPubkey, reason);
  }

  // Unread
  async getTotalUnreadCount() {
    return this.gc.getTotalUnreadCount();
  }

  async markGroupAsRead(groupId: string) {
    return this.gc.markGroupAsRead(groupId);
  }

  // Permissions
  async isCurrentUserAdmin(groupId: string) {
    return this.gc.isCurrentUserAdmin(groupId);
  }

  async isCurrentUserModerator(groupId: string) {
    return this.gc.isCurrentUserModerator(groupId);
  }

  async isCurrentUserRelayAdmin() {
    return this.gc.isCurrentUserRelayAdmin();
  }

  async canWriteToGroup(groupId: string) {
    return this.gc.canWriteToGroup(groupId);
  }

  async canModerateGroup(groupId: string) {
    return this.gc.canModerateGroup(groupId);
  }

  async getCurrentUserRole(groupId: string) {
    return this.gc.getCurrentUserRole(groupId);
  }

  // Info
  async getMyPublicKey() {
    return this.gc.getMyPublicKey();
  }

  async getRelayUrls() {
    return this.gc.getRelayUrls();
  }
}
