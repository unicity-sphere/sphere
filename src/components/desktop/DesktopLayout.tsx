import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { useDesktopState } from '../../hooks/useDesktopState';
import { useUIState } from '../../hooks/useUIState';
import { getAgentConfig, type AgentConfig } from '../../config/activities';
import { TabBar } from './TabBar';
import { DesktopShortcuts } from './DesktopShortcuts';
import { ChatSection } from '../chat/ChatSection';
import { DMChatSection } from '../chat/dm/DMChatSection';
import { GroupChatSection } from '../chat/group/GroupChatSection';
import { IframeAgent } from '../agents/IframeAgent';
import { WalletPanel } from '../wallet/WalletPanel';
import { WalletRequiredBlocker } from '../agents/WalletRequiredBlocker';
import { ActivityTicker } from '../activity';
import { Footer } from '../layout/Footer';
import { normalizeUrl } from '../../utils/normalizeUrl';

const CUSTOM_URL_PRESETS = [
  { label: 'Sphere Connect Example', url: 'https://unicity-sphere.github.io/sphere-sdk-connect-example/' },
];

export function DesktopLayout() {
  const navigate = useNavigate();
  const { openTabs, activeTabId, openTab, walletOpen, setWalletOpen } = useDesktopState();
  const { isFullscreen, toggleFullscreen, setFullscreen } = useUIState();
  const [customUrlInput, setCustomUrlInput] = useState('');

  // Auto-open wallet panel when payment request arrives
  useEffect(() => {
    const handlePaymentRequest = () => setWalletOpen(true);
    window.addEventListener('payment-requests-updated', handlePaymentRequest);
    return () => window.removeEventListener('payment-requests-updated', handlePaymentRequest);
  }, [setWalletOpen]);

  // Escape key exits fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setFullscreen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, setFullscreen]);

  const handleCustomUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = customUrlInput.trim();
    if (!input) return;
    const url = normalizeUrl(input);
    openTab('custom', { url, label: new URL(url).hostname });
    navigate(`/agents/custom?url=${encodeURIComponent(url)}`);
    setCustomUrlInput('');
  };

  const openCustomUrl = (url: string) => {
    const label = new URL(url).hostname;
    openTab('custom', { url, label });
    navigate(`/agents/custom?url=${encodeURIComponent(url)}`);
  };

  const renderTabContent = (tabId: string, appId: string, url?: string) => {
    const agent = getAgentConfig(appId);

    // Custom URL iframe tab
    if (url) {
      const customAgent: AgentConfig = {
        id: tabId,
        name: url,
        description: '',
        Icon: Globe,
        category: 'Custom',
        color: 'from-indigo-500 to-violet-600',
        type: 'iframe',
        iframeUrl: url,
      };
      return <IframeAgent agent={customAgent} />;
    }

    if (!agent) return null;

    switch (appId) {
      case 'dm':
        return (
          <WalletRequiredBlocker agentId={appId} onOpenWallet={() => setWalletOpen(true)}>
            <DMChatSection />
          </WalletRequiredBlocker>
        );
      case 'group-chat':
        return (
          <WalletRequiredBlocker agentId={appId} onOpenWallet={() => setWalletOpen(true)}>
            <GroupChatSection />
          </WalletRequiredBlocker>
        );
      case 'custom':
        return renderCustomUrlPrompt();
      default:
        if (agent.type === 'iframe') {
          return <IframeAgent agent={agent} />;
        }
        return <ChatSection />;
    }
  };

  const renderCustomUrlPrompt = () => (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 p-8 max-w-md w-full">
        <Globe className="w-12 h-12 text-neutral-400" />
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-[#fefefe]">Load Custom URL</h3>
        <p className="text-sm text-neutral-500 dark:text-[rgba(255,255,255,0.45)] text-center">
          Quick open or enter any URL
        </p>
        <div className="flex items-center gap-2">
          {CUSTOM_URL_PRESETS.map((preset) => (
            <button
              key={preset.url}
              onClick={() => openCustomUrl(preset.url)}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-neutral-100 dark:bg-[#111]/60 dark:backdrop-blur-sm text-neutral-700 dark:text-[#fefefe] hover:bg-orange-500 dark:hover:bg-brand-orange hover:text-white transition-colors border border-neutral-200 dark:border-[rgba(255,255,255,0.07)]"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-neutral-200 dark:bg-[rgba(255,255,255,0.07)]" />
          <span className="text-xs text-neutral-400">or</span>
          <div className="flex-1 h-px bg-neutral-200 dark:bg-[rgba(255,255,255,0.07)]" />
        </div>
        <form onSubmit={handleCustomUrlSubmit} className="w-full flex gap-2">
          <input
            type="text"
            value={customUrlInput}
            onChange={(e) => setCustomUrlInput(e.target.value)}
            placeholder="https://example.com or localhost:5174"
            className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1a1a1a]/60 dark:backdrop-blur-sm text-neutral-900 dark:text-[#fefefe] placeholder-neutral-400 dark:placeholder-[rgba(255,255,255,0.28)] focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:focus:ring-[rgba(255,111,0,0.4)] focus:border-orange-500 dark:focus:border-brand-orange"
            autoFocus
          />
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-medium rounded-xl bg-orange-500 dark:bg-brand-orange text-white hover:bg-orange-600 dark:hover:bg-brand-orange-dark transition-colors shadow-sm"
          >
            Open
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col overflow-hidden bg-white dark:bg-transparent ${
      isFullscreen ? 'fixed inset-0 z-99999' : 'h-full'
    }`}>
      {/* Activity ticker — hidden in fullscreen */}
      {!isFullscreen && (
        <div className="shrink-0 mt-0 sm:mt-2">
          <ActivityTicker />
        </div>
      )}

      {/* Horizontal tab bar */}
      <div className="shrink-0">
        <TabBar
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      </div>

      {/* Content + wallet row — single render to preserve state across breakpoints */}
      <div className="flex-1 min-h-0 flex mx-1">
          {/* Content + mobile wallet container */}
          <div className="flex-1 min-w-0 relative overflow-hidden rounded-2xl lg:overflow-visible">
            {/* Content area — mobile: absolute + slide, desktop: normal flow */}
            <div className={`absolute inset-0 lg:relative lg:h-full lg:rounded-2xl lg:overflow-hidden bg-white dark:bg-[#0a0a0a]/60 dark:backdrop-blur-sm transition-transform duration-300 ease-in-out lg:transition-none ${
              walletOpen ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'
            }`}>
              {activeTabId === null && <DesktopShortcuts />}
              {openTabs.map((tab) => (
                <div
                  key={tab.id}
                  className={tab.id === activeTabId ? 'h-full' : 'hidden'}
                >
                  {renderTabContent(tab.id, tab.appId, tab.url)}
                </div>
              ))}
            </div>
            {/* Wallet panel — mobile only: slides in from right */}
            <div
              data-tutorial="wallet-panel-mobile"
              className={`absolute inset-0 lg:hidden transition-transform duration-300 ease-in-out ${
                walletOpen ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              {/* Mobile off-canvas instance. Deliberately never autofocuses the
                  unlock field: both instances are mounted at once and React
                  cannot know which breakpoint is live, so only the desktop one
                  claims focus (graceful lock §8.3). */}
              <WalletPanel />
            </div>
          </div>

          {/* Wallet panel — desktop: inline side panel with slide transition */}
          <div
            data-tutorial="wallet-panel"
            className={`hidden lg:block shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden rounded-2xl ml-1 ${
              walletOpen ? 'w-88 xl:w-104' : 'w-0'
            }`}
          >
            <div className="w-88 xl:w-104 h-full">
              <WalletPanel autoFocusUnlock={walletOpen} />
            </div>
          </div>
        </div>

        {/* Footer with social icons — hidden on mobile */}
        {!isFullscreen && <div className="hidden lg:block"><Footer /></div>}
    </div>
  );
}
