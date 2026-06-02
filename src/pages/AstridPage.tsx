import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAgent } from '../hooks/useAgent';
import { AgentOnboardingFlow } from '../components/agent-onboarding/AgentOnboardingFlow';
import { AstridSidebar, type AstridView } from '../components/astrid/AstridSidebar';
import { AstridChat } from '../components/astrid/AstridChat';
import { AstridChatPlaceholder } from '../components/astrid/AstridChatPlaceholder';
import { AstridDashboard } from '../components/astrid/AstridDashboard';

export function AstridPage() {
  const navigate = useNavigate();
  const { onboardingCompleted, config, chats, createChat, deleteChat } = useAgent();

  const [view, setView] = useState<AstridView>('chat');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  if (!onboardingCompleted || !config) {
    return (
      <div className="flex flex-col h-full w-full overflow-y-auto">
        <AgentOnboardingFlow
          onComplete={() => {
            // Stay on /astrid; component will re-render with config available
          }}
          onSkip={() => navigate('/home')}
        />
      </div>
    );
  }

  const handleNewChat = () => {
    const chat = createChat();
    setActiveChatId(chat.id);
    setView('chat');
  };

  const handleDeleteChat = (id: string) => {
    deleteChat(id);
    if (activeChatId === id) setActiveChatId(null);
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      <AstridSidebar
        view={view}
        onViewChange={setView}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={(id) => {
          setActiveChatId(id);
          setView('chat');
        }}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        agentName={config.name}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {view === 'chat' ? (
          activeChatId ? (
            <AstridChat chatId={activeChatId} />
          ) : (
            <AstridChatPlaceholder agentName={config.name} onStart={handleNewChat} />
          )
        ) : (
          <AstridDashboard />
        )}
      </div>
    </div>
  );
}
