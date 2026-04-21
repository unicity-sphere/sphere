import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, PanelLeft } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useChat } from '../hooks/useChat';
import { DMConversationList } from './DMConversationList';
import { DMMessageList } from './DMMessageList';
import { DMChatInput } from './DMChatInput';
import { NewConversationModal } from './NewConversationModal';
import { setMentionClickHandler } from '../../../utils/mentionHandler';
import { getColorFromPubkey } from '../utils/avatarColors';
import { getDisplayName, getAvatar } from '../data/chatTypes';
import { useMobileNav } from '../../../hooks/useMobileNav';
import { useDesktopState } from '../../../hooks/useDesktopState';
import { MOBILE_NAV_MESSAGES_TAP } from '../../../config/customEvents';

interface DMChatSectionProps {
  pendingRecipient?: string | null;
  onPendingRecipientHandled?: () => void;
}

export function DMChatSection({ pendingRecipient, onPendingRecipientHandled }: DMChatSectionProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [urlPendingRecipient, setUrlPendingRecipient] = useState<string | null>(null);
  const {
    selectedConversation,
    selectConversation,
    startNewConversation,
    messages,
    isLoadingMessages,
    sendMessage,
    isSending,
    messageInput,
    setMessageInput,
    searchQuery,
    setSearchQuery,
    filteredConversations,
    // totalUnreadCount - available from useChat() if needed
    isRecipientTyping,
    hasMore,
    loadMore,
  } = useChat();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [modalInitialValue, setModalInitialValue] = useState<string | undefined>();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { isMobile } = useMobileNav();
  const { activeTabId } = useDesktopState();
  const didInitSidebarRef = useRef(false);

  // One-shot "sidebar auto-open" effect for mobile DM tab entry.
  //
  // DMChatSection stays mounted (via display:none) when the DM tab is not active,
  // so we can't rely on component mount to re-trigger the open. Instead, we reset
  // the one-shot whenever the DM tab leaves active state; next time it becomes
  // active on mobile, the sidebar reopens to show the conversation list.
  //
  // We intentionally do NOT react to `selectedConversation` changes — `useChat`
  // asynchronously restores the last-selected conversation from localStorage
  // after mount, and a reactive effect would close the sidebar right after
  // opening it (user lands in previous chat instead of the list).
  //
  // Selecting a conversation closes the sidebar via the DMConversationList
  // `onSelect` handler below; tapping the PanelLeft button reopens it.
  useEffect(() => {
    if (activeTabId !== 'dm') {
      // DM tab is not active — reset the one-shot so re-entry opens the list.
      didInitSidebarRef.current = false;
      return;
    }
    if (isMobile && !didInitSidebarRef.current) {
      didInitSidebarRef.current = true;
      setSidebarOpen(true);
    }
  }, [isMobile, activeTabId]);

  // Reopen sidebar when user taps the Messages bottom-nav tab while already on DM.
  // The `didInitSidebarRef` one-shot above only fires on first entry; tapping
  // Messages again is idempotent in `useDesktopState` (activeTabId stays 'dm'),
  // so we need an explicit signal from the bottom nav to reopen the list.
  //
  // We deliberately do NOT gate on `isMobile` here — gating would cause the
  // listener to churn on every viewport crossing 1024px, and the closure would
  // capture a stale `isMobile` until the effect re-runs. The `setSidebarOpen(true)`
  // is inert on desktop anyway (sidebar uses `lg:relative lg:translate-x-0`, so
  // it is visually always visible regardless of `isOpen`). Register once for
  // the component lifetime.
  useEffect(() => {
    const handler = () => setSidebarOpen(true);
    window.addEventListener(MOBILE_NAV_MESSAGES_TAP, handler);
    return () => window.removeEventListener(MOBILE_NAV_MESSAGES_TAP, handler);
  }, []);

  // Handle ?nametag= URL param for DM navigation
  useEffect(() => {
    const nametag = searchParams.get('nametag');
    if (nametag) {
      const cleanNametag = nametag.startsWith('@') ? nametag.slice(1) : nametag;
      const formattedNametag = cleanNametag.toLowerCase().replace(/\s+/g, '-');
      setUrlPendingRecipient(formattedNametag);
      setSearchParams((prev) => {
        prev.delete('nametag');
        prev.delete('product');
        prev.delete('image');
        prev.delete('price');
        prev.delete('purchased');
        return prev;
      });
    }
  }, [searchParams, setSearchParams]);

  // Auto-focus input when message is sent (desktop only)
  useEffect(() => {
    if (!isSending && selectedConversation && window.innerWidth >= 1024) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [isSending, selectedConversation]);

  // Auto-focus input when conversation is selected (desktop only)
  useEffect(() => {
    if (selectedConversation && window.innerWidth >= 1024) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true });
      }, 100);
    }
  }, [selectedConversation]);

  // Handle pending recipient from prop, URL param, or @mention click
  // If conversation exists, select it directly; otherwise open modal
  const effectiveRecipient = pendingRecipient || urlPendingRecipient;
  useEffect(() => {
    if (effectiveRecipient) {
      const nametag = effectiveRecipient.startsWith('@') ? effectiveRecipient.slice(1) : effectiveRecipient;
      const existingConversation = filteredConversations.find(
        (c) => c.peerNametag?.toLowerCase() === nametag.toLowerCase()
      );
      if (existingConversation) {
        selectConversation(existingConversation);
      } else {
        setModalInitialValue(nametag);
        setShowNewConversation(true);
      }
      onPendingRecipientHandled?.();
      setUrlPendingRecipient(null);
    }
  }, [effectiveRecipient, onPendingRecipientHandled, filteredConversations, selectConversation]);

  // Set up mention click handler - clicking @mention in DM
  // If conversation exists, select it directly; otherwise open modal
  useEffect(() => {
    setMentionClickHandler((username) => {
      const nametag = username.startsWith('@') ? username.slice(1) : username;
      // Check if conversation already exists
      const existingConversation = filteredConversations.find(
        (c) => c.peerNametag?.toLowerCase() === nametag.toLowerCase()
      );
      if (existingConversation) {
        selectConversation(existingConversation);
      } else {
        setModalInitialValue(nametag);
        setShowNewConversation(true);
      }
    });
    return () => setMentionClickHandler(null);
  }, [filteredConversations, selectConversation]);

  const handleSend = () => {
    if (messageInput.trim()) {
      sendMessage(messageInput);
    }
  };

  const handleNewConversation = async (pubkeyOrNametag: string): Promise<boolean> => {
    const conversation = await startNewConversation(pubkeyOrNametag);
    return !!conversation;
  };

  // Chat content (shared between normal and fullscreen modes)
  const chatContent = (
    <>
      {/* Left Sidebar - Conversation List */}
      <DMConversationList
        conversations={filteredConversations}
        selectedConversation={selectedConversation}
        onSelect={(conversation) => {
          selectConversation(conversation);
          setSidebarOpen(false);
        }}
        onNewConversation={() => setShowNewConversation(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onCollapse={() => setSidebarCollapsed(true)}
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
              title="Show conversations"
            >
              <PanelLeft className="w-4 h-4" />
            </motion.button>

            {/* Conversation or default header */}
            <div className="flex items-center gap-2.5">
              {selectedConversation ? (
                <>
                  <div className={`relative w-8 h-8 rounded-xl bg-linear-to-br ${getColorFromPubkey(selectedConversation.peerPubkey).gradient} flex items-center justify-center text-white text-sm font-medium`}>
                    {getAvatar(selectedConversation.peerPubkey, selectedConversation.peerNametag)}
                  </div>
                  <h3 className="text-sm text-neutral-900 dark:text-white font-medium">
                    {getDisplayName(selectedConversation.peerPubkey, selectedConversation.peerNametag)}
                  </h3>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-neutral-400 dark:text-[rgba(255,255,255,0.35)]" />
                  </div>
                  <div>
                    <h3 className="text-sm text-neutral-900 dark:text-white font-medium">
                      Direct Messages
                    </h3>
                    <p className="text-xs text-neutral-400 dark:text-[rgba(255,255,255,0.35)]">
                      Select a conversation to start
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        {selectedConversation ? (
          <DMMessageList key={selectedConversation.peerPubkey} messages={messages} isLoading={isLoadingMessages} isRecipientTyping={isRecipientTyping} hasMore={hasMore} loadMore={loadMore} />
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 min-h-0">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 rounded-2xl bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] flex items-center justify-center mb-4"
            >
              <MessageCircle className="w-10 h-10 text-neutral-300 dark:text-[rgba(255,255,255,0.2)]" />
            </motion.div>
            <p className="text-neutral-600 dark:text-[rgba(255,255,255,0.6)] font-medium">
              Direct Messages
            </p>
            <p className="text-neutral-400 dark:text-[rgba(255,255,255,0.3)] text-sm mt-1">
              Select a conversation or start a new one
            </p>
            <motion.button
              onClick={() => setShowNewConversation(true)}
              className="mt-5 px-6 py-2.5 rounded-full bg-linear-to-r from-orange-500 to-orange-600 dark:from-brand-orange dark:to-brand-orange-dark text-white text-sm font-medium shadow-md shadow-orange-500/20 dark:shadow-brand-orange-border"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Start New Conversation
            </motion.button>
          </div>
        )}

        {/* Message Input */}
        {selectedConversation && (
          <div className="shrink-0">
            <DMChatInput
              ref={inputRef}
              value={messageInput}
              onChange={setMessageInput}
              onSend={handleSend}
              isSending={isSending}
              placeholder={`Message ${getDisplayName(selectedConversation.peerPubkey, selectedConversation.peerNametag)}...`}
              participantPubkey={selectedConversation.peerPubkey}
            />
          </div>
        )}
      </div>
    </>
  );

  // New Conversation Modal - rendered separately to avoid duplication during fullscreen transitions
  const modalElement = (
    <NewConversationModal
      isOpen={showNewConversation}
      onClose={() => {
        setShowNewConversation(false);
        setModalInitialValue(undefined);
      }}
      onStart={handleNewConversation}
      initialValue={modalInitialValue}
    />
  );

  return (
    <>
      <div className="bg-white dark:bg-transparent overflow-hidden grid grid-cols-1 lg:grid-cols-[auto_1fr] relative h-full min-h-0">
        {chatContent}
      </div>
      {modalElement}
    </>
  );
}
