import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { ProjectSummary, MarketplaceStats, CategoryCount } from '../../../src/services/marketplaceApi';
import { PROJECT_TYPES } from '../../../src/utils/isStandalone';

import type { ProjectType } from '../../../src/utils/isStandalone';

type ProjectQueryParams = { type?: ProjectType; category?: string | null; search?: string; sort?: string };

type InfinitePage = { projects: ProjectSummary[]; total: number; page: number; limit: number; totalPages: number };
type InfiniteResult = {
  data?: { pages: InfinitePage[] };
  isLoading: boolean;
  isPlaceholderData?: boolean;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
};

// vi.mock factories are hoisted above regular top-level `const`s, so the mocks
// referenced inside the factory below must themselves be created via vi.hoisted
// to avoid a TDZ ReferenceError when ExplorePage's import of useMarketplace is
// resolved.
// Typed against the real hooks: `vi.fn(() => …)` would infer a ZERO-arg mock
// returning `projects: never[]`, so every mockImplementation that takes `params`
// or returns real projects fails to compile.
type ProjectsQuery = (params: ProjectQueryParams) => InfiniteResult;
type FeaturedQuery = () => { data?: ProjectSummary[] };
type StatsQuery    = () => { data?: MarketplaceStats };
type CategoriesQuery = (type?: ProjectType) => { data?: CategoryCount[] };

const { useInfiniteProjects, useFeaturedProjects, useMarketplaceStats, useCategories } = vi.hoisted(() => ({
  useInfiniteProjects: vi.fn<ProjectsQuery>(() => ({ data: { pages: [] }, isLoading: false })),
  useFeaturedProjects: vi.fn<FeaturedQuery>(() => ({ data: [] })),
  useMarketplaceStats: vi.fn<StatsQuery>(() => ({ data: undefined })),
  useCategories:       vi.fn<CategoriesQuery>(() => ({ data: [] })),
}));

