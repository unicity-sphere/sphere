import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';

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

// This app is the wallet — the origin holding the user's keys — so a project
// field (repoUrl/websiteUrl) reaching window.open is script execution if it
// is ever anything other than https. window.open gets no JSX sanitisation at
// all, unlike an <a href>. Server-side validation is not a substitute: admin/
// migration/seed paths can write values that skip the normal validated write
// path, so the client must gate again before it ever reaches a nav sink.
function openContextMenu() {
  fireEvent.click(screen.getByLabelText('Open context menu'));
}

describe('InstalledProjectIcon context menu — https gate on window.open sinks', () => {
  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  it('renders no Open repository entry and never calls window.open for a javascript: repoUrl', () => {
    const project: ProjectSummary = { ...SDK_PROJECT, repoUrl: 'javascript:alert(1)' };
    render(<InstalledProjectIcon project={project} />);
    openContextMenu();
    expect(screen.queryByRole('button', { name: 'Open repository' })).toBeNull();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('renders no Open repository entry and never calls window.open for an http:// repoUrl', () => {
    const project: ProjectSummary = { ...SDK_PROJECT, repoUrl: 'http://github.com/owner/repo' };
    render(<InstalledProjectIcon project={project} />);
    openContextMenu();
    expect(screen.queryByRole('button', { name: 'Open repository' })).toBeNull();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('still opens a real https repository, with noopener,noreferrer', () => {
    render(<InstalledProjectIcon project={SDK_PROJECT} />);
    openContextMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Open repository' }));
    expect(openSpy).toHaveBeenCalledWith('https://github.com/owner/repo', '_blank', 'noopener,noreferrer');
  });

  it('renders no Open Website entry and never calls window.open for a javascript: websiteUrl', () => {
    const project: ProjectSummary = { ...SDK_PROJECT, websiteUrl: 'javascript:alert(1)' };
    render(<InstalledProjectIcon project={project} />);
    openContextMenu();
    expect(screen.queryByRole('button', { name: 'Open Website' })).toBeNull();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('renders no Open Website entry and never calls window.open for an http:// websiteUrl', () => {
    const project: ProjectSummary = { ...SDK_PROJECT, websiteUrl: 'http://aliemul.github.io/agent-guild/' };
    render(<InstalledProjectIcon project={project} />);
    openContextMenu();
    expect(screen.queryByRole('button', { name: 'Open Website' })).toBeNull();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('still opens a real https website, with noopener,noreferrer', () => {
    render(<InstalledProjectIcon project={SDK_PROJECT} />);
    openContextMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Open Website' }));
    expect(openSpy).toHaveBeenCalledWith('https://aliemul.github.io/agent-guild/', '_blank', 'noopener,noreferrer');
  });
});

describe('InstalledProjectIcon context menu — type branches first', () => {
  it('never offers Open in Tab for an sdk project even with a stray appUrl and no repoUrl', () => {
    // Without repoUrl, the old `type === 'sdk' && repoUrl ? [repo] : appUrl ? [tab] : []`
    // ternary falls through to the appUrl branch and frames it — even though
    // launchUrl already forbids framing for sdk unconditionally. Branching on
    // type first must make the menu agree by construction, not by repoUrl
    // happening to be set.
    const project: ProjectSummary = { ...SDK_PROJECT, repoUrl: null, appUrl: 'https://app.example.com' };
    render(<InstalledProjectIcon project={project} />);
    openContextMenu();
    expect(screen.queryByRole('button', { name: 'Open in Tab' })).toBeNull();
  });
});
