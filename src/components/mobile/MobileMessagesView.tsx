import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, PenSquare, MessageCircle } from 'lucide-react';
import { useChat } from '../chat/hooks/useChat';
import { useMobileNav } from '../../hooks/useMobileNav';
import { DMConversationItem } from '../chat/dm/DMConversationItem';
import { DMMessageList } from '../chat/dm/DMMessageList';
import { DMChatInput } from '../chat/dm/DMChatInput';
import { NewConversationModal } from '../chat/dm/NewConversationModal';
import { getDisplayName, getAvatar } from '../chat/data/chatTypes';
import { getColorFromPubkey } from '../chat/utils/avatarColors';

export function MobileMessagesView() {
  const { messagesSubView, setMessagesSubView } = useMobileNav();
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
    isRecipientTyping,
    hasMore,
    loadMore,
  } = useChat();

  const [showNewConversation, setShowNewConversation] = useState(false);

  const handleSelectConversation = (conv: Parameters<typeof selectConversation>[0]) => {
    selectConversation(conv);
    setMessagesSubView('conversation');
  };

  const handleBack = () => {
    selectConversation(null);
    setMessagesSubView('list');
  };

  const handleSend = () => {
    if (messageInput.trim()) {
      sendMessage(messageInput);
    }
  };

  const handleNewConversation = async (recipient: string): Promise<boolean> => {
    const conv = await startNewConversation(recipient);
    if (conv) {
      setShowNewConversation(false);
      setMessagesSubView('conversation');
      return true;
    }
    return false;
  };

  return (
    <div className="absolute inset-0 z-[100] flex flex-col bg-white dark:bg-[#060606] lg:hidden">
      <AnimatePresence mode="wait" initial={false}>
        {messagesSubView === 'list' ? (
          <motion.div
            key="list"
            className="flex flex-col h-full"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="shrink-0 px-4 py-3 border-b border-neutral-100 dark:border-[rgba(255,255,255,0.06)] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Messages</h2>
              <motion.button
                onClick={() => setShowNewConversation(true)}
                className="p-2 rounded-lg text-neutral-400 dark:text-[rgba(255,255,255,0.35)] hover:text-neutral-600 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <PenSquare className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Search */}
            <div className="px-4 py-2">
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-[rgba(255,255,255,0.3)] focus:outline-none focus:ring-1 focus:ring-orange-500/30"
              />
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-8">
                  <MessageCircle className="w-12 h-12 text-neutral-300 dark:text-[rgba(255,255,255,0.15)] mb-3" />
                  <p className="text-sm text-neutral-500 dark:text-[rgba(255,255,255,0.4)]">
                    No conversations yet
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <DMConversationItem
                    key={conv.peerPubkey}
                    conversation={conv}
                    isSelected={selectedConversation?.peerPubkey === conv.peerPubkey}
                    onClick={() => handleSelectConversation(conv)}
                  />
                ))
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="conversation"
            className="flex flex-col h-full"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Conversation header */}
            <div className="shrink-0 px-3 py-2.5 border-b border-neutral-100 dark:border-[rgba(255,255,255,0.06)] flex items-center gap-2">
              <motion.button
                onClick={handleBack}
                className="p-1.5 rounded-lg text-neutral-400 dark:text-[rgba(255,255,255,0.35)] hover:text-neutral-600 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
              {selectedConversation && (
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl bg-linear-to-br ${getColorFromPubkey(selectedConversation.peerPubkey).gradient} flex items-center justify-center text-white text-sm font-medium`}>
                    {getAvatar(selectedConversation.peerPubkey, selectedConversation.peerNametag)}
                  </div>
                  <h3 className="text-sm text-neutral-900 dark:text-white font-medium">
                    {getDisplayName(selectedConversation.peerPubkey, selectedConversation.peerNametag)}
                  </h3>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-0">
              {selectedConversation ? (
                <DMMessageList
                  key={selectedConversation.peerPubkey}
                  messages={messages}
                  isLoading={isLoadingMessages}
                  isRecipientTyping={isRecipientTyping}
                  hasMore={hasMore}
                  loadMore={loadMore}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-neutral-400">Select a conversation</p>
                </div>
              )}
            </div>

            {/* Input */}
            {selectedConversation && (
              <DMChatInput
                value={messageInput}
                onChange={setMessageInput}
                onSend={handleSend}
                isSending={isSending}
                participantPubkey={selectedConversation.peerPubkey}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* New conversation modal */}
      <NewConversationModal
        isOpen={showNewConversation}
        onClose={() => setShowNewConversation(false)}
        onStart={handleNewConversation}
      />
    </div>
  );
}
