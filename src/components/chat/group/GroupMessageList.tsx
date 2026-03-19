import { useCallback, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, Loader2 } from 'lucide-react';
import type { GroupMessageData } from '@unicitylabs/sphere-sdk';
import { GroupMessageBubble } from './GroupMessageBubble';
import { getMessageFormattedDate } from '../utils/groupChatHelpers';

interface GroupMessageListProps {
  messages: GroupMessageData[];
  isLoading: boolean;
  myPubkey: string | null;
  canDeleteMessages?: boolean;
  onDeleteMessage?: (messageId: string) => Promise<boolean>;
  isDeletingMessage?: boolean;
  onReplyToMessage?: (message: GroupMessageData) => void;
  hasMore?: boolean;
  loadMore?: () => void;
}

export function GroupMessageList({
  messages,
  isLoading,
  myPubkey,
  canDeleteMessages = false,
  onDeleteMessage,
  isDeletingMessage = false,
  onReplyToMessage,
  hasMore,
  loadMore,
}: GroupMessageListProps) {
  // Create a map for quick lookup of messages by ID (for reply-to)
  const messagesById = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const scrollStateBeforeLoadRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);

  // Auto-scroll to bottom when messages change (skip when loading more)
  useEffect(() => {
    if (scrollRef.current) {
      if (loadingMoreRef.current && scrollStateBeforeLoadRef.current) {
        // Restore scroll position after loading older messages
        const { scrollHeight: prevHeight, scrollTop: prevTop } = scrollStateBeforeLoadRef.current;
        scrollRef.current.scrollTop = prevTop + (scrollRef.current.scrollHeight - prevHeight);
        loadingMoreRef.current = false;
        scrollStateBeforeLoadRef.current = null;
      } else {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [messages]);

  const handleLoadMore = useCallback(() => {
    if (!loadMore || !scrollRef.current) return;
    loadingMoreRef.current = true;
    scrollStateBeforeLoadRef.current = {
      scrollHeight: scrollRef.current.scrollHeight,
      scrollTop: scrollRef.current.scrollTop,
    };
    loadMore();
  }, [loadMore]);

  // Group messages by date (memoized to avoid recomputation on every render)
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: GroupMessageData[] }[] = [];
    let currentDate = '';
    messages.forEach((message) => {
      const messageDate = getMessageFormattedDate(message);
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({ date: messageDate, messages: [] });
      }
      groups[groups.length - 1].messages.push(message);
    });
    return groups;
  }, [messages]);

  if (isLoading) {
    return (
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
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-6 min-h-0"
    >
      {hasMore && (
        <div className="flex items-center justify-center py-2">
          <button
            onClick={handleLoadMore}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/50 hover:bg-neutral-200 dark:hover:bg-neutral-700/50 transition-colors"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            Load earlier messages
          </button>
        </div>
      )}
      {groupedMessages.map((group) => (
        <div key={group.date} className="space-y-4">
          {/* Date separator */}
          <div className="flex items-center justify-center">
            <div className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 text-xs font-medium">
              {group.date}
            </div>
          </div>

          {/* Messages */}
          {group.messages.map((message) => (
            <GroupMessageBubble
              key={message.id ?? `${message.timestamp}-${message.senderPubkey}`}
              message={message}
              isOwnMessage={message.senderPubkey === myPubkey}
              canDelete={canDeleteMessages}
              onDelete={onDeleteMessage}
              isDeleting={isDeletingMessage}
              onReply={onReplyToMessage}
              replyToMessage={message.replyToId ? messagesById.get(message.replyToId) : null}
            />
          ))}
        </div>
      ))}

      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <p className="text-neutral-500 dark:text-neutral-400">No messages yet</p>
          <p className="text-neutral-400 dark:text-neutral-500 text-sm mt-1">
            Be the first to send a message!
          </p>
        </div>
      )}
    </div>
  );
}
