import { Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Header } from './Header';
import { MiniChatBubbles } from '../chat/mini';
import { CallProvider, CallOverlay } from '../chat/telco';
import { useUIState } from '../../hooks/useUIState';
import { useDesktopState } from '../../hooks/useDesktopState';
import { TutorialOverlay } from '../tutorial/TutorialOverlay';
import { useTutorial } from '../../hooks/useTutorial';
import { useDeepLinkNavigation } from '../../hooks/useDeepLinkNavigation';
import bgVideoUrl from '/kling_20260226_VIDEO_Take_Image_1650_0.mp4';
import bgPosterUrl from '/bg-poster.webp';

export function DashboardLayout() {
  const location = useLocation();
  const isMinePage = location.pathname === '/mine';
  const { isFullscreen } = useUIState();
  const { activeTabId } = useDesktopState();
  const tutorial = useTutorial();
  useDeepLinkNavigation();
  const [videoReady, setVideoReady] = useState(false);

  // Hide mini chat when the DM tab is actively open (to avoid duplicate UI)
  const isAgentPage = location.pathname === '/home' || location.pathname.startsWith('/agents/');
  const isDmTabActive = isAgentPage && activeTabId === 'dm';
  const showMiniChat = !isDmTabActive;

  return (
    <div className="h-full flex flex-col bg-neutral-100 dark:bg-[#060606] theme-transition overflow-hidden relative">
      {/* Video background — dark mode only */}
      <div className="hidden dark:block fixed inset-0 z-0 pointer-events-none">
        {/* Static poster shown instantly while video loads */}
        {!videoReady && (
          <img src={bgPosterUrl} alt="" className="w-full h-full object-cover" />
        )}
        <video
          className={`w-full h-full object-cover ${!videoReady ? 'hidden' : ''}`}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          src={bgVideoUrl}
          onCanPlayThrough={() => setVideoReady(true)}
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Grid overlay — dark mode only */}
      <div
        className="hidden dark:block fixed inset-0 z-1 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content — above background layers */}
      <div className="relative z-10 flex flex-col h-full">
        <CallProvider>
        {!isFullscreen && <Header />}
        <div className={`flex-1 min-h-0 flex ${!isAgentPage ? 'overflow-y-auto overflow-x-hidden' : ''}`}>
          <div className={`flex-1 w-full ${isFullscreen ? 'p-0' : isAgentPage ? 'px-0 sm:px-12 lg:px-28 pb-0' : 'px-0 sm:px-12 lg:px-28 pt-4 pb-0 md:pt-8 lg:pb-8'} ${
            isMinePage ? 'bg-neutral-100 dark:bg-transparent' : ''
          }`}>
            <Outlet />
          </div>
        </div>

        {/* Mini chat bubbles - hidden when DM tab is active */}
        {showMiniChat && <MiniChatBubbles />}

        {/* Onboarding tutorial overlay */}
        {isAgentPage && tutorial.isActive && (
          <TutorialOverlay
            isActive={tutorial.isActive}
            currentStep={tutorial.currentStep}
            currentStepIndex={tutorial.currentStepIndex}
            totalSteps={tutorial.totalSteps}
            isLastStep={tutorial.isLastStep}
            onNext={tutorial.next}
            onDismiss={tutorial.dismiss}
          />
        )}
        <CallOverlay />
        </CallProvider>
      </div>
    </div>
  );
}
