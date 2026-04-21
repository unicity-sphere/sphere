import { motion } from 'framer-motion';
import { Home, MessageCircle, Wallet, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMobileNav, type MobileView } from '../../hooks/useMobileNav';
import { useDesktopState } from '../../hooks/useDesktopState';
import { useDmUnreadCount } from '../chat/hooks/useDmUnreadCount';

interface NavTab {
  id: MobileView;
  label: string;
  icon: typeof Home;
}

const tabs: NavTab[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'apps', label: 'Apps', icon: LayoutGrid },
];

export function MobileBottomNav() {
  const { activeView, setActiveView } = useMobileNav();
  const { showDesktop } = useDesktopState();
  const navigate = useNavigate();
  const unreadCount = useDmUnreadCount();

  const handleTap = (id: MobileView) => {
    setActiveView(id);
    if (id === 'home' || id === 'apps') {
      navigate('/home');
      showDesktop();
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[200] lg:hidden safe-area-bottom bg-white/90 dark:bg-[#060606]/90 backdrop-blur-xl border-t border-neutral-200 dark:border-[rgba(255,255,255,0.07)]">
      <div className="flex items-stretch h-16">
        {tabs.map((tab) => {
          const isActive = activeView === tab.id;
          const Icon = tab.icon;
          return (
            <motion.button
              key={tab.id}
              onClick={() => handleTap(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive
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
