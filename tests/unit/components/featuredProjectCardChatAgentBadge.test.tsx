import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { FeaturedProjectCard } from '../../../src/components/marketplace/FeaturedProjectCard';
import type { ProjectSummary } from '../../../src/services/marketplaceApi';
import { PROJECT_TYPES } from '../../../src/utils/isStandalone';

const BASE_PROJECT: ProjectSummary = {
  _id: 'p1', slug: 'agent-guild', name: 'Agent Guild', type: PROJECT_TYPES.APP, tagline: 't', logoUrl: '',
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

describe('FeaturedProjectCard chat-agent badge', () => {
  it('badges a chat agent and shows its nametag', () => {
    renderCard({ type: PROJECT_TYPES.CHAT_AGENT, agentAddress: '@bot' });
    expect(screen.getByText('CHAT AGENT')).toBeTruthy();
    expect(screen.getByText('@bot')).toBeTruthy();
  });

  it('does not show the chat-agent badge for an app featured project', () => {
    renderCard({ type: PROJECT_TYPES.APP, appUrl: 'https://app.example.com' });
    expect(screen.queryByText('CHAT AGENT')).toBeNull();
  });

  it('does not show the chat-agent badge for a skill featured project', () => {
    renderCard({ type: PROJECT_TYPES.SKILL });
    expect(screen.queryByText('CHAT AGENT')).toBeNull();
  });

  it('shows STANDALONE, not CHAT AGENT, for a standalone featured project', () => {
    renderCard({ type: PROJECT_TYPES.STANDALONE, repoUrl: 'https://github.com/owner/repo' });
    expect(screen.getByText('STANDALONE')).toBeTruthy();
    expect(screen.queryByText('CHAT AGENT')).toBeNull();
  });

  it('keeps the project tagline when the chat agent address is a pubkey, not a nametag', () => {
    const pubkey = `02${'ab'.repeat(32)}`;
    renderCard({ type: PROJECT_TYPES.CHAT_AGENT, agentAddress: pubkey, tagline: 'Friendly onboarding helper' });
    expect(screen.getByText('CHAT AGENT')).toBeTruthy();
    expect(screen.getByText('Friendly onboarding helper')).toBeTruthy();
    expect(screen.queryByText(pubkey)).toBeNull();
  });
});
