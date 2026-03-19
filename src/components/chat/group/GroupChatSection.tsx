import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash, PanelLeft, Users, X, Reply, Loader2 } from 'lucide-react';
import type { GroupData, GroupMessageData } from '@unicitylabs/sphere-sdk';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGroupChat } from '../hooks/useGroupChat';
import { GroupList } from './GroupList';
import { GroupMessageList } from './GroupMessageList';
import { DMChatInput } from '../dm/DMChatInput';
import { JoinGroupModal } from './JoinGroupModal';
import { MemberListModal } from './MemberListModal';
import { CreateGroupModal } from './CreateGroupModal';
import { setMentionClickHandler } from '../../../utils/mentionHandler';
import { getGroupDisplayName, getMessageSenderDisplayName } from '../utils/groupChatHelpers';

interface GroupChatSectionProps {
  onModeChange?: (mode: string, dmRecipient?: string) => void;
}

export function GroupChatSection({ onModeChange }: GroupChatSectionProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    selectedGroup,
    selectGroup,
    leaveGroup,
    joinGroup,
    groups,
    filteredGroups,
    isLoadingGroups,
    availableGroups,
    isLoadingAvailable,
    refreshAvailableGroups,
    messages,
    isLoadingMessages,
    sendMessage,
    isSending,
    hasMore,
    loadMore,
    messageInput,
    setMessageInput,
    searchQuery,
    setSearchQuery,
    isConnected,
    // Moderation
    canModerateSelectedGroup,
    deleteMessage,
    kickUser,
    isDeleting,
    isKicking,
    // Members
    members,
    isLoadingMembers,
    // Admin actions (relay admin only)
    isRelayAdmin,
    createGroup,
    deleteGroup,
    createInvite,
    isCreatingGroup,
    isDeletingGroup,
    isCreatingInvite,
    // Write permission
    canWriteToSelectedGroup,
    // Identity
    myPubkey,
    isAdminOfGroup,
  } = useGroupChat();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showMemberList, setShowMemberList] = useState(false);
  const [inviteLinkFromUrl, setInviteLinkFromUrl] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<GroupMessageData | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Handle ?join= URL parameter for invite links
  useEffect(() => {
    const joinParam = searchParams.get('join');
    if (joinParam) {
      setInviteLinkFromUrl(joinParam);
      setShowJoinGroup(true);
      // Clear the parameter from URL
      setSearchParams((prev) => {
        prev.delete('join');
        return prev;
      });
    }
  }, [searchParams, setSearchParams]);

  // Auto-focus input when message is sent (desktop only)
  useEffect(() => {
    if (!isSending && selectedGroup && window.innerWidth >= 1024) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [isSending, selectedGroup]);

  // Auto-focus input when group is selected (desktop only)
  useEffect(() => {
    if (selectedGroup && window.innerWidth >= 1024) {
      setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true });
      }, 100);
    }
  }, [selectedGroup]);

  // Set up mention click handler - clicking @mention navigates to DM with that user
  useEffect(() => {
    setMentionClickHandler((username) => {
      if (onModeChange) {
        onModeChange('dm', username);
      } else {
        navigate(`/agents/dm?nametag=${encodeURIComponent(username)}`);
      }
    });
    return () => setMentionClickHandler(null);
  }, [onModeChange, navigate]);

  // Clear reply when switching groups
  useEffect(() => {
    setReplyingTo(null);
  }, [selectedGroup?.id]);

  const handleSend = useCallback(async () => {
    if (messageInput.trim()) {
      const replyToId = replyingTo?.id;
      await sendMessage(messageInput, replyToId);
      setReplyingTo(null);
    }
  }, [messageInput, replyingTo, sendMessage]);

  const handleReplyToMessage = useCallback((message: GroupMessageData) => {
    setReplyingTo(message);
    inputRef.current?.focus();
  }, []);

  const cancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const handleSelectGroup = useCallback((group: GroupData) => {
    selectGroup(group);
    setSidebarOpen(false);
  }, [selectGroup]);

  const handleOpenJoinGroup = useCallback(() => setShowJoinGroup(true), []);
  const handleOpenCreateGroup = useCallback(() => setShowCreateGroup(true), []);
  const handleCloseSidebar = useCallback(() => setSidebarOpen(false), []);
  const handleCollapseSidebar = useCallback(() => setSidebarCollapsed(true), []);

  // Chat content (shared between normal and fullscreen modes)
  const chatContent = (
    <>
      {/* Left Sidebar - Group List */}
      <GroupList
        groups={filteredGroups}
        selectedGroup={selectedGroup}
        onSelect={handleSelectGroup}
        onLeave={leaveGroup}
        onJoinGroup={handleOpenJoinGroup}
        onCreateGroup={handleOpenCreateGroup}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isOpen={sidebarOpen}
        onClose={handleCloseSidebar}
        isCollapsed={sidebarCollapsed}
        onCollapse={handleCollapseSidebar}
        isRelayAdmin={isRelayAdmin}
        isAdminOfGroup={isAdminOfGroup}
        onDeleteGroup={deleteGroup}
        onCreateInvite={createInvite}
        isDeletingGroup={isDeletingGroup}
        isCreatingInvite={isCreatingInvite}
      />

      {/* Main Chat Area */}
      <div className="grid grid-rows-[auto_1fr_auto] z-10 min-w-0 h-full min-h-0">
        {/* Chat Header */}
        <div className="shrink-0 px-4 py-2.5 border-b border-neutral-100 dark:border-[rgba(255,255,255,0.06)] flex items-center justify-between relative z-20">
          <div className="flex items-center gap-2">
            {/* Desktop expand sidebar button (when collapsed) */}
            {sidebarCollapsed && (
              <motion.button
                onClick={() => setSidebarCollapsed(false)}
                className="hidden lg:flex p-1.5 rounded-lg text-neutral-400 dark:text-[rgba(255,255,255,0.35)] hover:text-neutral-600 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Expand sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </motion.button>
            )}
            {/* Mobile sidebar button */}
            <motion.button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-neutral-400 dark:text-[rgba(255,255,255,0.35)] hover:text-neutral-600 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Show groups"
            >
              <PanelLeft className="w-4 h-4" />
            </motion.button>

            {/* Group or default header */}
            <div className="flex items-center gap-2.5">
              {selectedGroup ? (
                <>
                  <div className="relative w-8 h-8 rounded-xl bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                    <Hash className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm text-neutral-900 dark:text-white font-medium">
                      {getGroupDisplayName(selectedGroup)}
                    </h3>
                    {selectedGroup.memberCount !== undefined && (
                      <button
                        onClick={() => setShowMemberList(true)}
                        className="text-xs text-neutral-400 dark:text-[rgba(255,255,255,0.35)] flex items-center gap-1 hover:text-orange-500 dark:hover:text-brand-orange transition-colors"
                      >
                        <Users className="w-3 h-3" />
                        {selectedGroup.memberCount} members
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] flex items-center justify-center">
                    <Hash className="w-4 h-4 text-neutral-400 dark:text-[rgba(255,255,255,0.35)]" />
                  </div>
                  <div>
                    <h3 className="text-sm text-neutral-900 dark:text-white font-medium">Group Chat</h3>
                    <p className="text-xs text-neutral-400 dark:text-[rgba(255,255,255,0.35)]">
                      {isConnected ? 'Select a group to start' : 'Connecting...'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        {(!isConnected || isLoadingGroups) && !selectedGroup ? (
          <div className="flex-1 flex items-center justify-center min-h-0">
            <div className="relative w-16 h-16">
              <motion.div
                className="absolute inset-0 border-2 border-neutral-200 dark:border-white/6 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute inset-1 border-2 border-orange-500/30 rounded-full border-t-orange-500 border-r-orange-500"
                animate={{ rotate: -360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
              <div className="absolute inset-2 bg-orange-500/15 rounded-full blur-lg" />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Loader2 className="w-5 h-5 text-orange-500 dark:text-brand-orange animate-spin" />
                </motion.div>
              </div>
            </div>
          </div>
        ) : selectedGroup ? (
          <GroupMessageList
            messages={messages}
            isLoading={isLoadingMessages}
            myPubkey={myPubkey}
            canDeleteMessages={canModerateSelectedGroup}
            onDeleteMessage={deleteMessage}
            isDeletingMessage={isDeleting}
            onReplyToMessage={canWriteToSelectedGroup ? handleReplyToMessage : undefined}
            hasMore={hasMore}
            loadMore={loadMore}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 min-h-0">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] flex items-center justify-center mb-3"
            >
              <Hash className="w-8 h-8 text-neutral-300 dark:text-[rgba(255,255,255,0.2)]" />
            </motion.div>
            <p className="text-neutral-500 dark:text-[rgba(255,255,255,0.45)] text-sm">Welcome to Group Chat</p>
            <p className="text-neutral-400 dark:text-[rgba(255,255,255,0.25)] text-xs mt-1">
              Select a group or join a new one
            </p>
            <motion.button
              onClick={() => setShowJoinGroup(true)}
              className="mt-4 px-6 py-2.5 rounded-full bg-linear-to-r from-orange-500 to-orange-600 dark:from-brand-orange dark:to-brand-orange-dark text-white text-sm font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Browse Groups
            </motion.button>
          </div>
        )}

        {/* Message Input (hidden for read-only groups) */}
        {selectedGroup && canWriteToSelectedGroup && (
          <div className="shrink-0">
            {/* Reply preview */}
            <AnimatePresence>
              {replyingTo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t border-neutral-100 dark:border-[rgba(255,255,255,0.06)]"
                >
                  <div className="px-4 py-2 flex items-center gap-3 bg-neutral-50 dark:bg-[rgba(255,255,255,0.03)]">
                    <Reply className="w-4 h-4 text-orange-500 dark:text-brand-orange shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-orange-500 dark:text-brand-orange font-medium">
                        Replying to {getMessageSenderDisplayName(replyingTo)}
                      </div>
                      <div className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                        {replyingTo.content.slice(0, 100)}{replyingTo.content.length > 100 ? '...' : ''}
                      </div>
                    </div>
                    <button
                      onClick={cancelReply}
                      className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-[rgba(255,255,255,0.06)] text-neutral-400 dark:text-[rgba(255,255,255,0.35)] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <DMChatInput
              ref={inputRef}
              value={messageInput}
              onChange={setMessageInput}
              onSend={handleSend}
              isSending={isSending}
              placeholder={`Message #${getGroupDisplayName(selectedGroup)}...`}
            />
          </div>
        )}
      </div>

      {/* Join Group Modal */}
      <JoinGroupModal
        isOpen={showJoinGroup}
        onClose={() => {
          setShowJoinGroup(false);
          setInviteLinkFromUrl(null);
        }}
        availableGroups={availableGroups}
        joinedGroupIds={groups.map((g) => g.id)}
        isLoading={isLoadingAvailable}
        onRefresh={refreshAvailableGroups}
        onJoin={joinGroup}
        initialInviteLink={inviteLinkFromUrl || undefined}
      />

      {/* Member List Modal */}
      <MemberListModal
        isOpen={showMemberList}
        onClose={() => setShowMemberList(false)}
        members={members}
        isLoading={isLoadingMembers}
        canModerate={canModerateSelectedGroup}
        myPubkey={myPubkey}
        onKickUser={kickUser}
        isKicking={isKicking}
      />

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onCreate={createGroup}
        isCreating={isCreatingGroup}
      />
    </>
  );

  return (
    <div className="bg-white dark:bg-transparent overflow-hidden grid grid-cols-1 lg:grid-cols-[auto_1fr] relative h-full min-h-0">
      {chatContent}
    </div>
  );
}
