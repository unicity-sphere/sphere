/**
 * The write side (InstalledProjectIcon, ProjectPage) gates a project's
 * appUrl/websiteUrl with isHttpsUrl before ever calling openTab. That closes
 * the write side only: `openTabs` is restored from localStorage by
 * useDesktopState's loadState(), which is user-writable via devtools
 * regardless of what our code writes, and a tab persisted BEFORE those
 * write-side gates existed would otherwise still reach the iframe unchanged
 * on every load from now on. DesktopLayout's renderTabContent must re-check
 * `tab.url` with isHttpsUrl before turning it into IframeAgent's `iframeUrl`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { STORAGE_KEYS } from '../../../src/config/storageKeys';
import type { AgentConfig } from '../../../src/config/activities';

// jsdom does not implement window.matchMedia; useDesktopState/useUIState read
// it at module load (defaultState.walletOpen) and on every render, so it must
// be stubbed before those modules — and DesktopLayout, which imports them —
// are evaluated. vi.hoisted runs before the imports below.
vi.hoisted(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

// Everything except useDesktopState/useUIState is stubbed: this test exercises
// the real renderTabContent gate, not the chrome around it. IframeAgent is
// replaced with a thin probe that exposes what `src` it would have received.
vi.mock('../../../src/components/desktop/TabBar', () => ({ TabBar: () => null }));
vi.mock('../../../src/components/desktop/DesktopShortcuts', () => ({ DesktopShortcuts: () => null }));
vi.mock('../../../src/components/chat/ChatSection', () => ({ ChatSection: () => null }));
vi.mock('../../../src/components/chat/dm/DMChatSection', () => ({ DMChatSection: () => null }));
vi.mock('../../../src/components/chat/group/GroupChatSection', () => ({ GroupChatSection: () => null }));
vi.mock('../../../src/components/wallet/WalletPanel', () => ({ WalletPanel: () => null }));
vi.mock('../../../src/components/agents/WalletRequiredBlocker', () => ({
  WalletRequiredBlocker: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('../../../src/components/activity', () => ({ ActivityTicker: () => null }));
vi.mock('../../../src/components/layout/Footer', () => ({ Footer: () => null }));
vi.mock('../../../src/components/agents/IframeAgent', () => ({
  IframeAgent: ({ agent }: { agent: AgentConfig }) => (
    <iframe data-testid="mock-iframe" src={agent.iframeUrl} title={agent.name} />
  ),
}));

import { DesktopLayout } from '../../../src/components/desktop/DesktopLayout';

function Wrapper({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

// Writes a persisted desktop-state exactly like loadState() reads it —
// simulating a tab that reached localStorage before the write-side gate
// existed (or one hand-edited via devtools), bypassing openTab entirely.
function persistTab(url: string) {
  localStorage.setItem(
    STORAGE_KEYS.DESKTOP_STATE,
    JSON.stringify({
      openTabs: [{ id: 'custom-1', appId: 'custom', label: 'Persisted', url }],
      activeTabId: 'custom-1',
    }),
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('DesktopLayout — https gate on a persisted tab.url read from localStorage', () => {
  it('does not render an iframe for a persisted javascript: url, and shows the custom-URL prompt instead', () => {
    persistTab('javascript:alert(1)');
    render(<DesktopLayout />, { wrapper: Wrapper });

    expect(screen.queryByTestId('mock-iframe')).toBeNull();
    // Same fallback a custom tab with no URL yet already shows — not a new
    // empty state invented for this gate.
    expect(screen.getByText('Load Custom URL')).toBeTruthy();
  });

  it('does not render an iframe for a persisted http:// url, and shows the custom-URL prompt instead', () => {
    persistTab('http://evil.example.com');
    render(<DesktopLayout />, { wrapper: Wrapper });

    expect(screen.queryByTestId('mock-iframe')).toBeNull();
    expect(screen.getByText('Load Custom URL')).toBeTruthy();
  });

  it('still renders the iframe for a normal persisted https:// url', () => {
    persistTab('https://app.example.com');
    render(<DesktopLayout />, { wrapper: Wrapper });

    const iframe = screen.getByTestId('mock-iframe') as HTMLIFrameElement;
    expect(iframe.getAttribute('src')).toBe('https://app.example.com');
  });
});