vi.mock('../../../src/hooks/useMarketplace', () => ({
  useInfiniteProjects,
  useFeaturedProjects,
  useMarketplaceStats,
  useCategories,
  useProjectMetricsByGroups: () => ({}),
}));
vi.mock('../../../src/hooks/useMaintenanceStatus', () => ({
  useMaintenanceStatus: () => ({ data: { enabled: false } }),
}));
// ProjectCard reaches into useInstalledProjects -> useSphereContext, which
// throws outside a SphereProvider. The type-switch header (this file's actual
// subject) doesn't depend on card internals, so stub the card out rather than
// wiring a full wallet context just to satisfy a grid of tiles.
vi.mock('../../../src/components/marketplace/ProjectCard', () => ({
  ProjectCard: ({ project }: { project: ProjectSummary }) => <div data-testid="project-card">{project.name}</div>,
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

/** One page of results, with the catalog-wide `total` the server reports. */
function buildPage(projects: ProjectSummary[], total = projects.length, page = 1, limit = 24): InfinitePage {
  return { projects, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

function buildStats(overrides: Partial<MarketplaceStats> = {}): MarketplaceStats {
  return {
    totalProjects: 0,
    totalUsers: 0,
    totalCategories: 0,
    byType: { app: 0, skill: 0, standalone: 0 },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks resets call history but not a previously-installed
  // mockImplementation, so re-pin the defaults here — tests that need
  // different data call mockImplementation themselves.
  useInfiniteProjects.mockImplementation(() => ({ data: { pages: [] }, isLoading: false }));
  useFeaturedProjects.mockImplementation(() => ({ data: [] }));
  useMarketplaceStats.mockImplementation(() => ({ data: undefined }));
  useCategories.mockImplementation(() => ({ data: [] }));
});

describe('Explore type tabs', () => {
  it('starts on Apps', () => {
    renderExplore();
    expect(useInfiniteProjects).toHaveBeenCalledWith(
      expect.objectContaining({ type: PROJECT_TYPES.APP }),
    );
    expect(useFeaturedProjects).toHaveBeenCalledWith(PROJECT_TYPES.APP);
  });

  it('switches the query to standalone projects', () => {
    renderExplore();
    fireEvent.click(screen.getByRole('tab', { name: /Standalone/i }));
    expect(useInfiniteProjects).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: PROJECT_TYPES.STANDALONE }),
    );
    expect(useFeaturedProjects).toHaveBeenLastCalledWith(PROJECT_TYPES.STANDALONE);
  });

  it('scopes the category chips to the active tab', () => {
    renderExplore();
    expect(useCategories).toHaveBeenLastCalledWith(PROJECT_TYPES.APP);

    fireEvent.click(screen.getByRole('tab', { name: /Standalone/i }));

    // Chips built from the whole catalog would offer a filter that returns
    // nothing on the tab the user is looking at.
    expect(useCategories).toHaveBeenLastCalledWith(PROJECT_TYPES.STANDALONE);
  });

  it('clears the search box and category filter when switching tabs', () => {
    useCategories.mockImplementation(() => ({ data: [{ category: 'tool', count: 3 }] }));
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
});

/**
 * The hero row describes the whole published catalog. It used to be derived
 * from the loaded project list, which is exactly how it came to report 20
 * while the catalog held 24 — and paging would only have made that worse.
 * These pin that it reads catalog-wide totals from the API instead.
 */
describe('Explore hero totals', () => {
  it('reports the catalog total, not the number of loaded cards', () => {
    useMarketplaceStats.mockImplementation(() => ({
      data: buildStats({ totalProjects: 24, byType: { app: 24, skill: 0, standalone: 0 }, totalUsers: 900, totalCategories: 8 }),
    }));
    useInfiniteProjects.mockImplementation(() => ({
      // Only the first page is loaded — 20 of the 24.
      data: { pages: [buildPage(Array.from({ length: 20 }, (_, i) => buildProject({ _id: `p${i}`, slug: `p${i}` })), 24, 1, 20)] },
      isLoading: false,
    }));

    renderExplore();

    expect(screen.getByTestId('hero-stat-projects').textContent).toContain('24');
    expect(screen.getByTestId('hero-stat-categories').textContent).toContain('8');
  });

  it('stays identical across a tab switch, and never collapses to zero while the catalog has content', () => {
    useMarketplaceStats.mockImplementation(() => ({
      data: buildStats({ byType: { app: 7, skill: 0, standalone: 0 }, totalUsers: 10, totalCategories: 3 }),
    }));
    // The standalone tab is empty; the hero must not follow it down.
    useInfiniteProjects.mockImplementation((params) =>
      params.type === PROJECT_TYPES.STANDALONE
        ? { data: { pages: [buildPage([], 0)] }, isLoading: false }
        : { data: { pages: [buildPage([buildProject()])] }, isLoading: false },
    );

    renderExplore();
    const before = screen.getByTestId('hero-stat-projects').textContent;
    expect(before).toContain('7');

    fireEvent.click(screen.getByRole('tab', { name: /Standalone/i }));

    expect(screen.getByTestId('hero-stat-projects').textContent).toBe(before);
    expect(screen.getByTestId('hero-stat-users').textContent).toContain('10');
  });

  it('counts only the types the tabs can reach, so the total is never unreachable', () => {
    // A published `skill` has no tab on Explore. Counting it here would
    // reproduce the original complaint in a new place: a headline number
    // larger than anything the page can show.
    useMarketplaceStats.mockImplementation(() => ({
      data: buildStats({ totalProjects: 29, byType: { app: 20, skill: 5, standalone: 4 } }),
    }));

    renderExplore();

    expect(screen.getByTestId('hero-stat-projects').textContent).toContain('24');
    expect(screen.getByTestId('hero-stat-projects').textContent).not.toContain('29');
  });

  it('uses singular wording for a hero stat only when its value is exactly one', () => {
    useMarketplaceStats.mockImplementation(() => ({
      data: buildStats({ byType: { app: 1, skill: 0, standalone: 0 }, totalUsers: 1, totalCategories: 1 }),
    }));

    renderExplore();

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
    useMarketplaceStats.mockImplementation(() => ({
      data: buildStats({ byType: { app: 2, skill: 0, standalone: 0 }, totalUsers: 10, totalCategories: 2 }),
    }));

    renderExplore();

    expect(screen.getByTestId('hero-stat-projects').textContent).toContain('Total Projects');
    expect(screen.getByTestId('hero-stat-users').textContent).toContain('Total Users');
    expect(screen.getByTestId('hero-stat-categories').textContent).toContain('Categories');
  });
});

/**
 * The reported bug: 24 published projects, 20 visible. The list is paged now,
 * so the page must both say how many there are and offer a way to reach them.
 */
describe('Explore paging', () => {
  const twentyOf24 = () => ({
    data: { pages: [buildPage(Array.from({ length: 20 }, (_, i) => buildProject({ _id: `p${i}`, slug: `p${i}` })), 24, 1, 20)] },
    isLoading: false,
    hasNextPage: true,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
    isPlaceholderData: false,
  });

  it('shows the catalog-wide match count next to the grid heading, not the loaded count', () => {
    useInfiniteProjects.mockImplementation(twentyOf24);

    renderExplore();

    expect(screen.getByTestId('grid-total').textContent).toBe('(24)');
  });

  it('offers a Load more control that names what is left', () => {
    useInfiniteProjects.mockImplementation(twentyOf24);

    renderExplore();

    expect(screen.getByRole('button', { name: /Load more \(20 of 24\)/ })).toBeDefined();
  });

  it('asks for the next page when Load more is pressed', () => {
    const fetchNextPage = vi.fn();
    useInfiniteProjects.mockImplementation(() => ({ ...twentyOf24(), fetchNextPage }));

    renderExplore();
    fireEvent.click(screen.getByRole('button', { name: /Load more/ }));

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('renders every loaded page, not just the first', () => {
    useInfiniteProjects.mockImplementation(() => ({
      data: {
        pages: [
          buildPage([buildProject({ _id: 'a', slug: 'a', name: 'First Page App' })], 2, 1, 1),
          buildPage([buildProject({ _id: 'b', slug: 'b', name: 'Second Page App' })], 2, 2, 1),
        ],
      },
      isLoading: false,
      hasNextPage: false,
    }));

    renderExplore();

    expect(screen.getByText('First Page App')).toBeDefined();
    expect(screen.getByText('Second Page App')).toBeDefined();
  });

  it('never renders the same project twice when pages overlap', () => {
    // The server sort is a total order, but a project published between two
    // page requests still shifts the window — a duplicated card is worse
    // than a late one.
    const dup = buildProject({ _id: 'same', slug: 'same', name: 'Overlapping App' });
    useInfiniteProjects.mockImplementation(() => ({
      data: { pages: [buildPage([dup], 2, 1, 1), buildPage([dup], 2, 2, 1)] },
      isLoading: false,
      hasNextPage: false,
    }));

    renderExplore();

    expect(screen.getAllByText('Overlapping App')).toHaveLength(1);
  });

  it('hides Load more once the last page is in', () => {
    useInfiniteProjects.mockImplementation(() => ({
      data: { pages: [buildPage([buildProject()])] },
      isLoading: false,
      hasNextPage: false,
    }));

    renderExplore();

    expect(screen.queryByRole('button', { name: /Load more/ })).toBeNull();
  });

  it('disables Load more while the shown results are stale', () => {
    // The next page number is derived from results that are about to be
    // replaced, so paging from a placeholder frame would fetch the wrong page.
    useInfiniteProjects.mockImplementation(() => ({ ...twentyOf24(), isPlaceholderData: true }));

    renderExplore();

    expect(screen.getByRole('button', { name: /Load more/ })).toHaveProperty('disabled', true);
  });
});

/**
 * Search and category filtering happen on the SERVER now. Filtering the
 * loaded page in the browser is what made a project past page 1 impossible
 * to find by typing its name.
 */
describe('Explore server-side filtering', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); });
  afterEach(() => { vi.useRealTimers(); });

  it('sends the typed term to the query once typing settles', () => {
    renderExplore();

    fireEvent.change(screen.getByPlaceholderText('Search projects...'), { target: { value: 'needle' } });
    act(() => { vi.advanceTimersByTime(300); });

    expect(useInfiniteProjects).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: PROJECT_TYPES.APP, search: 'needle' }),
    );
  });

  it('does not fire a query for every keystroke', () => {
    renderExplore();
    const input = screen.getByPlaceholderText('Search projects...');

    fireEvent.change(input, { target: { value: 'n' } });
    fireEvent.change(input, { target: { value: 'ne' } });
    fireEvent.change(input, { target: { value: 'nee' } });

    // Nothing has settled yet, so no intermediate term reached the query.
    const searchTerms = useInfiniteProjects.mock.calls.map(([p]) => p.search);
    expect(searchTerms).not.toContain('n');
    expect(searchTerms).not.toContain('ne');

    act(() => { vi.advanceTimersByTime(300); });

    expect(useInfiniteProjects).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'nee' }));
  });

  it('clears the search immediately rather than after the debounce', () => {
    renderExplore();
    const input = screen.getByPlaceholderText('Search projects...');

    fireEvent.change(input, { target: { value: 'needle' } });
    act(() => { vi.advanceTimersByTime(300); });
    fireEvent.change(input, { target: { value: '' } });

    // A user who empties the box expects the full list back at once, and
    // waiting the delay out would fire one request for a term already gone.
    expect(useInfiniteProjects).toHaveBeenLastCalledWith(expect.objectContaining({ search: '' }));
  });

  it('sends the chosen category to the query instead of filtering loaded cards', () => {
    useCategories.mockImplementation(() => ({ data: [{ category: 'game', count: 6 }] }));
    renderExplore();

    fireEvent.click(screen.getByRole('button', { name: 'Games' }));

    expect(useInfiniteProjects).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: 'game' }),
    );
  });

  it('names the term in the empty state so a fruitless search is legible', () => {
    useInfiniteProjects.mockImplementation(() => ({ data: { pages: [buildPage([], 0)] }, isLoading: false }));
    renderExplore();

    fireEvent.change(screen.getByPlaceholderText('Search projects...'), { target: { value: 'nothing' } });
    act(() => { vi.advanceTimersByTime(300); });

    expect(screen.getByText(/No projects match/)).toBeDefined();
  });
});

/**
 * The chips were a hardcoded four (game/defi/social/tool) while the catalog
 * held eight categories, so utility/nft/trading/other were unreachable by any
 * filter — a second way the page hid published projects.
 */
describe('Explore category chips', () => {
  it('renders whatever categories the API reports, including ones no list hardcodes', () => {
    useCategories.mockImplementation(() => ({
      data: [
        { category: 'game', count: 6 },
        { category: 'utility', count: 5 },
        { category: 'trading', count: 1 },
      ],
    }));

    renderExplore();

    expect(screen.getByRole('button', { name: 'Games' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Utility' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Trading' })).toBeDefined();
  });
});
