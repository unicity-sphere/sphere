import { useEffect } from 'react';
import { useParams, useSearchParams, Navigate } from 'react-router-dom';
import { getAgentConfig } from '../config/activities';
import { useDesktopState } from '../hooks/useDesktopState';
import { normalizeUrl } from '../utils/normalizeUrl';

export function AgentPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const [searchParams] = useSearchParams();
  const { openTab, activeTabId } = useDesktopState();

  // Extract URL param as a stable string for the dependency array
  const customUrl = agentId === 'custom' ? searchParams.get('url') : null;

  // Sync URL → desktop state: when URL says a specific agent, open it as a tab
  useEffect(() => {
    if (!agentId) return;

    // Custom agent with ?url= parameter — open iframe directly.
    // Normalize the scheme first (a bare host like "boxy-run.fly.dev" would make
    // `new URL()` throw, falling back to the prompt) so it matches the in-app
    // prompt path, which already prepends a scheme via normalizeUrl.
    if (agentId === 'custom' && customUrl) {
      try {
        const url = normalizeUrl(customUrl);
        openTab('custom', { url, label: new URL(url).hostname });
      } catch {
        // Invalid URL — fall through to open the custom URL prompt
        openTab(agentId);
      }
      return;
    }

    if (agentId !== activeTabId) {
      openTab(agentId);
    }
  }, [agentId, customUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect to home if invalid agent ID (except custom which is always valid)
  if (agentId && agentId !== 'custom' && !getAgentConfig(agentId)) {
    return <Navigate to="/home" replace />;
  }

  // DesktopLayout is rendered by the shared DesktopShell (see #455); this route
  // only syncs the URL into desktop state.
  return null;
}
