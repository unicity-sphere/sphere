import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// vi.mock factories are hoisted above regular top-level `const`s, so the mock
// referenced inside the factory below must itself be created via vi.hoisted
// to avoid a TDZ ReferenceError when ProjectPage's import of useMarketplace
// is resolved.
const { useProject, openTab } = vi.hoisted(() => ({
  useProject: vi.fn(),
  openTab: vi.fn(),
}));

vi.mock('../../../src/hooks/useMarketplace', () => ({
  useProject:         (...args: unknown[]) => useProject(...args),
  useProjectQuests:   () => ({ data: [] }),
  useProjectMetrics:  () => ({ data: undefined }),
}));
vi.mock('../../../src/hooks/useDesktopState', () => ({
  useDesktopState: () => ({ openTab }),
}));
vi.mock('../../../src/hooks/useInstalledProjects', () => ({
  useInstalledProjects: () => ({ isInstalled: () => false, toggle: vi.fn() }),
}));
vi.mock('../../../src/components/marketplace/ProjectReviewsSection', () => ({
  ProjectReviewsSection: () => null,
}));

import { ProjectPage } from '../../../src/pages/ProjectPage';
import { PROJECT_TYPES } from '../../../src/utils/isStandalone';

function renderProjectPage(over: Record<string, unknown>) {
  useProject.mockReturnValue({
    data: {
      _id: 'p1', slug: 'agent-guild', name: 'Agent Guild', tagline: 't', description: 'd',
      type: PROJECT_TYPES.APP, appUrl: null, websiteUrl: null, repoUrl: null, installCommand: null,
      logoUrl: null, bannerUrl: null, accentColor: '#FF6F00', category: 'tool',
      // Non-skill types (app/standalone) render a "Completions" stat that reads
      // stats.totalCompletions directly (see ProjectPage.tsx) — it must be
      // present in the mock or the page crashes before any assertion runs.
      tags: [], media: [], socialLinks: {}, stats: { totalUsers: 0, activeQuests: 0, totalCompletions: 0, rating: 0, ratingCount: 0 },
      ...over,
    },
    isLoading: false,
  });
  return render(
    <MemoryRouter initialEntries={['/apps/agent-guild']}>
      <Routes><Route path="/apps/:slug" element={<ProjectPage />} /></Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => { vi.clearAllMocks(); });

describe('ProjectPage actions for a standalone project', () => {
  it('offers the repository instead of launching an app', () => {
    renderProjectPage({ type: PROJECT_TYPES.STANDALONE, repoUrl: 'https://github.com/owner/repo' });
    const link = screen.getByRole('link', { name: /Open repository/i });
    expect(link.getAttribute('href')).toBe('https://github.com/owner/repo');
    expect(screen.queryByText(/Open App/i)).toBeNull();
  });

  it('shows the install command as a copyable line', () => {
    renderProjectPage({ type: PROJECT_TYPES.STANDALONE, repoUrl: 'https://github.com/owner/repo', installCommand: 'npx agent-guild' });
    expect(screen.getByText('npx agent-guild')).toBeTruthy();
    expect(screen.getByRole('button', { name: /copy install command/i })).toBeTruthy();
  });

  it('leaves an app project alone', () => {
    renderProjectPage({ type: PROJECT_TYPES.APP, appUrl: 'https://app.example.com' });
    expect(screen.getByText(/Open App/i)).toBeTruthy();
    expect(screen.queryByText(/Open repository/i)).toBeNull();
  });
});

// Both repoUrl and websiteUrl are server-supplied strings rendered straight
// into an anchor's href on this page, in the wallet's own origin. A stored
// `javascript:` (or otherwise non-https) value must never reach the DOM as
// a clickable link — render nothing rather than a dangerous link.
describe('ProjectPage renders only vetted https:// links', () => {
  it('does not render Open repository for a javascript: repoUrl', () => {
    renderProjectPage({ type: PROJECT_TYPES.STANDALONE, repoUrl: 'javascript:alert(1)' });
    expect(screen.queryByRole('link', { name: /Open repository/i })).toBeNull();
  });

  it('does not render Open repository for an http:// repoUrl', () => {
    renderProjectPage({ type: PROJECT_TYPES.STANDALONE, repoUrl: 'http://example.com/owner/repo' });
    expect(screen.queryByRole('link', { name: /Open repository/i })).toBeNull();
  });

  it('renders Open repository for a normal https:// repoUrl', () => {
    renderProjectPage({ type: PROJECT_TYPES.STANDALONE, repoUrl: 'https://github.com/owner/repo' });
    const link = screen.getByRole('link', { name: /Open repository/i });
    expect(link.getAttribute('href')).toBe('https://github.com/owner/repo');
  });

  it('does not render Website for a javascript: websiteUrl', () => {
    renderProjectPage({ type: PROJECT_TYPES.APP, websiteUrl: 'javascript:alert(1)' });
    expect(screen.queryByRole('link', { name: /Website/i })).toBeNull();
  });

  it('does not render Website for an http:// websiteUrl', () => {
    renderProjectPage({ type: PROJECT_TYPES.APP, websiteUrl: 'http://example.com' });
    expect(screen.queryByRole('link', { name: /Website/i })).toBeNull();
  });

  it('renders Website for a normal https:// websiteUrl', () => {
    renderProjectPage({ type: PROJECT_TYPES.APP, websiteUrl: 'https://example.com' });
    const link = screen.getByRole('link', { name: /Website/i });
    expect(link.getAttribute('href')).toBe('https://example.com');
  });
});

// appUrl reaches the most dangerous sink in this app: handleAddToDesktop hands
// it to openTab, which persists it into DesktopTab.url in localStorage;
// DesktopLayout turns that into iframeUrl and IframeAgent renders
// <iframe src={activeUrl}> with no sandbox attribute. A `javascript:` (or any
// non-https) value reaching that src runs with the wallet's own origin. The
// "Open App" button must be gated on isHttpsUrl, not just truthiness, and
// handleAddToDesktop itself must refuse to store an unsafe URL.
describe('ProjectPage — https gate on the appUrl -> openTab/iframe sink', () => {
  it('does not render Open App for a javascript: appUrl', () => {
    renderProjectPage({ type: PROJECT_TYPES.APP, appUrl: 'javascript:alert(1)' });
    expect(screen.queryByRole('button', { name: /Open App/i })).toBeNull();
    expect(openTab).not.toHaveBeenCalled();
  });

  it('does not render Open App for an http:// appUrl', () => {
    renderProjectPage({ type: PROJECT_TYPES.APP, appUrl: 'http://app.example.com' });
    expect(screen.queryByRole('button', { name: /Open App/i })).toBeNull();
    expect(openTab).not.toHaveBeenCalled();
  });

  it('still renders Open App and calls openTab for a normal https:// appUrl', () => {
    renderProjectPage({ type: PROJECT_TYPES.APP, appUrl: 'https://app.example.com' });
    fireEvent.click(screen.getByRole('button', { name: /Open App/i }));
    expect(openTab).toHaveBeenCalledWith('custom', { url: 'https://app.example.com', label: 'Agent Guild' });
  });
});
