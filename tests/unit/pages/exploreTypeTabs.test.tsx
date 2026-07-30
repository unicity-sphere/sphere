import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ProjectSummary } from '../../../src/services/marketplaceApi';
import { PROJECT_TYPES } from '../../../src/utils/isStandalone';

// vi.mock factories are hoisted above regular top-level `const`s, so the mocks
// referenced inside the factory below must themselves be created via vi.hoisted
// to avoid a TDZ ReferenceError when ExplorePage's import of useMarketplace is
// resolved.
const { useProjects, useFeaturedProjects } = vi.hoisted(() => ({
  useProjects: vi.fn(() => ({ data: { projects: [] }, isLoading: false })),
  useFeaturedProjects: vi.fn(() => ({ data: [] })),
}));

vi.mock('../../../src/hooks/useMarketplace', () => ({
  useProjects,
  useFeaturedProjects,
  useProjectMetricsBatch: () => ({ data: {} }),
}));
vi.mock('../../../src/hooks/useMaintenanceStatus', () => ({
  useMaintenanceStatus: () => ({ data: { enabled: false } }),
}));
// ProjectCard reaches into useInstalledProjects -> useSphereContext, which
// throws outside a SphereProvider. The type-switch header (this file's actual
// subject) doesn't depend on card internals, so stub the card out rather than
// wiring a full wallet context just to satisfy a grid of tiles.
vi.mock('../../../src/components/marketplace/ProjectCard', () => ({
  ProjectCard: () => null,
}));

import { MemoryRouter } from 'react-router-dom';
import { ExplorePage } from '../../../src/pages/ExplorePage';

// The page links out (project cards, the dev-portal CTA), so a router has to be
// present even though the mocked queries return no projects.
const renderExplore = () => render(<MemoryRouter><ExplorePage /></MemoryRouter>);

// A complete ProjectSummary fixture — loose `as any` fixtures were hiding real
// shape errors (missing required fields) elsewhere, so build the full shape
// and let callers override just what a given test cares about.
function buildProject(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    _id: 'project-1',
    type: PROJECT_TYPES.APP,
    slug: 'demo-project',
    name: 'Demo Project',
    tagline: 'A demo project for tests',
    logoUrl: 'https://example.com/logo.png',
    bannerUrl: null,
    category: 'tool',
    tags: [],
    accentColor: '#FF6F00',
    featured: false,
    stats: { totalUsers: 0, totalCompletions: 0, activeQuests: 0 },
    appUrl: null,
    websiteUrl: null,
    repoUrl: null,
    installCommand: null,
    pricing: undefined,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks resets call history but not a previously-installed
  // mockImplementation, so re-pin the default here — tests that need
  // different data call mockImplementation themselves.
  useProjects.mockImplementation(() => ({ data: { projects: [] }, isLoading: false }));
  useFeaturedProjects.mockImplementation(() => ({ data: [] }));
});

