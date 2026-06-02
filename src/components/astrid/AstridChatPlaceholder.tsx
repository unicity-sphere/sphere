import { MessageSquare } from 'lucide-react';

interface AstridChatPlaceholderProps {
  agentName: string;
  onStart: () => void;
}

export function AstridChatPlaceholder({ agentName, onStart }: AstridChatPlaceholderProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="w-14 h-14 rounded-full bg-orange-500/10 dark:bg-orange-500/15 flex items-center justify-center mb-4">
        <MessageSquare className="w-7 h-7 text-orange-500 dark:text-orange-400" />
      </div>
      <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-1">
        Talk to {agentName}
      </h3>
      <p className="text-xs text-neutral-500 dark:text-white/45 mb-5 max-w-xs">
        Pick a conversation on the left or start a new one to chat with your agent.
      </p>
      <button
        onClick={onStart}
        className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-md shadow-orange-500/20 transition-colors"
      >
        Start a chat
      </button>
    </div>
  );
}
