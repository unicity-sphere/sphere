import { X, LayoutGrid, Wallet, Maximize2, Minimize2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDesktopState } from '../../hooks/useDesktopState';
import { getAgentConfig } from '../../config/activities';
import { useDmUnreadCount } from '../chat/hooks/useDmUnreadCount';
import { useGroupUnreadCount } from '../chat/hooks/useGroupUnreadCount';

interface SidebarProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function Sidebar({ isFullscreen, onToggleFullscreen }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { openTabs, activeTabId, activateTab, closeTab, showDesktop, walletOpen, toggleWallet } = useDesktopState();
  const dmUnreadCount = useDmUnreadCount();
  const groupUnreadCount = useGroupUnreadCount();
  const isAstridActive = location.pathname.startsWith('/astrid');

  const handleActivateTab = (tab: { id: string; appId: string; url?: string }) => {
    activateTab(tab.id);
    if (tab.url) {
      navigate(`/agents/custom?url=${encodeURIComponent(tab.url)}`);
    } else {
      navigate(`/agents/${tab.appId}`);
    }
  };

  const handleShowDesktop = () => {
    showDesktop();
    navigate('/home');
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const idx = openTabs.findIndex((t) => t.id === tabId);
    const isActive = tabId === activeTabId;
    closeTab(tabId);

    if (isActive) {
      const remaining = openTabs.filter((t) => t.id !== tabId);
      const neighbor = remaining[Math.min(idx, remaining.length - 1)];
      if (neighbor) {
        if (neighbor.url) {
          navigate(`/agents/custom?url=${encodeURIComponent(neighbor.url)}`);
        } else {
          navigate(`/agents/${neighbor.appId}`);
        }
      } else {
        navigate('/home');
      }
    }
  };

  const getBadge = (appId: string): number => {
    if (appId === 'dm') return dmUnreadCount;
    if (appId === 'group-chat') return groupUnreadCount;
    return 0;
  };

  return (
    <div
      data-tutorial="tab-bar"
      className="flex flex-col items-center gap-2 py-3 px-1.5 bg-white/60 dark:bg-[rgba(10,10,10,0.5)] backdrop-blur-xl border-r border-neutral-200 dark:border-[rgba(255,255,255,0.07)] shrink-0 h-full w-14 overflow-y-auto scrollbar-hide"
    >
      {/* Apps button — show desktop */}
      <motion.button
        data-tutorial="show-desktop"
        onClick={handleShowDesktop}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="w-10 h-10 rounded-full bg-linear-to-br from-orange-500 to-orange-600 dark:from-brand-orange dark:to-brand-orange-dark flex items-center justify-center text-white shadow-md shadow-orange-500/20 dark:shadow-[rgba(255,111,0,0.25)] shrink-0"
        title="Apps"
      >
        <LayoutGrid className="w-4 h-4" />
      </motion.button>

      {/* Astrid — pinned shortcut */}
      <div className="relative group shrink-0">
        <motion.button
          onClick={() => navigate('/astrid')}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-150 ${
            isAstridActive
              ? 'bg-orange-500 dark:bg-brand-orange text-white shadow-sm shadow-orange-500/25'
              : 'text-neutral-500 dark:text-[rgba(255,255,255,0.45)] hover:bg-neutral-200/60 dark:hover:bg-brand-orange-dim'
          }`}
          title="Astrid"
        >
          <Sparkles className="w-4 h-4" />
        </motion.button>
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md bg-neutral-900 dark:bg-neutral-800 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
          Astrid
        </div>
      </div>

      {/* Divider */}
      <div className="w-6 h-px bg-neutral-200 dark:bg-[rgba(255,255,255,0.08)] shrink-0" />

      {/* Open app icons */}
      {openTabs.map((tab) => {
        const isActiveTab = tab.id === activeTabId;
        const agent = getAgentConfig(tab.appId);
        const TabIcon = agent?.Icon;
        const badge = getBadge(tab.appId);

        return (
          <div key={tab.id} className="relative group shrink-0">
            <motion.button
              onClick={() => handleActivateTab(tab)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-150 ${
                isActiveTab
                  ? 'bg-orange-500 dark:bg-brand-orange text-white shadow-sm shadow-orange-500/25'
                  : 'text-neutral-500 dark:text-[rgba(255,255,255,0.45)] hover:bg-neutral-200/60 dark:hover:bg-brand-orange-dim'
              }`}
              title={tab.label}
            >
              {TabIcon && <TabIcon className="w-4 h-4" />}
            </motion.button>

            {/* Unread badge */}
            {badge > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 flex items-center justify-center text-[9px] font-bold rounded-full bg-orange-500 dark:bg-brand-orange text-white pointer-events-none">
                {badge > 99 ? '99+' : badge}
              </span>
            )}

            {/* Close button — appears on hover */}
            <button
              onClick={(e) => handleCloseTab(e, tab.id)}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-neutral-700 dark:bg-neutral-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              title={`Close ${tab.label}`}
            >
              <X className="w-2.5 h-2.5" />
            </button>

            {/* Tooltip — appears to the right on hover */}
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md bg-neutral-900 dark:bg-neutral-800 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              {tab.label}
            </div>
          </div>
        );
      })}

      {/* Bottom controls — pushed to bottom */}
      <div className="mt-auto flex flex-col items-center gap-1.5 shrink-0">
        {/* Fullscreen toggle */}
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150 ${
              isFullscreen
                ? 'bg-orange-500/15 dark:bg-brand-orange-glass text-orange-500 dark:text-brand-orange'
                : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-[#fefefe] hover:bg-neutral-200/60 dark:hover:bg-brand-orange-dim'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Wallet toggle */}
        <button
          data-tutorial="wallet-toggle"
          onClick={toggleWallet}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150 ${
            walletOpen
              ? 'bg-orange-500/15 text-orange-500'
              : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/40'
          }`}
          title={walletOpen ? 'Hide Wallet' : 'Show Wallet'}
        >
          <Wallet className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
