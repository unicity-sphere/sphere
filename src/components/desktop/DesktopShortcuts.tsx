import { useNavigate } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { agents, type AgentConfig } from '../../config/activities';
import { useDesktopState } from '../../hooks/useDesktopState';
import { useRemoteApps, type RemoteApp } from '../../hooks/useRemoteApps';
import { useDmUnreadCount } from '../chat/hooks/useDmUnreadCount';
import { useGroupUnreadCount } from '../chat/hooks/useGroupUnreadCount';
import { DesktopIcon } from './DesktopIcon';

// Consistent gradient palette for remote app categories
const CATEGORY_COLORS: Record<string, string> = {
  games: 'from-emerald-500 to-teal-500',
  dev: 'from-amber-500 to-orange-500',
  defi: 'from-violet-500 to-purple-500',
  social: 'from-pink-500 to-rose-500',
  tools: 'from-sky-500 to-blue-500',
};
const DEFAULT_REMOTE_COLOR = 'from-slate-500 to-zinc-500';

function remoteAppToAgent(app: RemoteApp): AgentConfig {
  return {
    id: `remote-${app.url}`,
    name: app.name,
    description: app.name,
    Icon: Globe,
    category: app.category,
    color: CATEGORY_COLORS[app.category.toLowerCase()] ?? DEFAULT_REMOTE_COLOR,
    type: 'iframe',
    iframeUrl: app.url,
  };
}

function formatCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function DesktopShortcuts() {
  const navigate = useNavigate();
  const { openTabs, openTab } = useDesktopState();
  const dmUnreadCount = useDmUnreadCount();
  const groupUnreadCount = useGroupUnreadCount();
  const { data: remoteApps } = useRemoteApps();

  const openAppIds = new Set(openTabs.map((t) => t.appId));

  const getBadge = (agentId: string): number | undefined => {
    if (agentId === 'dm') return dmUnreadCount || undefined;
    if (agentId === 'group-chat') return groupUnreadCount || undefined;
    return undefined;
  };

  const handleRemoteAppClick = (app: RemoteApp) => {
    const label = app.name;
    openTab('custom', { url: app.url, label });
    navigate(`/agents/custom?url=${encodeURIComponent(app.url)}`);
  };

  // Group built-in agents by category
  const builtInByCategory = new Map<string, AgentConfig[]>();
  for (const agent of agents) {
    const cat = agent.category;
    if (!builtInByCategory.has(cat)) builtInByCategory.set(cat, []);
    builtInByCategory.get(cat)!.push(agent);
  }

  // Group remote apps by category
  const remoteByCategory = new Map<string, RemoteApp[]>();
  if (remoteApps) {
    for (const app of remoteApps) {
      const cat = formatCategory(app.category);
      if (!remoteByCategory.has(cat)) remoteByCategory.set(cat, []);
      remoteByCategory.get(cat)!.push(app);
    }
  }

  // Collect all category names preserving built-in order first, then remote
  const allCategories: string[] = [];
  for (const cat of builtInByCategory.keys()) {
    allCategories.push(cat);
  }
  for (const cat of remoteByCategory.keys()) {
    if (!allCategories.includes(cat)) allCategories.push(cat);
  }

  return (
    <div data-tutorial="desktop-shortcuts" className="absolute inset-0 overflow-auto flex flex-col">
      <div className="relative flex-1 px-6 pt-6 sm:px-10 sm:pt-8 pb-8 space-y-6">
        {allCategories.map((category) => {
          const builtIn = builtInByCategory.get(category) ?? [];
          const remote = remoteByCategory.get(category) ?? [];
          if (builtIn.length === 0 && remote.length === 0) return null;

          return (
            <section key={category}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-[rgba(255,255,255,0.3)] mb-3 px-1">
                {category}
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1 sm:gap-3">
                {builtIn.map((agent) => (
                  <DesktopIcon
                    key={agent.id}
                    agent={agent}
                    isOpen={openAppIds.has(agent.id)}
                    badge={getBadge(agent.id)}
                    onClick={() => navigate(`/agents/${agent.id}`)}
                  />
                ))}
                {remote.map((app) => (
                  <DesktopIcon
                    key={app.url}
                    agent={remoteAppToAgent(app)}
                    iconUrl={app.icon}
                    tooltip={app.description}
                    isOpen={openTabs.some((t) => t.url === app.url)}
                    onClick={() => handleRemoteAppClick(app)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