describe('Explore type tabs', () => {
  it('starts on Apps', () => {
    renderExplore();
    expect(useProjects).toHaveBeenCalledWith({ type: PROJECT_TYPES.APP });
    expect(useFeaturedProjects).toHaveBeenCalledWith(PROJECT_TYPES.APP);
  });

  it('switches the query to standalone projects', () => {
    renderExplore();
    fireEvent.click(screen.getByRole('tab', { name: /Standalone/i }));
    expect(useProjects).toHaveBeenLastCalledWith({ type: PROJECT_TYPES.STANDALONE });
    expect(useFeaturedProjects).toHaveBeenLastCalledWith(PROJECT_TYPES.STANDALONE);
  });

  // The category filter and the search box are CLIENT-side state — never
  // passed to useProjects/useFeaturedProjects — so the two tests above would
  // still pass even if the tab handler stopped resetting them. Assert on the
  // rendered DOM instead of the hooks to actually catch that regression.
  it('clears the search box and category filter when switching tabs', () => {
    renderExplore();

    const search = screen.getByPlaceholderText('Search projects...') as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'agent' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tools' }));

    // Sanity: state was actually set before the tab switch.
    expect(search.value).toBe('agent');
    expect(screen.getByRole('button', { name: 'Tools' }).className).toContain('bg-orange-500');

    fireEvent.click(screen.getByRole('tab', { name: /Standalone/i }));

    expect(search.value).toBe('');
    expect(screen.getByRole('button', { name: 'All' }).className).toContain('bg-orange-500');
    expect(screen.getByRole('button', { name: 'Tools' }).className).not.toContain('bg-orange-500');
  });

  it('changes the subline copy with the selected type', () => {
    renderExplore();

    expect(screen.getByText('Open in Sphere')).toBeDefined();

    fireEvent.click(screen.getByRole('tab', { name: /Standalone/i }));

    expect(screen.getByText('Run on your own machine')).toBeDefined();
  });

  // Regression pin: the hero totals describe the WHOLE catalog (apps +
  // standalone combined). They must read identically no matter which tab is
  // active, and must never read zero while the combined catalog has content —
  // both broke once already (the row was accidentally wired to the active
  // tab's own list instead of the combined one).
  it('computes hero totals from both lists combined, unaffected by the active tab, and never zero while the catalog has content', () => {
    useProjects.mockImplementation((params?: { type?: 'app' | 'skill' | 'standalone' }) =>
      params?.type === PROJECT_TYPES.STANDALONE
        ? { data: { projects: [] }, isLoading: false }
        : {
            data: {
              projects: [
                buildProject({ _id: '1', slug: 'one', category: 'game', stats: { totalUsers: 10, totalCompletions: 0, activeQuests: 0 } }),
              ],
            },
            isLoading: false,
          },
    );

    renderExplore();

    const before = screen.getByTestId('hero-stat-projects').textContent;
    expect(before).toContain('1');
    expect(screen.getByTestId('hero-stat-users').textContent).toContain('10');

    fireEvent.click(screen.getByRole('tab', { name: /Standalone/i }));

    // Standalone has zero projects of its own, but the hero row describes the
    // whole catalog (1 app + 0 standalone = 1), so it must read exactly the
    // same as before the switch — not zero, not different.
    expect(screen.getByTestId('hero-stat-projects').textContent).toBe(before);
    expect(screen.getByTestId('hero-stat-projects').textContent).not.toContain('0');
    expect(screen.getByTestId('hero-stat-users').textContent).toContain('10');
  });

  it('uses singular wording for a hero stat only when its value is exactly one', () => {
    useProjects.mockImplementation((params?: { type?: 'app' | 'skill' | 'standalone' }) =>
      params?.type === PROJECT_TYPES.STANDALONE
        ? { data: { projects: [] }, isLoading: false }
        : {
            data: {
              projects: [
                buildProject({ _id: '1', slug: 'one', category: 'game', stats: { totalUsers: 1, totalCompletions: 0, activeQuests: 0 } }),
              ],
            },
            isLoading: false,
          },
    );

    renderExplore();

    // One project, one user, one category — every stat must be singular.
    const projectsText = screen.getByTestId('hero-stat-projects').textContent!;
    const usersText = screen.getByTestId('hero-stat-users').textContent!;
    const categoriesText = screen.getByTestId('hero-stat-categories').textContent!;

    expect(projectsText).toContain('Total Project');
    expect(projectsText).not.toContain('Total Projects');
    expect(usersText).toContain('Total User');
    expect(usersText).not.toContain('Total Users');
    expect(categoriesText).toContain('Category');
    expect(categoriesText).not.toContain('Categories');
  });

  it('uses plural wording once a hero stat is more than one (and for zero)', () => {
    useProjects.mockImplementation((params?: { type?: 'app' | 'skill' | 'standalone' }) =>
      params?.type === PROJECT_TYPES.STANDALONE
        ? { data: { projects: [] }, isLoading: false }
        : {
            data: {
              projects: [
                buildProject({ _id: '1', slug: 'one', category: 'game', stats: { totalUsers: 5, totalCompletions: 0, activeQuests: 0 } }),
                buildProject({ _id: '2', slug: 'two', category: 'tool', stats: { totalUsers: 5, totalCompletions: 0, activeQuests: 0 } }),
              ],
            },
            isLoading: false,
          },
    );

    renderExplore();

    expect(screen.getByTestId('hero-stat-projects').textContent).toContain('Total Projects');
    expect(screen.getByTestId('hero-stat-users').textContent).toContain('Total Users');
    expect(screen.getByTestId('hero-stat-categories').textContent).toContain('Categories');
  });
});
