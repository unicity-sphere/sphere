import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// vi.mock factories are hoisted above regular top-level `const`s, so the mock
// referenced inside the factory below must itself be created via vi.hoisted
// to avoid a TDZ ReferenceError.
const { toggle } = vi.hoisted(() => ({ toggle: vi.fn() }));

vi.mock('../../../src/hooks/useInstalledProjects', () => ({
  useInstalledProjects: () => ({ isInstalled: () => false, toggle }),
}));

import { ProjectCard } from '../../../src/components/marketplace/ProjectCard';

const BASE_PROJECT = {
  _id: 'p1', slug: 'agent-guild', name: 'Agent Guild', tagline: 't', logoUrl: null,
  bannerUrl: null, accentColor: '#FF6F00', category: 'tool', tags: [], featured: false,
  appUrl: null, websiteUrl: null, repoUrl: null, installCommand: null,
  stats: { totalUsers: 0, totalCompletions: 0, activeQuests: 0 },
} as any;

beforeEach(() => { vi.clearAllMocks(); });

function renderCard(over: Record<string, unknown>) {
  return render(
    <MemoryRouter>
      <ProjectCard project={{ ...BASE_PROJECT, ...over }} />
    </MemoryRouter>,
  );
}

describe('ProjectCard standalone badge', () => {
  it('shows a STANDALONE badge for an sdk project', () => {
    renderCard({ type: 'sdk', repoUrl: 'https://github.com/owner/repo' });
    expect(screen.getByText('STANDALONE')).toBeTruthy();
  });

  it('does not show the badge for an app project', () => {
    renderCard({ type: 'app', appUrl: 'https://app.example.com' });
    expect(screen.queryByText('STANDALONE')).toBeNull();
  });
});
