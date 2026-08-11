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
import { PROJECT_TYPES } from '../../../src/utils/isStandalone';

const STANDALONE_PROJECT: ProjectSummary = {
  _id: 'p1', slug: 'agent-guild', name: 'Agent Guild', type: PROJECT_TYPES.STANDALONE,
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
    const { container } = render(<InstalledProjectIcon project={STANDALONE_PROJECT} />);
    fireEvent.click(container.querySelector('button')!);
    expect(openTab).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/apps/agent-guild');
  });

  it('never routes a repository through the in-app frame', () => {
    const { container } = render(<InstalledProjectIcon project={STANDALONE_PROJECT} />);
    fireEvent.click(container.querySelector('button')!);
    for (const [arg] of navigate.mock.calls) {
      expect(String(arg)).not.toContain('/agents/custom');
    }
  });

  it('still opens an app project in a tab', () => {
    const app: ProjectSummary = { ...STANDALONE_PROJECT, type: PROJECT_TYPES.APP, appUrl: 'https://app.example.com', repoUrl: null };
    const { container } = render(<InstalledProjectIcon project={app} />);
    fireEvent.click(container.querySelector('button')!);
    expect(openTab).toHaveBeenCalledWith('custom', { url: 'https://app.example.com', label: 'Agent Guild' });
  });
});

// I1: a chat agent has nothing to launch — it is reached by messaging it,
// not by opening it — but the pre-fix `isStandalone(project) ? null :
// (appUrl ?? websiteUrl)` fallback happily framed its websiteUrl the moment
// one existed. That is reachable in two ways: C1 made "Add to Desktop"
// clickable for a chat agent card in the first place, and — sharper still —
// a project a moderator moved `app -> chat-agent` after a user already
// installed it: that migration promotes the old `appUrl` into `websiteUrl`
// (the type change nulls `appUrl` specifically to stop it being launched),
// so the framed page would be exactly the URL the migration was written to
// retire, read from a stale localStorage record that never resynced.
const CHAT_AGENT_PROJECT: ProjectSummary = {
  ...STANDALONE_PROJECT,
  type: PROJECT_TYPES.CHAT_AGENT,
  repoUrl: null,
  appUrl: null,
  // The migrated-website scenario above: appUrl is null (as the type change
  // requires), but websiteUrl still holds the old app's URL.
  websiteUrl: 'https://aliemul.github.io/agent-guild/',
  agentAddress: '@agent-guild',
};

