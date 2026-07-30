import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// vi.mock factories are hoisted above regular top-level `const`s, so the mock
// referenced inside the factory below must itself be created via vi.hoisted
// to avoid a TDZ ReferenceError.
const { onMarketplaceProjectCard } = vi.hoisted(() => ({
  onMarketplaceProjectCard: vi.fn(),
}));

// sphere-ui's MarketplaceProjectCard defaults an absent `quests` prop to 0
// and renders the "Active quests" stat unconditionally either way (no
// `quests !== undefined &&` guard in its source, only a `= 0` default param)
// — so the only way to assert what THIS repo's wrapper actually decided to
// pass is to capture the prop directly, rather than reading the rendered
// text (which looks identical for `undefined` and `0`).
vi.mock('@unicitylabs/sphere-ui', () => ({
  MarketplaceProjectCard: (props: Record<string, unknown>) => {
    onMarketplaceProjectCard(props);
    return null;
  },
}));
vi.mock('../../../src/hooks/useInstalledProjects', () => ({
  useInstalledProjects: () => ({ isInstalled: () => false, toggle: vi.fn() }),
}));

import { ProjectCard } from '../../../src/components/marketplace/ProjectCard';
import type { ProjectSummary } from '../../../src/services/marketplaceApi';
import { PROJECT_TYPES } from '../../../src/utils/isStandalone';

const BASE_PROJECT: ProjectSummary = {
  _id: 'p1', slug: 'agent-guild', name: 'Agent Guild', type: PROJECT_TYPES.APP, tagline: 't', logoUrl: '',
  bannerUrl: null, accentColor: '#FF6F00', category: 'tool', tags: [], featured: false,
  appUrl: null, websiteUrl: null, repoUrl: null, installCommand: null,
  stats: { totalUsers: 0, totalCompletions: 0, activeQuests: 7 },
};

function renderCard(over: Partial<ProjectSummary>) {
  return render(
    <MemoryRouter>
      <ProjectCard project={{ ...BASE_PROJECT, ...over }} />
    </MemoryRouter>,
  );
}

describe('ProjectCard passes the quest count only when the project type supports quests', () => {
  it('passes the real quest count for an app project', () => {
    renderCard({ type: PROJECT_TYPES.APP });
    expect(onMarketplaceProjectCard).toHaveBeenCalledWith(expect.objectContaining({ quests: 7 }));
  });

  it('omits the quest count for a standalone project', () => {
    renderCard({ type: PROJECT_TYPES.STANDALONE });
    expect(onMarketplaceProjectCard).toHaveBeenCalledWith(expect.objectContaining({ quests: undefined }));
  });

  it('omits the quest count for a skill project', () => {
    renderCard({ type: PROJECT_TYPES.SKILL });
    expect(onMarketplaceProjectCard).toHaveBeenCalledWith(expect.objectContaining({ quests: undefined }));
  });
});
