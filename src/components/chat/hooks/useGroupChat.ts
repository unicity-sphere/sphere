import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import type { GroupData, GroupMessageData, GroupMemberData, CreateGroupOptions } from '@unicitylabs/sphere-sdk';
import { GroupVisibility } from '@unicitylabs/sphere-sdk';
import { useServices } from '../../../contexts/useServices';
import { useSphereContext } from '../../../sdk/hooks/core/useSphere';
import { useIdentity } from '../../../sdk/hooks/core/useIdentity';
import { useActiveTabId } from '../../../hooks/useDesktopState';
import { STORAGE_KEYS } from '../../../config/storageKeys';
import { getGroupDisplayName, isPinnedGroup } from '../utils/groupChatHelpers';
import { buildAddressId } from '../data/chatTypes';

export const groupChatKeys = (addressId: string) => ({
  all: ['groupChat', addressId] as const,
  groups: ['groupChat', 'groups', addressId] as const,
  messages: (groupId: string) => ['groupChat', 'messages', addressId, groupId] as const,
  members: (groupId: string) => ['groupChat', 'members', addressId, groupId] as const,
  available: ['groupChat', 'available', addressId] as const,
  unreadCount: ['groupChat', 'unreadCount', addressId] as const,
  relayAdmin: ['groupChat', 'relayAdmin', addressId] as const,
});

export interface UseGroupChatReturn {
  // Groups
  groups: GroupData[];
  isLoadingGroups: boolean;
  selectedGroup: GroupData | null;
  selectGroup: (group: GroupData | null) => Promise<void>;
  joinGroup: (groupId: string, inviteCode?: string) => Promise<boolean>;
  leaveGroup: (groupId: string) => Promise<boolean>;

  // Discovery
  availableGroups: GroupData[];
  isLoadingAvailable: boolean;
  refreshAvailableGroups: () => void;

  // Messages
  messages: GroupMessageData[];
  isLoadingMessages: boolean;
  sendMessage: (content: string, replyToId?: string) => Promise<boolean>;
  isSending: boolean;

  // Lazy loading
  hasMore: boolean;
  loadMore: () => void;

  // Members
  members: GroupMemberData[];
  isLoadingMembers: boolean;

  // Input state
  messageInput: string;
  setMessageInput: (value: string) => void;

  // Unread
  totalUnreadCount: number;
  markAsRead: (groupId: string) => void;

  // Search/Filter
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredGroups: GroupData[];

  // Connection
  isConnected: boolean;

  // Moderation
  isCurrentUserAdmin: boolean;
  isCurrentUserModerator: boolean;
  canModerateSelectedGroup: boolean;
  deleteMessage: (messageId: string) => Promise<boolean>;
  kickUser: (userPubkey: string, reason?: string) => Promise<boolean>;
  isDeleting: boolean;
  isKicking: boolean;

  // Nametag resolution

  // Admin actions (relay admin only)
  isRelayAdmin: boolean;
  createGroup: (options: CreateGroupOptions) => Promise<GroupData | null>;
  deleteGroup: (groupId: string) => Promise<boolean>;
  createInvite: (groupId: string) => Promise<string | null>;
  isCreatingGroup: boolean;
  isDeletingGroup: boolean;
  isCreatingInvite: boolean;

  // Write permission
  canWriteToSelectedGroup: boolean;

  // Identity
  myPubkey: string | null;
  isAdminOfGroup: (groupId: string) => boolean;
}

