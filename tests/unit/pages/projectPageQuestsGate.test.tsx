import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { ProjectQuest } from '../../../src/services/marketplaceApi';

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

import { ProjectPage } from '../../../src/pages/ProjectPage';
import { PROJECT_TYPES, type ProjectType } from '../../../src/utils/isStandalone';

// Non-empty on purpose: the point of this suite is that the section must be
// gated on the project's TYPE (supportsQuests), not on the query happening to
// come back empty for standalone. If the gate were `quests.length > 0` alone
// (today's pre-fix behaviour), this quest would render for every type.
const QUEST: ProjectQuest = {
  _id: 'q1', title: 'Say hi', description: 'Say hi in chat', points: 10,
  platform: null, imageUrl: null, tags: [], questType: 'CHECKIN', track: null,
};

function renderProjectPage(type: ProjectType) {
  useProject.mockReturnValue({
    data: {
      _id: 'p1', slug: 'agent-guild', name: 'Agent Guild', tagline: 't', description: 'd',
      type, appUrl: 'https://app.example.com', websiteUrl: null, repoUrl: null, installCommand: null,
      logoUrl: null, bannerUrl: null, accentColor: '#FF6F00', category: 'tool',
      tags: [], media: [], socialLinks: {},
      stats: { totalUsers: 0, activeQuests: 1, totalCompletions: 3, rating: 0, ratingCount: 0 },
    },
    isLoading: false,
  });
  useProjectQuests.mockReturnValue({ data: [QUEST] });
  return render(
    <MemoryRouter initialEntries={['/apps/agent-guild']}>
      <Routes><Route path="/apps/:slug" element={<ProjectPage />} /></Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => { vi.clearAllMocks(); });

describe('ProjectPage quests section — gated on supportsQuests, not on emptiness', () => {
  it('shows the Quests section for an app project when quests exist', () => {
    renderProjectPage(PROJECT_TYPES.APP);
    expect(screen.getByRole('heading', { name: /Quests/i })).toBeTruthy();
  });

  it('shows the Quests section for a skill project when quests exist', () => {
    renderProjectPage(PROJECT_TYPES.SKILL);
    expect(screen.getByRole('heading', { name: /Quests/i })).toBeTruthy();
  });

  // The regression this whole task is about: nothing previously stopped a
  // standalone project's page from rendering quest content if the quests
  // query ever returned data (stale cache, a future backend response, etc.) —
  // the mock here always returns a quest regardless of type, so this only
  // passes if ProjectPage itself gates the section on the type's capability.
  it('hides the Quests section for a standalone project even though the quests query returns data', () => {
    renderProjectPage(PROJECT_TYPES.STANDALONE);
    expect(screen.queryByRole('heading', { name: /Quests/i })).toBeNull();
  });

  it('hides the Quests/Completions stat tiles for a standalone project', () => {
    renderProjectPage(PROJECT_TYPES.STANDALONE);
    expect(screen.queryByText('Completions')).toBeNull();
  });

  it('shows the Quests/Completions stat tiles for an app project', () => {
    renderProjectPage(PROJECT_TYPES.APP);
    expect(screen.getByText('Completions')).toBeTruthy();
  });
});

describe('ProjectPage skips the quests fetch once it knows the type has no quests', () => {
  it('disables the quests query for a standalone project', () => {
    renderProjectPage(PROJECT_TYPES.STANDALONE);
    expect(useProjectQuests).toHaveBeenLastCalledWith('agent-guild', false);
  });

  it('keeps the quests query enabled for an app project', () => {
    renderProjectPage(PROJECT_TYPES.APP);
    expect(useProjectQuests).toHaveBeenLastCalledWith('agent-guild', true);
  });
});
