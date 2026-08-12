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

describe('ProjectCard chat-agent badge', () => {
  it('badges a chat agent and shows its nametag', () => {
    renderCard({ type: PROJECT_TYPES.CHAT_AGENT, agentAddress: '@bot' });
    expect(screen.getByText('CHAT AGENT')).toBeTruthy();
    expect(screen.getByText('@bot')).toBeTruthy();
  });

  it('does not show the chat-agent badge for an app project', () => {
    renderCard({ type: PROJECT_TYPES.APP, appUrl: 'https://app.example.com' });
    expect(screen.queryByText('CHAT AGENT')).toBeNull();
  });

  it('does not show the chat-agent badge for a skill project', () => {
    renderCard({ type: PROJECT_TYPES.SKILL });
    expect(screen.queryByText('CHAT AGENT')).toBeNull();
  });

  it('shows STANDALONE, not CHAT AGENT, for a standalone project', () => {
    renderCard({ type: PROJECT_TYPES.STANDALONE, repoUrl: 'https://github.com/owner/repo' });
    expect(screen.getByText('STANDALONE')).toBeTruthy();
    expect(screen.queryByText('CHAT AGENT')).toBeNull();
  });

  // The catalog subtitle substitutes the agent's own tagline only for a
  // @nametag (short, human-chosen, worth surfacing at a glance). A pubkey or
  // DIRECT:// address is a long opaque string that wouldn't help someone
  // scanning the catalog, so those chat agents keep their authored tagline
  // instead — unlike ProjectPage's dedicated, always-shown Unicity ID line.
  it('keeps the project tagline when the chat agent address is a pubkey, not a nametag', () => {
    const pubkey = `02${'ab'.repeat(32)}`;
    renderCard({ type: PROJECT_TYPES.CHAT_AGENT, agentAddress: pubkey, tagline: 'Friendly onboarding helper' });
    expect(screen.getByText('CHAT AGENT')).toBeTruthy();
    expect(screen.getByText('Friendly onboarding helper')).toBeTruthy();
    expect(screen.queryByText(pubkey)).toBeNull();
  });

  it('keeps the project tagline when a chat agent has no agentAddress', () => {
    renderCard({ type: PROJECT_TYPES.CHAT_AGENT, agentAddress: null, tagline: 'Friendly onboarding helper' });
    expect(screen.getByText('CHAT AGENT')).toBeTruthy();
    expect(screen.getByText('Friendly onboarding helper')).toBeTruthy();
  });
});
