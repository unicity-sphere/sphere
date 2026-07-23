import { useEffect } from 'react';
import { useDesktopState } from '../hooks/useDesktopState';

/**
 * Route sync for /home. DesktopLayout is rendered by the shared DesktopShell
 * (see #455), so this only resets to the desktop (no active tab) and renders
 * nothing itself.
 */
export function HomePage() {
  const { activeTabId, showDesktop } = useDesktopState();

  // Always show desktop (no active tab) when navigating to /home
  useEffect(() => {
    if (activeTabId !== null) {
      showDesktop();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
