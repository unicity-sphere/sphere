import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// vi.mock factories are hoisted above regular top-level `const`s, so the mock
// referenced inside the factory below must itself be created via vi.hoisted
// to avoid a TDZ ReferenceError.
const { onFeaturedProjectCard } = vi.hoisted(() => ({
  onFeaturedProjectCard: vi.fn(),
}));

// See projectCardQuestsProp.test.tsx: sphere-ui's FeaturedProjectCard also
// defaults an absent `quests` to 0 and renders it unconditionally, so the
// prop itself has to be captured directly rather than read off rendered text.
vi.mock('@unicitylabs/sphere-ui', () => ({
  FeaturedProjectCard: (props: Record<string, unknown>) => {
    onFeaturedProjectCard(props);
    return null;
  },
}));

import { FeaturedProjectCard } from '../../../src/components/marketplace/FeaturedProjectCard';
import type { ProjectSummary } from '../../../src/services/marketplaceApi';
import { PROJECT_TYPES } from '../../../src/utils/isStandalone';

const BASE_PROJECT: ProjectSummary = {
  _id: 'p1', slug: 'agent-guild', name: 'Agent Guild', type: PROJECT_TYPES.APP, tagline: 't', logoUrl: '',
  bannerUrl: null, accentColor: '#FF6F00', category: 'tool', tags: [], featured: true,
  appUrl: null, websiteUrl: null, repoUrl: null, installCommand: null,
  stats: { totalUsers: 0, totalCompletions: 0, activeQuests: 7 },
};

function renderCard(over: Partial<ProjectSummary>) {
  return render(
    <MemoryRouter>
      <FeaturedProjectCard project={{ ...BASE_PROJECT, ...over }} />
    </MemoryRouter>,
  );
}

describe('FeaturedProjectCard passes the quest count only when the project type supports quests', () => {
  it('passes the real quest count for an app project', () => {
    renderCard({ type: PROJECT_TYPES.APP });
    expect(onFeaturedProjectCard).toHaveBeenCalledWith(expect.objectContaining({ quests: 7 }));
  });

  it('omits the quest count for a standalone project', () => {
    renderCard({ type: PROJECT_TYPES.STANDALONE });
    expect(onFeaturedProjectCard).toHaveBeenCalledWith(expect.objectContaining({ quests: undefined }));
  });

  it('omits the quest count for a skill project', () => {
    renderCard({ type: PROJECT_TYPES.SKILL });
    expect(onFeaturedProjectCard).toHaveBeenCalledWith(expect.objectContaining({ quests: undefined }));
  });
});