describe('InstalledProjectIcon for a chat agent', () => {
  it('opens the project page rather than an in-app tab, even with a websiteUrl set', () => {
    const { container } = render(<InstalledProjectIcon project={CHAT_AGENT_PROJECT} />);
    fireEvent.click(container.querySelector('button')!);
    expect(openTab).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/apps/agent-guild');
  });

  it('never routes a chat agent through the in-app frame, even with a stray appUrl', () => {
    const project: ProjectSummary = { ...CHAT_AGENT_PROJECT, appUrl: 'https://old-app.example.com' };
    const { container } = render(<InstalledProjectIcon project={project} />);
    fireEvent.click(container.querySelector('button')!);
    expect(openTab).not.toHaveBeenCalled();
    for (const [arg] of navigate.mock.calls) {
      expect(String(arg)).not.toContain('/agents/custom');
    }
  });

  it('offers Open Website, Marketplace Page and Remove, never Open in Tab', () => {
    render(<InstalledProjectIcon project={CHAT_AGENT_PROJECT} />);
    openContextMenu();
    expect(screen.queryByRole('button', { name: 'Open in Tab' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Open repository' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Open Website' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Marketplace Page' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove from Desktop' })).toBeTruthy();
  });

  it('never offers Open in Tab for a chat agent even with a stray appUrl (branches on type first)', () => {
    const project: ProjectSummary = { ...CHAT_AGENT_PROJECT, appUrl: 'https://old-app.example.com' };
    render(<InstalledProjectIcon project={project} />);
    openContextMenu();
    expect(screen.queryByRole('button', { name: 'Open in Tab' })).toBeNull();
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
    const project: ProjectSummary = { ...STANDALONE_PROJECT, repoUrl: 'javascript:alert(1)' };
    render(<InstalledProjectIcon project={project} />);
    openContextMenu();
    expect(screen.queryByRole('button', { name: 'Open repository' })).toBeNull();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('renders no Open repository entry and never calls window.open for an http:// repoUrl', () => {
    const project: ProjectSummary = { ...STANDALONE_PROJECT, repoUrl: 'http://github.com/owner/repo' };
    render(<InstalledProjectIcon project={project} />);
    openContextMenu();
    expect(screen.queryByRole('button', { name: 'Open repository' })).toBeNull();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('still opens a real https repository, with noopener,noreferrer', () => {
    render(<InstalledProjectIcon project={STANDALONE_PROJECT} />);
    openContextMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Open repository' }));
    expect(openSpy).toHaveBeenCalledWith('https://github.com/owner/repo', '_blank', 'noopener,noreferrer');
  });

  it('renders no Open Website entry and never calls window.open for a javascript: websiteUrl', () => {
    const project: ProjectSummary = { ...STANDALONE_PROJECT, websiteUrl: 'javascript:alert(1)' };
    render(<InstalledProjectIcon project={project} />);
    openContextMenu();
    expect(screen.queryByRole('button', { name: 'Open Website' })).toBeNull();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('renders no Open Website entry and never calls window.open for an http:// websiteUrl', () => {
    const project: ProjectSummary = { ...STANDALONE_PROJECT, websiteUrl: 'http://aliemul.github.io/agent-guild/' };
    render(<InstalledProjectIcon project={project} />);
    openContextMenu();
    expect(screen.queryByRole('button', { name: 'Open Website' })).toBeNull();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('still opens a real https website, with noopener,noreferrer', () => {
    render(<InstalledProjectIcon project={STANDALONE_PROJECT} />);
    openContextMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Open Website' }));
    expect(openSpy).toHaveBeenCalledWith('https://aliemul.github.io/agent-guild/', '_blank', 'noopener,noreferrer');
  });
});

describe('InstalledProjectIcon context menu — type branches first', () => {
  it('never offers Open in Tab for a standalone project even with a stray appUrl and no repoUrl', () => {
    // Without repoUrl, the old `type === 'standalone' && repoUrl ? [repo] : appUrl ? [tab] : []`
    // ternary falls through to the appUrl branch and frames it — even though
    // launchUrl already forbids framing for standalone unconditionally. Branching
    // on type first must make the menu agree by construction, not by repoUrl
    // happening to be set.
    const project: ProjectSummary = { ...STANDALONE_PROJECT, repoUrl: null, appUrl: 'https://app.example.com' };
    render(<InstalledProjectIcon project={project} />);
    openContextMenu();
    expect(screen.queryByRole('button', { name: 'Open in Tab' })).toBeNull();
  });
});

// appUrl reaches the most dangerous sink in this app: openTab persists it into
// DesktopTab.url in localStorage, DesktopLayout turns it into iframeUrl, and
// IframeAgent renders <iframe src={activeUrl}>. The frame does carry a
// sandbox attribute, but it includes allow-scripts + allow-same-origin, which
// together leave a framed page free to script in its own inherited origin —
// the sandbox grants no protection against a malicious `src` itself. A
// `javascript:` (or any non-https) initial src reaching that iframe runs
// with the parent's (wallet's) origin — this is script execution holding the
// user's keys, not merely a bad link. Both the click launcher and the context
// menu's "Open in Tab" entry must gate appUrl exactly like repoUrl/websiteUrl
// already are above.
describe('InstalledProjectIcon — https gate on the appUrl -> openTab/iframe sink', () => {
  it('does not open a tab and falls back to the project page for a javascript: appUrl', () => {
    const project: ProjectSummary = { ...STANDALONE_PROJECT, type: PROJECT_TYPES.APP, appUrl: 'javascript:alert(1)', websiteUrl: null };
    const { container } = render(<InstalledProjectIcon project={project} />);
    fireEvent.click(container.querySelector('button')!);
    expect(openTab).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/apps/agent-guild');
  });

  it('does not open a tab and falls back to the project page for an http:// appUrl', () => {
    const project: ProjectSummary = { ...STANDALONE_PROJECT, type: PROJECT_TYPES.APP, appUrl: 'http://app.example.com', websiteUrl: null };
    const { container } = render(<InstalledProjectIcon project={project} />);
    fireEvent.click(container.querySelector('button')!);
    expect(openTab).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/apps/agent-guild');
  });

  it('renders no Open in Tab entry and never calls openTab for a javascript: appUrl', () => {
    const project: ProjectSummary = { ...STANDALONE_PROJECT, type: PROJECT_TYPES.APP, appUrl: 'javascript:alert(1)' };
    render(<InstalledProjectIcon project={project} />);
    openContextMenu();
    expect(screen.queryByRole('button', { name: 'Open in Tab' })).toBeNull();
    expect(openTab).not.toHaveBeenCalled();
  });

  it('renders no Open in Tab entry and never calls openTab for an http:// appUrl', () => {
    const project: ProjectSummary = { ...STANDALONE_PROJECT, type: PROJECT_TYPES.APP, appUrl: 'http://app.example.com' };
    render(<InstalledProjectIcon project={project} />);
    openContextMenu();
    expect(screen.queryByRole('button', { name: 'Open in Tab' })).toBeNull();
    expect(openTab).not.toHaveBeenCalled();
  });

  it('still offers Open in Tab and calls openTab for a normal https:// appUrl', () => {
    const project: ProjectSummary = { ...STANDALONE_PROJECT, type: PROJECT_TYPES.APP, appUrl: 'https://app.example.com' };
    render(<InstalledProjectIcon project={project} />);
    openContextMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Open in Tab' }));
    expect(openTab).toHaveBeenCalledWith('custom', { url: 'https://app.example.com', label: 'Agent Guild' });
  });
});
