import { MessageSquare, LayoutDashboard, Plus, Trash2 } from 'lucide-react';
import type { AgentChat } from '../../types/agent';

export type AstridView = 'chat' | 'dashboard';

interface AstridSidebarProps {
  view: AstridView;
  onViewChange: (v: AstridView) => void;
  chats: AgentChat[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  agentName: string;
}

function groupChatsByDate(chats: AgentChat[]): Array<{ label: string; items: AgentChat[] }> {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const groups: Record<string, AgentChat[]> = { Today: [], Yesterday: [], 'Last 7 days': [], Older: [] };
  for (const c of chats) {
    const diff = now - c.lastMessageAt;
    if (diff < day) groups.Today.push(c);
    else if (diff < day * 2) groups.Yesterday.push(c);
    else if (diff < day * 7) groups['Last 7 days'].push(c);
    else groups.Older.push(c);
  }
  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

export function AstridSidebar({
  view,
  onViewChange,
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  agentName,
}: AstridSidebarProps) {
  const grouped = groupChatsByDate(chats);

  return (
    <div className="w-64 shrink-0 flex flex-col bg-neutral-50/70 dark:bg-[rgba(10,10,10,0.4)] border-r border-neutral-200 dark:border-white/8 backdrop-blur-sm">
      <div className="px-4 py-4 border-b border-neutral-200 dark:border-white/8">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-white/35 mb-2">
          Agent
        </p>
        <p className="text-sm font-bold text-neutral-900 dark:text-white">{agentName}</p>
      </div>

      <div className="p-2 flex gap-1 border-b border-neutral-200 dark:border-white/8">
        <ViewTab
          label="Chat"
          Icon={MessageSquare}
          active={view === 'chat'}
          onClick={() => onViewChange('chat')}
        />
        <ViewTab
          label="Dashboard"
          Icon={LayoutDashboard}
          active={view === 'dashboard'}
          onClick={() => onViewChange('dashboard')}
        />
      </div>

      {view === 'chat' && (
        <>
          <div className="p-2">
            <button
              onClick={onNewChat}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-dashed border-neutral-300 dark:border-white/15 text-xs font-medium text-neutral-600 dark:text-white/65 hover:bg-neutral-100 dark:hover:bg-white/6 hover:border-orange-500/50 dark:hover:border-orange-500/50 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {grouped.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-neutral-400 dark:text-white/35">
                No conversations yet.<br />Start a new chat above.
              </p>
            ) : (
              grouped.map(({ label, items }) => (
                <div key={label} className="mb-3">
                  <p className="px-2 mt-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-white/35">
                    {label}
                  </p>
                  {items.map((chat) => (
                    <ChatRow
                      key={chat.id}
                      chat={chat}
                      active={chat.id === activeChatId}
                      onSelect={() => onSelectChat(chat.id)}
                      onDelete={() => onDeleteChat(chat.id)}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {view === 'dashboard' && (
        <div className="flex-1 overflow-y-auto px-2 py-3">
          <p className="px-3 py-6 text-center text-xs text-neutral-400 dark:text-white/35">
            Switch tabs in the main area to manage your agent.
          </p>
        </div>
      )}
    </div>
  );
}

function ViewTab({
  label,
  Icon,
  active,
  onClick,
}: {
  label: string;
  Icon: typeof MessageSquare;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
        active
          ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
          : 'text-neutral-500 dark:text-white/55 hover:bg-neutral-100 dark:hover:bg-white/6'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function ChatRow({
  chat,
  active,
  onSelect,
  onDelete,
}: {
  chat: AgentChat;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative">
      <button
        onClick={onSelect}
        className={`w-full flex items-center gap-2 py-2 pl-2 pr-7 rounded-lg text-left transition-colors ${
          active
            ? 'bg-orange-500/15 text-orange-700 dark:text-orange-300'
            : 'text-neutral-700 dark:text-white/75 hover:bg-neutral-100 dark:hover:bg-white/6'
        }`}
      >
        <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
        <span className="flex-1 truncate text-xs">{chat.title}</span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-neutral-400 dark:text-white/35 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-500/10 transition-all"
        title="Delete chat"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}