export const useGroupChat = (): UseGroupChatReturn => {
  const queryClient = useQueryClient();
  const { groupChat, isGroupChatConnected } = useServices();
  const { adapter } = useSphereContext();
  const { directAddress } = useIdentity();
  const activeTabId = useActiveTabId();
  const addressId = directAddress ? buildAddressId(directAddress) : 'default';
  const KEYS = useMemo(() => groupChatKeys(addressId), [addressId]);
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageLimit, setMessageLimit] = useState(20);
  // Address-scoped selected group key
  const selectedGroupKey = `${STORAGE_KEYS.CHAT_SELECTED_GROUP}_${addressId}`;

  // Reset local state when address changes (address switch)
  const prevAddressIdRef = useRef(addressId);
  useEffect(() => {
    if (prevAddressIdRef.current !== addressId) {
      prevAddressIdRef.current = addressId;
      setSelectedGroup(null);
      setSearchQuery('');
      setMessageLimit(20);
    }
  }, [addressId]);

  // Refs to avoid event subscription churn on state changes
  const selectedGroupRef = useRef(selectedGroup);
  selectedGroupRef.current = selectedGroup;
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;

  // Listen for SDK group chat events (stable — no selectedGroup dependency)
  useEffect(() => {
    if (!adapter) return;

    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: KEYS.groups });
      const current = selectedGroupRef.current;
      if (current) {
        queryClient.invalidateQueries({
          queryKey: KEYS.messages(current.id),
        });
      }
      queryClient.invalidateQueries({ queryKey: KEYS.unreadCount });
    };

    const handleMessage = (data?: unknown) => {
      const message = data as GroupMessageData;
      const current = selectedGroupRef.current;
      // If we're viewing this group, refetch messages and members
      if (current && message.groupId === current.id) {
        queryClient.invalidateQueries({
          queryKey: KEYS.messages(current.id),
        });
        queryClient.invalidateQueries({
          queryKey: KEYS.members(current.id),
        });
        // Auto-mark as read only if the group-chat tab is in focus
        if (activeTabIdRef.current === 'group-chat') {
          groupChat?.markGroupAsRead(current.id);
        }
      }
      // Always refetch groups for updated last message
      queryClient.invalidateQueries({ queryKey: KEYS.groups });
      queryClient.invalidateQueries({ queryKey: KEYS.unreadCount });
    };

    const handleKicked = (data?: unknown) => {
      const { groupId } = data as { groupId: string };
      if (selectedGroupRef.current?.id === groupId) {
        setSelectedGroup(null);
      }
    };

    const handleGroupDeleted = (data?: unknown) => {
      const { groupId } = data as { groupId: string };
      if (selectedGroupRef.current?.id === groupId) {
        setSelectedGroup(null);
      }
    };

    adapter.on('groupchat:updated', handleUpdate);
    adapter.on('groupchat:message', handleMessage);
    adapter.on('groupchat:kicked', handleKicked);
    adapter.on('groupchat:group_deleted', handleGroupDeleted);

    return () => {
      adapter.off('groupchat:updated', handleUpdate);
      adapter.off('groupchat:message', handleMessage);
      adapter.off('groupchat:kicked', handleKicked);
      adapter.off('groupchat:group_deleted', handleGroupDeleted);
    };
  }, [adapter, queryClient, groupChat, KEYS]);

  // When the group-chat tab becomes active (or selected group changes while active), mark as read
  useEffect(() => {
    if (activeTabId === 'group-chat' && selectedGroup && groupChat) {
      groupChat.markGroupAsRead(selectedGroup.id);
      queryClient.invalidateQueries({ queryKey: KEYS.unreadCount });
      queryClient.invalidateQueries({ queryKey: KEYS.groups });
    }
  }, [activeTabId, selectedGroup, groupChat, queryClient, KEYS]);

  // Query joined groups
  const groupsQuery = useQuery({
    queryKey: KEYS.groups,
    queryFn: async () => {
      if (!groupChat) return [];
      const groups = await groupChat.getGroups();
      // Pinned groups first (alphabetically), then rest by last message time
      return [...groups].sort((a, b) => {
        const aPinned = isPinnedGroup(a.id);
        const bPinned = isPinnedGroup(b.id);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        if (aPinned && bPinned) {
          return getGroupDisplayName(a).localeCompare(getGroupDisplayName(b));
        }
        return (b.lastMessageTime ?? 0) - (a.lastMessageTime ?? 0);
      });
    },
    staleTime: 30000,
    enabled: !!groupChat && isGroupChatConnected,
  });

  // Restore selected group from localStorage when groups are loaded, fallback to first pinned group.
  // Also fetches messages from relay when the local cache is empty — fixes mobile layout
  // showing stale/old messages (auto-select previously skipped the fetch path).
  useEffect(() => {
    if (!groupsQuery.data || groupsQuery.data.length === 0 || selectedGroup) return;
    if (!groupChat) return;

    let target: GroupData | undefined;

    const savedGroupId = localStorage.getItem(selectedGroupKey);
    if (savedGroupId) {
      target = groupsQuery.data.find((g) => g.id === savedGroupId);
    }
    if (!target) {
      target = groupsQuery.data.find((g) => isPinnedGroup(g.id));
    }

    if (target) {
      setSelectedGroup(target);
      localStorage.setItem(selectedGroupKey, target.id);

      // Fetch messages from relay if none exist locally (same as selectGroup)
      const groupId = target.id;
      Promise.resolve(groupChat.getMessages(groupId)).then((localMessages) => {
        if (localMessages.length === 0) {
          groupChat.fetchMessages(groupId).then(() => {
            queryClient.invalidateQueries({ queryKey: KEYS.messages(groupId) });
          });
        }
      });
    }
  }, [groupsQuery.data, selectedGroup, selectedGroupKey, groupChat, queryClient, KEYS]);

  // Query available groups (for discovery)
  const availableGroupsQuery = useQuery({
    queryKey: KEYS.available,
    queryFn: async () => {
      if (!groupChat) return [];
      return groupChat.fetchAvailableGroups();
    },
    staleTime: 60000,
    enabled: !!groupChat && isGroupChatConnected,
  });

  // Reset message limit when switching groups
  useEffect(() => {
    setMessageLimit(20);
  }, [selectedGroup?.id]);

  // Query messages for selected group with lazy loading
  const messagesQuery = useQuery({
    queryKey: [...KEYS.messages(selectedGroup?.id || ''), messageLimit],
    queryFn: async () => {
      if (!selectedGroup || !groupChat) return { messages: [] as GroupMessageData[], hasMore: false };
      const allMessages = await groupChat.getMessages(selectedGroup.id);
      const sorted = [...allMessages].sort((a, b) => a.timestamp - b.timestamp);
      const total = sorted.length;
      const sliced = total > messageLimit ? sorted.slice(total - messageLimit) : sorted;
      return { messages: sliced, hasMore: total > messageLimit };
    },
    enabled: !!selectedGroup && !!groupChat,
    staleTime: 10000,
    placeholderData: keepPreviousData,
  });

  // Load more messages
  const loadMore = useCallback(() => {
    setMessageLimit((prev) => prev + 20);
  }, []);

  // Query members for selected group
  const membersQuery = useQuery({
    queryKey: KEYS.members(selectedGroup?.id || ''),
    queryFn: async () => {
      if (!selectedGroup || !groupChat) return [];
      const members = await groupChat.getMembers(selectedGroup.id);
      return [...members].sort((a, b) => a.joinedAt - b.joinedAt);
    },
    enabled: !!selectedGroup && !!groupChat,
    staleTime: 60000,
  });

  // Query total unread count
  const unreadCountQuery = useQuery({
    queryKey: KEYS.unreadCount,
    queryFn: async () => (await groupChat?.getTotalUnreadCount()) ?? 0,
    staleTime: 30000,
    enabled: !!groupChat && isGroupChatConnected,
  });

  // Query relay admin status
  const relayAdminQuery = useQuery({
    queryKey: KEYS.relayAdmin,
    queryFn: async () => {
      if (!groupChat) return false;
      return groupChat.isCurrentUserRelayAdmin();
    },
    staleTime: 300000,
    enabled: !!groupChat && isGroupChatConnected,
  });

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: async ({ groupId, inviteCode }: { groupId: string; inviteCode?: string }) => {
      if (!groupChat) throw new Error('Group chat not available');
      return groupChat.joinGroup(groupId, inviteCode);
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: KEYS.groups });
      queryClient.invalidateQueries({ queryKey: KEYS.available });
      queryClient.invalidateQueries({ queryKey: KEYS.messages(groupId) });
    },
  });

  // Leave group mutation
  const leaveGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      if (!groupChat) throw new Error('Group chat not available');
      const success = await groupChat.leaveGroup(groupId);
      if (!success) throw new Error('Failed to leave group');
      return true;
    },
    onSuccess: (_, groupId) => {
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
        localStorage.removeItem(selectedGroupKey);
      }
      queryClient.invalidateQueries({ queryKey: KEYS.groups });
      queryClient.invalidateQueries({ queryKey: KEYS.available });
      queryClient.invalidateQueries({ queryKey: KEYS.unreadCount });
    },
    onError: (err, groupId) => {
      console.error(`[useGroupChat] Failed to leave group ${groupId}:`, err);
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, replyToId }: { content: string; replyToId?: string }) => {
      if (!selectedGroup) throw new Error('No group selected');
      if (!groupChat) throw new Error('Group chat not available');

      const message = await groupChat.sendMessage(selectedGroup.id, content, replyToId);
      return !!message;
    },
    onSuccess: () => {
      setMessageInput('');
      queryClient.invalidateQueries({
        queryKey: KEYS.messages(selectedGroup?.id || ''),
      });
      queryClient.invalidateQueries({ queryKey: KEYS.groups });
    },
  });

  // Select group
  const selectGroup = useCallback(
    async (group: GroupData | null) => {
      setSelectedGroup(group);
      if (group) {
        localStorage.setItem(selectedGroupKey, group.id);
        groupChat?.markGroupAsRead(group.id);
        queryClient.invalidateQueries({ queryKey: KEYS.unreadCount });

        // Fetch messages from relay if none exist locally
        if (groupChat) {
          const localMessages = await groupChat.getMessages(group.id);
          if (localMessages.length === 0) {
            await groupChat.fetchMessages(group.id);
            queryClient.invalidateQueries({ queryKey: KEYS.messages(group.id) });
          }
        }
      } else {
        localStorage.removeItem(selectedGroupKey);
      }
    },
    [queryClient, groupChat, KEYS, selectedGroupKey]
  );

  // Join group
  const joinGroup = useCallback(
    async (groupId: string, inviteCode?: string): Promise<boolean> => {
      const success = await joinGroupMutation.mutateAsync({ groupId, inviteCode });
      if (success && groupChat) {
        const joinedGroup = await groupChat.getGroup(groupId);
        if (joinedGroup) {
          setSelectedGroup(joinedGroup);
          localStorage.setItem(selectedGroupKey, joinedGroup.id);
          await groupChat.markGroupAsRead(joinedGroup.id);
          queryClient.invalidateQueries({ queryKey: KEYS.unreadCount });
        }
      }
      return success;
    },
    [joinGroupMutation, queryClient, groupChat, KEYS, selectedGroupKey]
  );

  // Leave group
  const leaveGroup = useCallback(
    async (groupId: string): Promise<boolean> => {
      try {
        return await leaveGroupMutation.mutateAsync(groupId);
      } catch {
        return false;
      }
    },
    [leaveGroupMutation]
  );

  // Send message
  const sendMessage = useCallback(
    async (content: string, replyToId?: string): Promise<boolean> => {
      if (!content.trim()) return false;
      return sendMessageMutation.mutateAsync({ content, replyToId });
    },
    [sendMessageMutation]
  );

  // Mark as read
  const markAsRead = useCallback(
    (groupId: string) => {
      groupChat?.markGroupAsRead(groupId);
      queryClient.invalidateQueries({ queryKey: KEYS.unreadCount });
    },
    [queryClient, groupChat, KEYS]
  );

  // Refresh available groups
  const refreshAvailableGroups = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: KEYS.available });
  }, [queryClient, KEYS]);

  // Filter groups by search query
  const filteredGroups = useMemo(() => {
    const groups = groupsQuery.data || [];
    if (!searchQuery.trim()) return groups;

    const query = searchQuery.toLowerCase();
    return groups.filter(
      (g) =>
        getGroupDisplayName(g).toLowerCase().includes(query) ||
        g.description?.toLowerCase().includes(query) ||
        (g.lastMessageText ?? '').toLowerCase().includes(query)
    );
  }, [groupsQuery.data, searchQuery]);

  // Moderation: Check if current user is admin/moderator (async adapter calls)
  const adminQuery = useQuery({
    queryKey: [...KEYS.members(selectedGroup?.id || ''), 'isAdmin'],
    queryFn: () => groupChat!.isCurrentUserAdmin(selectedGroup!.id),
    enabled: !!selectedGroup && !!groupChat,
    staleTime: 30000,
  });
  const isCurrentUserAdmin = adminQuery.data ?? false;

  const moderatorQuery = useQuery({
    queryKey: [...KEYS.members(selectedGroup?.id || ''), 'isModerator'],
    queryFn: () => groupChat!.isCurrentUserModerator(selectedGroup!.id),
    enabled: !!selectedGroup && !!groupChat,
    staleTime: 30000,
  });
  const isCurrentUserModerator = moderatorQuery.data ?? false;

  // Combined moderation check: group admin/moderator OR relay admin on public groups
  const canModerateSelectedGroup = useMemo(() => {
    if (!selectedGroup) return false;
    if (isCurrentUserAdmin || isCurrentUserModerator) return true;
    if (relayAdminQuery.data && selectedGroup.visibility === GroupVisibility.PUBLIC) return true;
    return false;
  }, [selectedGroup, isCurrentUserAdmin, isCurrentUserModerator, relayAdminQuery.data]);

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      if (!selectedGroup) throw new Error('No group selected');
      if (!groupChat) throw new Error('Group chat not available');
      return groupChat.deleteMessage(selectedGroup.id, messageId);
    },
    onSuccess: () => {
      if (selectedGroup) {
        queryClient.invalidateQueries({
          queryKey: KEYS.messages(selectedGroup.id),
        });
      }
    },
  });

  // Kick user mutation
  const kickUserMutation = useMutation({
    mutationFn: async ({ userPubkey, reason }: { userPubkey: string; reason?: string }) => {
      if (!selectedGroup) throw new Error('No group selected');
      if (!groupChat) throw new Error('Group chat not available');
      return groupChat.kickUser(selectedGroup.id, userPubkey, reason);
    },
    onSuccess: () => {
      if (selectedGroup) {
        queryClient.invalidateQueries({
          queryKey: KEYS.members(selectedGroup.id),
        });
      }
    },
  });

  // Delete message
  const deleteMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      return deleteMessageMutation.mutateAsync(messageId);
    },
    [deleteMessageMutation]
  );

  // Kick user
  const kickUser = useCallback(
    async (userPubkey: string, reason?: string): Promise<boolean> => {
      return kickUserMutation.mutateAsync({ userPubkey, reason });
    },
    [kickUserMutation]
  );

  // Create group mutation (admin)
  const createGroupMutation = useMutation({
    mutationFn: async (options: CreateGroupOptions) => {
      if (!groupChat) throw new Error('Group chat not available');
      return groupChat.createGroup(options);
    },
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: KEYS.groups });
      queryClient.invalidateQueries({ queryKey: KEYS.available });
      if (group) {
        setSelectedGroup(group);
      }
    },
  });

  // Delete group mutation (admin)
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      if (!groupChat) throw new Error('Group chat not available');
      return groupChat.deleteGroup(groupId);
    },
    onSuccess: (_, groupId) => {
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
      }
      queryClient.invalidateQueries({ queryKey: KEYS.groups });
      queryClient.invalidateQueries({ queryKey: KEYS.available });
    },
  });

  // Create invite mutation (admin)
  const createInviteMutation = useMutation({
    mutationFn: async (groupId: string) => {
      if (!groupChat) throw new Error('Group chat not available');
      return groupChat.createInvite(groupId);
    },
  });

  // Create group
  const createGroup = useCallback(
    async (options: CreateGroupOptions): Promise<GroupData | null> => {
      return createGroupMutation.mutateAsync(options);
    },
    [createGroupMutation]
  );

  // Delete group
  const deleteGroup = useCallback(
    async (groupId: string): Promise<boolean> => {
      return deleteGroupMutation.mutateAsync(groupId);
    },
    [deleteGroupMutation]
  );

  // Create invite
  const createInvite = useCallback(
    async (groupId: string): Promise<string | null> => {
      return createInviteMutation.mutateAsync(groupId);
    },
    [createInviteMutation]
  );

  // Write permission for selected group (write-restricted groups only allow admins/moderators)
  const canWriteQuery = useQuery({
    queryKey: [...KEYS.members(selectedGroup?.id || ''), 'canWrite'],
    queryFn: () => groupChat!.canWriteToGroup(selectedGroup!.id),
    enabled: !!selectedGroup && !!groupChat,
    staleTime: 30000,
  });
  const canWriteToSelectedGroup = canWriteQuery.data ?? false;

  // Identity helpers — addressId forces recomputation on address switch
  const myPubkeyQuery = useQuery({
    queryKey: ['groupChat', 'myPubkey', addressId],
    queryFn: () => groupChat!.getMyPublicKey(),
    enabled: !!groupChat,
    staleTime: 300000,
  });
  const myPubkey = myPubkeyQuery.data ?? null;

  const isAdminOfGroup = useCallback(
    (_groupId: string): boolean => {
      // Only reliable for the selected group via adminQuery
      if (selectedGroup && _groupId === selectedGroup.id) return isCurrentUserAdmin;
      return false;
    },
    [selectedGroup, isCurrentUserAdmin]
  );

  return {
    // Groups
    groups: groupsQuery.data || [],
    isLoadingGroups: groupsQuery.isLoading,
    selectedGroup,
    selectGroup,
    joinGroup,
    leaveGroup,

    // Discovery
    availableGroups: availableGroupsQuery.data || [],
    isLoadingAvailable: availableGroupsQuery.isLoading,
    refreshAvailableGroups,

    // Messages
    messages: messagesQuery.data?.messages || [],
    isLoadingMessages: messagesQuery.isLoading,
    sendMessage,
    isSending: sendMessageMutation.isPending,

    // Lazy loading
    hasMore: messagesQuery.data?.hasMore ?? false,
    loadMore,

    // Members
    members: membersQuery.data || [],
    isLoadingMembers: membersQuery.isLoading,

    // Input state
    messageInput,
    setMessageInput,

    // Unread
    totalUnreadCount: unreadCountQuery.data || 0,
    markAsRead,

    // Search/Filter
    searchQuery,
    setSearchQuery,
    filteredGroups,

    // Connection
    isConnected: isGroupChatConnected,

    // Moderation
    isCurrentUserAdmin,
    isCurrentUserModerator,
    canModerateSelectedGroup,
    deleteMessage,
    kickUser,
    isDeleting: deleteMessageMutation.isPending,
    isKicking: kickUserMutation.isPending,

    // Admin actions (relay admin only)
    isRelayAdmin: relayAdminQuery.data || false,
    createGroup,
    deleteGroup,
    createInvite,
    isCreatingGroup: createGroupMutation.isPending,
    isDeletingGroup: deleteGroupMutation.isPending,
    isCreatingInvite: createInviteMutation.isPending,

    // Write permission
    canWriteToSelectedGroup,

    // Identity
    myPubkey,
    isAdminOfGroup,
  };
};
