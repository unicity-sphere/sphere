import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// vi.mock factories are hoisted above regular top-level `const`s, so the mocks
// referenced inside the factory below must themselves be created via
// vi.hoisted to avoid a TDZ ReferenceError when ProjectPage's import of
// useMarketplace is resolved.
const { useProject, useProjectQuests } = vi.hoisted(() => ({
  useProject: vi.fn(),
  useProjectQuests: vi.fn(),
}));

vi.mock('../../../src/hooks/useMarketplace', () => ({
  useProject:         (...args: unknown[]) => useProject(...args),
  useProjectQuests:   (...args: unknown[]) => useProjectQuests(...args),
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
// This suite exercises the chat-agent action row only, not the signed-in-only
// Report control — no identity means no control, same as every other
// consumer of this hook in an unauthenticated test context.
vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: null }),
}));

import { ProjectPage } from '../../../src/pages/ProjectPage';

function renderProject(over: Record<string, unknown>) {
  useProject.mockReturnValue({
    data: {
      _id: 'p1', slug: 'agent-guild', name: 'Agent Guild', tagline: 't', description: 'd',
      type: 'app', appUrl: null, websiteUrl: null, repoUrl: null, installCommand: null,
      agentAddress: null,
      logoUrl: null, bannerUrl: null, accentColor: '#FF6F00', category: 'tool',
      tags: [], media: [], socialLinks: {},
      stats: { totalUsers: 0, activeQuests: 0, totalCompletions: 0, rating: 0, ratingCount: 0 },
      ...over,
    },
    isLoading: false,
  });
  useProjectQuests.mockReturnValue({ data: [] });
  return render(
    <MemoryRouter initialEntries={['/apps/agent-guild']}>
      <Routes><Route path="/apps/:slug" element={<ProjectPage />} /></Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => { vi.clearAllMocks(); });

describe('ProjectPage — chat agent action row', () => {
  // @testing-library/jest-dom is not installed in this repo (no other test
  // under tests/unit uses toHaveAttribute/toBeInTheDocument) — assertions use
  // the plain-DOM + queryByRole(...).toBeNull() style projectPageSdkActions
  // .test.tsx already uses for the same kind of link/button checks.
  it('offers Message instead of Open App, and no install', async () => {
    renderProject({ type: 'chat-agent', agentAddress: '@bot', appUrl: null });
    const link = await screen.findByRole('link', { name: /message @bot/i });
    expect(link.getAttribute('href')).toBe('/agents/dm?peer=%40bot');
    expect(screen.queryByRole('button', { name: /add to desktop/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /install/i })).toBeNull();
  });

  it('does not fetch or render quests for a chat agent', () => {
    renderProject({ type: 'chat-agent', agentAddress: '@bot' });
    expect(useProjectQuests).toHaveBeenCalledWith(expect.any(String), false);
  });
});
