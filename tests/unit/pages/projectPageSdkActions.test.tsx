import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// vi.mock factories are hoisted above regular top-level `const`s, so the mock
// referenced inside the factory below must itself be created via vi.hoisted
// to avoid a TDZ ReferenceError when ProjectPage's import of useMarketplace
// is resolved.
const { useProject } = vi.hoisted(() => ({
  useProject: vi.fn(),
}));

vi.mock('../../../src/hooks/useMarketplace', () => ({
  useProject:         (...args: unknown[]) => useProject(...args),
  useProjectQuests:   () => ({ data: [] }),
  useProjectMetrics:  () => ({ data: undefined }),
}));
vi.mock('../../../src/hooks/useDesktopState', () => ({
  useDesktopState: () => ({ openTab: vi.fn() }),
}));
vi.mock('../../../src/hooks/useInstalledProjects', () => ({
  useInstalledProjects: () => ({ isInstalled: () => false, toggle: vi.fn() }),
}));
vi.mock('../../../src/components/marketplace/ProjectReviewsSection', () => ({
  ProjectReviewsSection: () => null,
}));

import { ProjectPage } from '../../../src/pages/ProjectPage';

function renderProjectPage(over: Record<string, unknown>) {
  useProject.mockReturnValue({
    data: {
      _id: 'p1', slug: 'agent-guild', name: 'Agent Guild', tagline: 't', description: 'd',
      type: 'app', appUrl: null, websiteUrl: null, repoUrl: null, installCommand: null,
      logoUrl: null, bannerUrl: null, accentColor: '#FF6F00', category: 'tool',
      // Non-skill types (app/sdk) render a "Completions" stat that reads
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
    renderProjectPage({ type: 'sdk', repoUrl: 'https://github.com/owner/repo' });
    const link = screen.getByRole('link', { name: /Open repository/i });
    expect(link.getAttribute('href')).toBe('https://github.com/owner/repo');
    expect(screen.queryByText(/Open App/i)).toBeNull();
  });

  it('shows the install command as a copyable line', () => {
    renderProjectPage({ type: 'sdk', repoUrl: 'https://github.com/owner/repo', installCommand: 'npx agent-guild' });
    expect(screen.getByText('npx agent-guild')).toBeTruthy();
    expect(screen.getByRole('button', { name: /copy install command/i })).toBeTruthy();
  });

  it('leaves an app project alone', () => {
    renderProjectPage({ type: 'app', appUrl: 'https://app.example.com' });
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
    renderProjectPage({ type: 'sdk', repoUrl: 'javascript:alert(1)' });
    expect(screen.queryByRole('link', { name: /Open repository/i })).toBeNull();
  });

  it('does not render Open repository for an http:// repoUrl', () => {
    renderProjectPage({ type: 'sdk', repoUrl: 'http://example.com/owner/repo' });
    expect(screen.queryByRole('link', { name: /Open repository/i })).toBeNull();
  });

  it('renders Open repository for a normal https:// repoUrl', () => {
    renderProjectPage({ type: 'sdk', repoUrl: 'https://github.com/owner/repo' });
    const link = screen.getByRole('link', { name: /Open repository/i });
    expect(link.getAttribute('href')).toBe('https://github.com/owner/repo');
  });

  it('does not render Website for a javascript: websiteUrl', () => {
    renderProjectPage({ type: 'app', websiteUrl: 'javascript:alert(1)' });
    expect(screen.queryByRole('link', { name: /Website/i })).toBeNull();
  });

  it('does not render Website for an http:// websiteUrl', () => {
    renderProjectPage({ type: 'app', websiteUrl: 'http://example.com' });
    expect(screen.queryByRole('link', { name: /Website/i })).toBeNull();
  });

  it('renders Website for a normal https:// websiteUrl', () => {
    renderProjectPage({ type: 'app', websiteUrl: 'https://example.com' });
    const link = screen.getByRole('link', { name: /Website/i });
    expect(link.getAttribute('href')).toBe('https://example.com');
  });
});
