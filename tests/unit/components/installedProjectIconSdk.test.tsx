import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

// vi.mock factories are hoisted above regular top-level `const`s, so the mocks
// referenced inside the factories below must themselves be created via
// vi.hoisted to avoid a TDZ ReferenceError.
const { openTab, navigate, ping } = vi.hoisted(() => ({
  openTab:  vi.fn(),
  navigate: vi.fn(),
  ping:     vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, useNavigate: () => navigate };
});
vi.mock('../../../src/hooks/useDesktopState', () => ({
  useDesktopState: () => ({ openTab }),
}));
vi.mock('../../../src/hooks/useInstalledProjects', () => ({
  useInstalledProjects: () => ({ uninstall: vi.fn(), ping }),
}));

import { InstalledProjectIcon } from '../../../src/components/desktop/InstalledProjectIcon';
import type { ProjectSummary } from '../../../src/services/marketplaceApi';

const SDK_PROJECT: ProjectSummary = {
  _id: 'p1', slug: 'agent-guild', name: 'Agent Guild', type: 'sdk',
  repoUrl: 'https://github.com/owner/repo', appUrl: null,
  // A website IS set: this is the case the current `appUrl ?? websiteUrl`
  // fallback would happily frame.
  websiteUrl: 'https://aliemul.github.io/agent-guild/',
  logoUrl: '', accentColor: '#FF6F00', category: 'tool', tagline: 't', tags: [],
  installCommand: null, featured: false,
  stats: { totalUsers: 0, totalCompletions: 0, activeQuests: 0 },
};

beforeEach(() => { vi.clearAllMocks(); });

describe('InstalledProjectIcon for a standalone project', () => {
  it('opens the project page rather than an in-app tab', () => {
    const { container } = render(<InstalledProjectIcon project={SDK_PROJECT} />);
    fireEvent.click(container.querySelector('button')!);
    expect(openTab).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/apps/agent-guild');
  });

  it('never routes a repository through the in-app frame', () => {
    const { container } = render(<InstalledProjectIcon project={SDK_PROJECT} />);
    fireEvent.click(container.querySelector('button')!);
    for (const [arg] of navigate.mock.calls) {
      expect(String(arg)).not.toContain('/agents/custom');
    }
  });

  it('still opens an app project in a tab', () => {
    const app: ProjectSummary = { ...SDK_PROJECT, type: 'app', appUrl: 'https://app.example.com', repoUrl: null };
    const { container } = render(<InstalledProjectIcon project={app} />);
    fireEvent.click(container.querySelector('button')!);
    expect(openTab).toHaveBeenCalledWith('custom', { url: 'https://app.example.com', label: 'Agent Guild' });
  });
});
