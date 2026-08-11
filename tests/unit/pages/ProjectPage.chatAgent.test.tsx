import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// vi.mock factories are hoisted above regular top-level `const`s, so the mocks
// referenced inside the factory below must themselves be created via
// vi.hoisted to avoid a TDZ ReferenceError when ProjectPage's import of
// useMarketplace is resolved.
const { useProject, useProjectQuests, copyToClipboard } = vi.hoisted(() => ({
  useProject: vi.fn(),
  useProjectQuests: vi.fn(),
  copyToClipboard: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../src/hooks/useMarketplace', () => ({
  useProject:         (...args: unknown[]) => useProject(...args),
  useProjectQuests:   (...args: unknown[]) => useProjectQuests(...args),
  useProjectMetrics:  () => ({ data: undefined }),
}));
// Spied so the DIRECT:// / pubkey truncation tests below can assert the FULL
// (untruncated, unstripped) address is what actually gets copied — the
// truncation is display-only.
vi.mock('../../../src/utils/copyToClipboard', () => ({ copyToClipboard }));
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

// M1: the API makes a published chat agent with no agentAddress unlikely
// (it's set at creation) but not impossible — a developer PUT can clear the
// field later. Before this fix, both the ID line and the Message button
// short-circuited to nothing for this case, leaving the action row entirely
// empty with no explanation on screen.
describe('ProjectPage — chat agent with no agentAddress yet', () => {
  it('explains the agent has no Unicity ID yet instead of rendering an empty action row', () => {
    renderProject({ type: 'chat-agent', agentAddress: null, appUrl: null });

    expect(screen.queryByRole('link', { name: /message/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /copy unicity id/i })).toBeNull();
    expect(screen.getAllByText(/hasn.t published a unicity id yet/i).length).toBeGreaterThan(0);
  });
});

// M2: nametags are admitted up to 64 characters by the API, and the Message
// button's label is the nametag itself — the copy line above it already
// truncates (`truncate` in its className), so the button needs the same
// treatment or a long nametag blows it out.
describe('ProjectPage — chat agent with a long nametag', () => {
  it('caps the Message button label instead of rendering it in full', async () => {
    const longNametag = `@${'a'.repeat(64)}`;
    renderProject({ type: 'chat-agent', agentAddress: longNametag, appUrl: null });

    const link = await screen.findByRole('link', { name: /message/i });
    // The accessible name still carries the full text (CSS truncation never
    // touches textContent) — the actual assertion is that the label sits in
    // its own capped, truncating wrapper rather than flowing free.
    expect(link.textContent).toContain(longNametag);
    const labelSpan = link.querySelector('span');
    expect(labelSpan?.textContent).toBe(longNametag);
    expect(labelSpan?.className).toContain('max-w-[16ch]');
    expect(labelSpan?.className).toContain('truncate');
  });
});

// A DIRECT:// address and a bare pubkey are both long opaque strings, unlike
// a human-chosen @nametag — both must be middle-truncated for display (never
// shown in full, never an inline slice), while the actual link target and
// the copied value stay the full, untouched address underneath.
describe('ProjectPage — chat agent address truncation (DIRECT:// / pubkey)', () => {
  const PUBKEY = '02ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12cd34ef569012';
  const DIRECT_ADDR = `DIRECT://${PUBKEY}`;

  it('strips the DIRECT:// scheme before truncating, so the label shows real address bytes, not the scheme', async () => {
    renderProject({ type: 'chat-agent', agentAddress: DIRECT_ADDR, appUrl: null });

    // truncateId slices literal characters, so truncating "DIRECT://02ab...9012"
    // without stripping the scheme first would read "DIRECT...9012" — the
    // label must instead show the pubkey's own first 6 / last 4 characters.
    const link = await screen.findByRole('link', { name: /message 02ab12\.\.\.9012/i });
    expect(link.textContent).not.toMatch(/DIRECT\.\.\./i);
  });

  it('keeps the full DIRECT:// address (with scheme) in href and in the copied value', async () => {
    renderProject({ type: 'chat-agent', agentAddress: DIRECT_ADDR, appUrl: null });

    const link = await screen.findByRole('link', { name: /message 02ab12\.\.\.9012/i });
    expect(link.getAttribute('href')).toBe(`/agents/dm?peer=${encodeURIComponent(DIRECT_ADDR)}`);

    fireEvent.click(screen.getByRole('button', { name: /copy unicity id/i }));
    expect(copyToClipboard).toHaveBeenCalledWith(DIRECT_ADDR);
  });

  it('middle-truncates a bare pubkey (no scheme to strip) the same way', async () => {
    renderProject({ type: 'chat-agent', agentAddress: PUBKEY, appUrl: null });

    const link = await screen.findByRole('link', { name: /message 02ab12\.\.\.9012/i });
    expect(link.getAttribute('href')).toBe(`/agents/dm?peer=${encodeURIComponent(PUBKEY)}`);

    fireEvent.click(screen.getByRole('button', { name: /copy unicity id/i }));
    expect(copyToClipboard).toHaveBeenCalledWith(PUBKEY);
  });
});
