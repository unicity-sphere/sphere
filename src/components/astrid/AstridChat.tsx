import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, Sparkles, Circle, Waves, Triangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgent, useAgentMessages } from '../../hooks/useAgent';
import type { AgentAvatar, AgentMessage } from '../../types/agent';
import { TaskCard } from './TaskCard';

interface AstridChatProps {
  chatId: string;
}

const AVATAR_ICON: Record<AgentAvatar, typeof Sparkles> = {
  spark: Sparkles,
  orb: Circle,
  wave: Waves,
  prism: Triangle,
};

const AVATAR_GRADIENT: Record<AgentAvatar, string> = {
  spark: 'from-orange-400 to-amber-500',
  orb: 'from-purple-400 to-pink-500',
  wave: 'from-cyan-400 to-blue-500',
  prism: 'from-emerald-400 to-teal-500',
};

const QUICK_PROMPTS = [
  'Swap 50 UCT to BTC',
  'Buy 0.1 ETH with 300 USDT',
  'Send 25 UCT to @alice',
  'DCA 10 USDT into BTC daily',
];

export function AstridChat({ chatId }: AstridChatProps) {
  const { config, sendMessage } = useAgent();
  const messages = useAgentMessages(chatId);

  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, isSending]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [chatId]);

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isSending || !config) return;
    setInput('');
    setIsSending(true);
    try {
      await sendMessage(chatId, content);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!config) return null;

  const AvatarIcon = AVATAR_ICON[config.avatar];
  const avatarGradient = AVATAR_GRADIENT[config.avatar];
  const isEmpty = messages.length === 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 py-3 border-b border-neutral-200 dark:border-white/8 flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full bg-linear-to-br ${avatarGradient} flex items-center justify-center`}>
          <AvatarIcon className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-900 dark:text-white">{config.name}</p>
          <p className="text-[10px] text-neutral-500 dark:text-white/45">@{config.nametag} · {config.personality}</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
        {isEmpty ? (
          <EmptyChatState
            agentName={config.name}
            avatarGradient={avatarGradient}
            AvatarIcon={AvatarIcon}
            onPromptClick={(p) => handleSend(p)}
          />
        ) : (
          <div className="space-y-3 max-w-2xl mx-auto">
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                agentName={config.name}
                avatarGradient={avatarGradient}
                AvatarIcon={AvatarIcon}
              />
            ))}
            <AnimatePresence>
              {isSending && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-2"
                >
                  <div className={`w-7 h-7 rounded-full bg-linear-to-br ${avatarGradient} flex items-center justify-center shrink-0`}>
                    <AvatarIcon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-neutral-100 dark:bg-white/6 rounded-2xl px-3 py-2 flex items-center gap-1.5">
                    <TypingDot delay={0} />
                    <TypingDot delay={0.15} />
                    <TypingDot delay={0.3} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="px-6 py-3 border-t border-neutral-200 dark:border-white/8">
        <div className="max-w-2xl mx-auto relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${config.name}…`}
            rows={1}
            className="w-full bg-neutral-100 dark:bg-white/6 border border-neutral-200 dark:border-white/8 rounded-2xl py-3 pl-4 pr-12 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-white/35 focus:outline-none focus:border-orange-500 dark:focus:border-orange-500/60 resize-none max-h-32"
            disabled={isSending}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isSending}
            className="absolute right-2 bottom-2 w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Send"
          >
            {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: AgentMessage;
  agentName: string;
  avatarGradient: string;
  AvatarIcon: typeof Sparkles;
}

function MessageBubble({ message, agentName, avatarGradient, AvatarIcon }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-orange-500 text-white rounded-2xl rounded-tr-md px-4 py-2 text-sm whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className={`w-7 h-7 rounded-full bg-linear-to-br ${avatarGradient} flex items-center justify-center shrink-0 mt-0.5`}>
        <AvatarIcon className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex-1 max-w-[80%]">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-xs font-semibold text-neutral-700 dark:text-white/75">{agentName}</span>
        </div>
        <div className="bg-neutral-100 dark:bg-white/6 text-neutral-900 dark:text-white/90 rounded-2xl rounded-tl-md px-4 py-2 text-sm whitespace-pre-wrap break-words">
          {message.content}
        </div>
        {message.taskId && <TaskCard taskId={message.taskId} />}
      </div>
    </div>
  );
}

function TypingDot({ delay }: { delay: number }) {
  return (
    <motion.span
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 1.2, repeat: Infinity, delay }}
      className="w-1.5 h-1.5 rounded-full bg-neutral-500 dark:bg-white/55"
    />
  );
}

interface EmptyChatStateProps {
  agentName: string;
  avatarGradient: string;
  AvatarIcon: typeof Sparkles;
  onPromptClick: (p: string) => void;
}

function EmptyChatState({ agentName, avatarGradient, AvatarIcon, onPromptClick }: EmptyChatStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
      <div className={`w-16 h-16 rounded-full bg-linear-to-br ${avatarGradient} flex items-center justify-center mb-4`}>
        <AvatarIcon className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
        How can {agentName} help today?
      </h3>
      <p className="text-xs text-neutral-500 dark:text-white/45 mb-6">
        Give it a trading task, or try one of these prompts.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onPromptClick(p)}
            className="text-left p-3 rounded-xl bg-neutral-100 dark:bg-white/4 border border-neutral-200 dark:border-white/8 hover:border-orange-500/50 dark:hover:bg-white/8 text-xs text-neutral-700 dark:text-white/75 transition-colors font-mono"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
