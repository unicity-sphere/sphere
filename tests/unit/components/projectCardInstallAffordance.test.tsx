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
import type { ProjectSummary } from '../../../src/services/marketplaceApi';
import { PROJECT_TYPES } from '../../../src/utils/isStandalone';

const BASE_PROJECT: ProjectSummary = {
  _id: 'p1', slug: 'agent-guild', name: 'Agent Guild', type: PROJECT_TYPES.APP, tagline: 't', logoUrl: '',
  bannerUrl: null, accentColor: '#FF6F00', category: 'tool', tags: [], featured: false,
  appUrl: null, websiteUrl: null, repoUrl: null, installCommand: null,
  stats: { totalUsers: 0, totalCompletions: 0, activeQuests: 0 },
};

beforeEach(() => { vi.clearAllMocks(); });

function renderCard(over: Partial<ProjectSummary>) {
  return render(
    <MemoryRouter>
      <ProjectCard project={{ ...BASE_PROJECT, ...over }} />
    </MemoryRouter>,
  );
}

// C1: sphere-ui's MarketplaceProjectCard gates its "Add to Desktop" overlay
// button on `installState !== 'none'` — the earlier badge tests only ever
// asserted with `getByText`, which the button (an icon-only control with no
// visible text, just a `title` attribute) is invisible to. That is how the
// badge landed in the same commit as a still-clickable install button for a
// type the API refuses to install: useInstalledProjects.install writes an
// optimistic slug into localStorage and the query cache with no
// onError/rollback, so a stray click leaves a permanent desktop tile behind
// for a locked/unauthenticated wallet. Assert by role instead, the way a
// real click target has to be found.
describe('ProjectCard install affordance', () => {
  it('offers no install affordance for a chat agent', () => {
    renderCard({ type: PROJECT_TYPES.CHAT_AGENT, agentAddress: '@bot' });
    expect(screen.queryByRole('button', { name: /add to desktop/i })).toBeNull();
  });

  it('still offers install for an app and a standalone project', () => {
    const { unmount } = renderCard({ type: PROJECT_TYPES.APP, appUrl: 'https://app.example.com' });
    expect(screen.getByRole('button', { name: /add to desktop/i })).toBeTruthy();
    unmount();

    renderCard({ type: PROJECT_TYPES.STANDALONE, repoUrl: 'https://github.com/owner/repo' });
    expect(screen.getByRole('button', { name: /add to desktop/i })).toBeTruthy();
  });

  it('still offers install for a skill project', () => {
    renderCard({ type: PROJECT_TYPES.SKILL });
    expect(screen.getByRole('button', { name: /add to desktop/i })).toBeTruthy();
  });

  it('never wires the click handler for a chat agent, even if a future sphere-ui version keys off its presence', () => {
    renderCard({ type: PROJECT_TYPES.CHAT_AGENT, agentAddress: '@bot' });
    // No install button to click at all — toggle must never have been reached.
    expect(toggle).not.toHaveBeenCalled();
  });
});
