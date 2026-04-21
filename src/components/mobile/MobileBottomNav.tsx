import { motion } from 'framer-motion';
import { Home, MessageCircle, Wallet } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDesktopState } from '../../hooks/useDesktopState';
import { useVisualViewport } from '../../hooks/useVisualViewport';
import { useDmUnreadCount } from '../chat/hooks/useDmUnreadCount';

type TabId = 'home' | 'messages' | 'wallet';

interface NavTab {
  id: TabId;
  label: string;
  icon: typeof Home;
}

const tabs: NavTab[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
];

export function MobileBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { activeTabId, walletOpen, openTab, showDesktop, setWalletOpen } = useDesktopState();
  const { isKeyboardOpen } = useVisualViewport();
  const unreadCount = useDmUnreadCount();

  // Derive active tab from existing state. Wallet wins, then DM tab, then desktop (home).
  const onDesktop = pathname === '/home' && activeTabId === null && !walletOpen;
  const isHomeActive = onDesktop;
  const isMessagesActive = activeTabId === 'dm' && !walletOpen;
  const isWalletActive = walletOpen;

  const handleTap = (id: TabId) => {
    switch (id) {
      case 'home':
        if (pathname !== '/home') navigate('/home', { replace: true });
        if (walletOpen) setWalletOpen(false);
        if (!onDesktop) showDesktop();
        break;
      case 'messages':
        if (pathname !== '/agents/dm') navigate('/agents/dm', { replace: true });
        if (walletOpen) setWalletOpen(false);
        openTab('dm');
        break;
      case 'wallet':
        setWalletOpen(true);
        break;
    }
  };

  const isActive = (id: TabId): boolean => {
    switch (id) {
      case 'home':
        return isHomeActive;
      case 'messages':
        return isMessagesActive;
      case 'wallet':
        return isWalletActive;
    }
  };

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-[150] lg:hidden safe-area-bottom bg-white/90 dark:bg-[#060606]/90 backdrop-blur-xl border-t border-neutral-200 dark:border-[rgba(255,255,255,0.07)] transition-transform ${
        isKeyboardOpen ? 'translate-y-full' : 'translate-y-0'
      }`}
    >
      <div className="flex items-stretch h-16">
        {tabs.map((tab) => {
          const active = isActive(tab.id);
          const Icon = tab.icon;
          return (
            <motion.button
              key={tab.id}
              onClick={() => handleTap(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active
                  ? 'text-orange-500 dark:text-orange-400'
                  : 'text-neutral-400 dark:text-[rgba(255,255,255,0.35)]'
              }`}
              whileTap={{ scale: 0.9 }}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {tab.id === 'messages' && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-bold px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
