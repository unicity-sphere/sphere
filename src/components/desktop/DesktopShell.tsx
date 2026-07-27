import { Outlet } from 'react-router-dom';
import { DesktopLayout } from './DesktopLayout';

/**
 * Shared route element for the desktop (/home) and its agent tabs
 * (/agents/:agentId). It renders {@link DesktopLayout} ONCE, so navigating
 * between the desktop and a tab keeps DesktopLayout mounted — preserving the
 * hidden-but-mounted open tabs (and their iframes) it deliberately holds.
 *
 * The child routes (HomePage / AgentPage) only run their URL -> desktop-state
 * sync effects and render nothing into the Outlet. See #455.
 */
export function DesktopShell() {
  return (
    <>
      <DesktopLayout />
      <Outlet />
    </>
  );
}
