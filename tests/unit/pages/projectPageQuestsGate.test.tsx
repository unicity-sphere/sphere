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
// This suite exercises the quests gate only, not the signed-in-only Report
// control — no identity means no control, same as every other consumer of
// this hook in an unauthenticated test context.
vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: null }),
}));

import { ProjectPage } from '../../../src/pages/ProjectPage';
import { PROJECT_TYPES, type ProjectType } from '../../../src/utils/isStandalone';

// Non-empty on purpose: the point of this suite is that visibility is gated
// on the project's TYPE, not on the query happening to come back empty. If a
// gate were `quests.length > 0` alone (pre-fix behaviour for the section,
// still true today for standalone in practice), this quest would render for
// every type regardless of what it should show.
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

// The Quests SECTION (this list) and the fetch that feeds it are gated on
// !isStandalone, NOT on supportsQuests — they had no type gate at all before
// this project-type work, so app/skill must keep showing/fetching quests
// exactly as before; only standalone (new) is hidden/skipped. See
// ProjectPage.tsx's comment on the useProjectQuests call for the full
// reasoning. The Quests/Completions STAT TILES (next describe block) are a
// different, narrower gate (supportsQuests, app-only) that already excluded
// skill before this work.
describe('ProjectPage quests section — gated on !isStandalone (app/skill unchanged, standalone hidden)', () => {
  it('shows the Quests section for an app project when quests exist', () => {
    renderProjectPage(PROJECT_TYPES.APP);
    expect(screen.getByRole('heading', { name: /Quests/i })).toBeTruthy();
  });

  // Pin: this is the site that would have silently regressed if the section
  // were gated on supportsQuests(app-only) instead — skill showed quests
  // unconditionally before this project-type work, and must keep doing so.
  it('shows the Quests section for a skill project when quests exist (unchanged from before this work)', () => {
    renderProjectPage(PROJECT_TYPES.SKILL);
    expect(screen.getByRole('heading', { name: /Quests/i })).toBeTruthy();
  });

  // The regression this whole task is about: nothing previously stopped a
  // standalone project's page from rendering quest content if the quests
  // query ever returned data (stale cache, a future backend response, etc.) —
  // the mock here always returns a quest regardless of type, so this only
  // passes if ProjectPage itself gates the section on the project's type.
  it('hides the Quests section for a standalone project even though the quests query returns data', () => {
    renderProjectPage(PROJECT_TYPES.STANDALONE);
    expect(screen.queryByRole('heading', { name: /Quests/i })).toBeNull();
  });
});

describe('ProjectPage quests fetch — enabled for app/skill (unchanged), disabled for standalone', () => {
  it('keeps the quests query enabled for an app project', () => {
    renderProjectPage(PROJECT_TYPES.APP);
    expect(useProjectQuests).toHaveBeenLastCalledWith('agent-guild', true);
  });

  // Pin: before this project-type work the fetch was fully unconditional —
  // a refactor that disabled it for skill (e.g. by reusing the app-only
  // supportsQuests predicate here) would be exactly the kind of silent
  // capability/type mix-up this task exists to prevent.
  it('keeps the quests query enabled for a skill project (unchanged from before this work)', () => {
    renderProjectPage(PROJECT_TYPES.SKILL);
    expect(useProjectQuests).toHaveBeenLastCalledWith('agent-guild', true);
  });

  it('disables the quests query for a standalone project', () => {
    renderProjectPage(PROJECT_TYPES.STANDALONE);
    expect(useProjectQuests).toHaveBeenLastCalledWith('agent-guild', false);
  });
});

// The Quests/Completions stat tiles are gated on supportsQuests (app only).
// This already excluded skill before this project-type work (skill shows
// "Installs" instead, and never showed these two tiles) — supportsQuests
// reproduces that exactly, while also fixing standalone, which the old
// `type === 'skill' ? [] : [...]` check forgot to exclude.
describe('ProjectPage Quests/Completions stat tiles — gated on supportsQuests (app only)', () => {
  it('shows the stat tiles for an app project', () => {
    renderProjectPage(PROJECT_TYPES.APP);
    expect(screen.getByText('Completions')).toBeTruthy();
  });

  // Pin: this is the exact regression the owner caught — an earlier version
  // of supportsQuests (true for app OR skill) made these tiles appear for
  // skill, where they were hidden before. A skill is a capability invoked by
  // Astrid, not something that runs a quest campaign, so this must stay
  // hidden.
  it('hides the stat tiles for a skill project (matches its behaviour from before this work)', () => {
    renderProjectPage(PROJECT_TYPES.SKILL);
    expect(screen.queryByText('Completions')).toBeNull();
  });

  it('hides the stat tiles for a standalone project', () => {
    renderProjectPage(PROJECT_TYPES.STANDALONE);
    expect(screen.queryByText('Completions')).toBeNull();
  });
});
