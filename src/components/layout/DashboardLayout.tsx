import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Header } from './Header';
import { UxfBanner } from '../uxf';
import { IS_UXF_BUILD } from '../../config/uxf';
import { MiniChatBubbles } from '../chat/mini';
import { CallProvider, CallOverlay } from '../chat/telco';
import { MobileBottomNav } from '../mobile';
import { useUIState } from '../../hooks/useUIState';
import { useDesktopState } from '../../hooks/useDesktopState';
import { useMobileNav } from '../../hooks/useMobileNav';
import { TutorialOverlay } from '../tutorial/TutorialOverlay';
import { useTutorial } from '../../hooks/useTutorial';
import { useDeepLinkNavigation } from '../../hooks/useDeepLinkNavigation';
import bgVideoUrl from '/kling_20260226_VIDEO_Take_Image_1650_0.mp4';
import bgPosterUrl from '/bg-poster.webp';

export function DashboardLayout() {
  const location = useLocation();
  const isMinePage = location.pathname === '/mine';
  const { isFullscreen, setFullscreen } = useUIState();
  const { activeTabId } = useDesktopState();
  const tutorial = useTutorial();
  const { isMobile } = useMobileNav();
  useDeepLinkNavigation();
  const [videoReady, setVideoReady] = useState(false);

  // Mobile fullscreen escape: only fires on the desktop→mobile viewport transition.
  // A reactive `if (isMobile && isFullscreen) setFullscreen(false)` would run on
  // every mobile render, permanently locking out any future mobile fullscreen
  // use case. By gating on the prev-value transition, we preserve the escape
  // hatch (user shrinks browser mid-session) without blocking the state entirely.
  const prevIsMobileRef = useRef(isMobile);
  useEffect(() => {
    const wasDesktop = !prevIsMobileRef.current;
    const becameMobile = isMobile;
    prevIsMobileRef.current = isMobile;
    if (wasDesktop && becameMobile && isFullscreen) {
      setFullscreen(false);
    }
  }, [isMobile, isFullscreen, setFullscreen]);

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
        {IS_UXF_BUILD && <UxfBanner />}
        {!isFullscreen && <Header />}
        <div className={`flex-1 min-h-0 flex relative ${!isAgentPage ? 'overflow-y-auto overflow-x-hidden' : ''}`}>
          <div className={`flex-1 w-full ${
            isFullscreen
              ? 'p-0'
              : isAgentPage
                ? 'px-0 sm:px-12 lg:px-28 pb-mobile-nav lg:pb-0'
                : 'px-0 sm:px-12 lg:px-28 pt-4 md:pt-8 pb-mobile-nav lg:pb-8'
          } ${isMinePage ? 'bg-neutral-100 dark:bg-transparent' : ''}`}>
            <Outlet />
          </div>
        </div>

        {/* Mini chat bubbles - hidden when DM tab is active */}
        {showMiniChat && <MiniChatBubbles />}

        {/* Mobile bottom navigation */}
        <MobileBottomNav />

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
