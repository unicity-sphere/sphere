import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { FeaturedProjectCard } from '../../../src/components/marketplace/FeaturedProjectCard';
import type { ProjectSummary } from '../../../src/services/marketplaceApi';

const BASE_PROJECT: ProjectSummary = {
  _id: 'p1', slug: 'agent-guild', name: 'Agent Guild', type: 'app', tagline: 't', logoUrl: '',
  bannerUrl: null, accentColor: '#FF6F00', category: 'tool', tags: [], featured: true,
  appUrl: null, websiteUrl: null, repoUrl: null, installCommand: null,
  stats: { totalUsers: 0, totalCompletions: 0, activeQuests: 0 },
};

function renderCard(over: Partial<ProjectSummary>) {
  return render(
    <MemoryRouter>
      <FeaturedProjectCard project={{ ...BASE_PROJECT, ...over }} />
    </MemoryRouter>,
  );
}

describe('FeaturedProjectCard standalone badge', () => {
  it('shows a STANDALONE badge for an sdk featured project', () => {
    renderCard({ type: 'sdk', repoUrl: 'https://github.com/owner/repo' });
    expect(screen.getByText('STANDALONE')).toBeTruthy();
  });

  it('does not show the badge for an app featured project', () => {
    renderCard({ type: 'app', appUrl: 'https://app.example.com' });
    expect(screen.queryByText('STANDALONE')).toBeNull();
  });
});
