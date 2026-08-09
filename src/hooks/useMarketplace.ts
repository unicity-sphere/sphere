import { useQuery, useInfiniteQuery, useQueries } from '@tanstack/react-query';
import {
  fetchProjects,
  fetchFeaturedProjects,
  fetchProject,
  fetchProjectQuests,
  fetchProjectAchievements,
  fetchProjectMetrics,
  fetchProjectMetricsBatch,
  fetchProjectRatings,
  fetchRatingReplies,
  fetchCategories,
  fetchMarketplaceStats,
  type PaginatedProjects,
  type ProjectDetail,
  type ProjectMetrics,
} from '../services/marketplaceApi';
import { useMarketplaceEnabled } from './useMaintenanceStatus';
import type { ProjectType } from '../utils/isStandalone';

// Every query below talks to the sphere-api marketplace/metrics routes, which the
// maintenance gate answers with 503 while `sphere` is under maintenance. Gating on
// `useMarketplaceEnabled()` means the requests simply don't fire in that window, so
// the browser never logs the (expected) 503s as red console errors. The wallet core
// is unaffected — it talks to the chain/SDK, not sphere-api.

/**
 * Explore's page size.
 *
 * Deliberately above the server's 20 default so today's catalog arrives in a
 * single request, and well under both the server's own 50 cap and the metrics
 * endpoint's 100-id batch limit. It also divides evenly into every column
 * count the Explore grid produces (1/2/3/4/6 under auto-fill minmax(280px)),
 * so a full page never leaves a ragged last row.
 */
export const EXPLORE_PAGE_SIZE = 24;

export interface ProjectsQueryParams {
  type?:     ProjectType;
  category?: string | null;
  search?:   string;
  sort?:     string;
}

/**
 * Paged project list — the whole catalog, one page at a time.
 *
 * Filtering (`search`, `category`) is part of the query key and therefore
 * happens on the SERVER. It used to be done in the browser over whatever the
 * single unpaginated request had returned, which meant a project past the
 * first page could not be found by typing its name at all.
 *
 * `placeholderData` keeps the previous page visible while a new search term
 * settles, so typing dims the grid instead of replacing it with skeletons and
 * flashing "No projects found" between keystrokes. It deliberately refuses to
 * carry data across a TYPE change: an app card rendered under the Standalone
 * tab carries no badge to say otherwise, so a stale frame there would be a
 * lie rather than a rough edge.
 */
export function useInfiniteProjects(params: ProjectsQueryParams) {
  const marketplaceEnabled = useMarketplaceEnabled();
  const category = params.category ?? undefined;
  const search   = params.search?.trim() || undefined;
  const key = { type: params.type, category, search, sort: params.sort, limit: EXPLORE_PAGE_SIZE };

  return useInfiniteQuery({
    queryKey: ['marketplace', 'projects', 'infinite', key] as const,
    queryFn: ({ pageParam }) => fetchProjects({
      type: params.type, category, search, sort: params.sort,
      page: pageParam, limit: EXPLORE_PAGE_SIZE,
    }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: PaginatedProjects) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    placeholderData: (previous, previousQuery) => {
      const previousKey = previousQuery?.queryKey[3] as typeof key | undefined;
      return previousKey?.type === params.type ? previous : undefined;
    },
    enabled: marketplaceEnabled,
    staleTime: 5 * 60_000,
  });
}

/**
 * Catalog-wide totals for the Explore hero, counted server-side. The hero row
 * describes the whole catalog, so it cannot be derived from a page of results
 * — that is precisely what made it report the page size instead of the total.
 */
export function useMarketplaceStats() {
  const marketplaceEnabled = useMarketplaceEnabled();
  return useQuery({
    queryKey: ['marketplace', 'stats'],
    queryFn: fetchMarketplaceStats,
    enabled: marketplaceEnabled,
    staleTime: 5 * 60_000,
  });
}

export function useFeaturedProjects(type?: ProjectType) {
  const marketplaceEnabled = useMarketplaceEnabled();
  return useQuery({
    queryKey: ['marketplace', 'featured', type],
    queryFn: () => fetchFeaturedProjects(type),
    enabled: marketplaceEnabled,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export function useProject(slug: string, preview?: boolean) {
  const marketplaceEnabled = useMarketplaceEnabled();
  return useQuery({
    queryKey: ['marketplace', 'project', slug, { preview }],
    queryFn: () => fetchProject(slug, preview),
    enabled: marketplaceEnabled && !!slug,
  });
}

/**
 * `enabled` lets a caller skip the request entirely once it already knows
 * (from the project's own data) that this project's type doesn't support
 * quests — e.g. `useProjectQuests(slug, supportsQuests(project?.type))` on
 * ProjectPage. Defaults to `true` so existing callers are unaffected.
 */
export function useProjectQuests(slug: string, enabled = true) {
  const marketplaceEnabled = useMarketplaceEnabled();
  return useQuery({
    queryKey: ['marketplace', 'project-quests', slug],
    queryFn: () => fetchProjectQuests(slug),
    enabled: marketplaceEnabled && !!slug && enabled,
  });
}

export function useProjectAchievements(slug: string) {
  const marketplaceEnabled = useMarketplaceEnabled();
  return useQuery({
    queryKey: ['marketplace', 'project-achievements', slug],
    queryFn: () => fetchProjectAchievements(slug),
    enabled: marketplaceEnabled && !!slug,
  });
}

/**
 * Category chips with their counts. Scoped to a project type when given, so
 * the chips shown under a tab can only offer filters that tab can satisfy.
 */
export function useCategories(type?: ProjectType) {
  const marketplaceEnabled = useMarketplaceEnabled();
  return useQuery({
    queryKey: ['marketplace', 'categories', type],
    queryFn: () => fetchCategories(type),
    enabled: marketplaceEnabled,
    staleTime: 10 * 60_000,
  });
}

export function useProjectMetrics(projectId: string | undefined) {
  const marketplaceEnabled = useMarketplaceEnabled();
  return useQuery({
    queryKey: ['metrics', 'project', projectId],
    queryFn: () => fetchProjectMetrics(projectId!),
    enabled: marketplaceEnabled && !!projectId,
    staleTime: 60_000,
  });
}

export function useProjectMetricsBatch(projectIds: string[]) {
  const marketplaceEnabled = useMarketplaceEnabled();
  return useQuery({
    queryKey: ['metrics', 'projects', projectIds.slice().sort().join(',')],
    queryFn: () => fetchProjectMetricsBatch(projectIds),
    enabled: marketplaceEnabled && projectIds.length > 0,
    staleTime: 60_000,
  });
}

/**
 * Metrics for a list that grows page by page.
 *
 * One query per GROUP of ids rather than one query over the accumulated list:
 * a group's ids never change once loaded, so its metrics stay cached and
 * loading page N costs exactly one metrics request instead of re-fetching
 * every project seen so far.
 *
 * Pass groups whose membership is stable — Explore passes one group per
 * loaded page plus one for the featured carousel.
 */
export function useProjectMetricsByGroups(groups: string[][]) {
  const marketplaceEnabled = useMarketplaceEnabled();
  const nonEmpty = groups.filter(g => g.length > 0);

  const results = useQueries({
    queries: nonEmpty.map(ids => ({
      queryKey: ['metrics', 'projects', ids.slice().sort().join(',')],
      queryFn:  () => fetchProjectMetricsBatch(ids),
      enabled:  marketplaceEnabled,
      staleTime: 60_000,
    })),
  });

  // Merged outside `combine` so the merge is not re-run by react-query on
  // every render of every consumer; the join key below is what makes the
  // memo in the calling component cheap.
  const merged: Record<string, ProjectMetrics> = {};
  for (const r of results) if (r.data) Object.assign(merged, r.data);
  return merged;
}

/**
 * Resolve a known set of slugs to full projects.
 *
 * The desktop needs the project behind each INSTALLED slug, which is a
 * lookup, not a listing — reading it off the marketplace's first page meant
 * an app outside that page resolved to nothing and its icon silently
 * vanished from the user's desktop. Each slug is its own query, sharing the
 * exact cache entry `useProject` uses, so opening a project page warms this
 * and vice versa.
 */
export function useProjectsBySlugs(slugs: string[]) {
  const marketplaceEnabled = useMarketplaceEnabled();

  const results = useQueries({
    queries: slugs.map(slug => ({
      // Same key shape as useProject(slug) — a shared cache entry, not a copy.
      queryKey: ['marketplace', 'project', slug, { preview: undefined }],
      queryFn:  () => fetchProject(slug),
      enabled:  marketplaceEnabled && !!slug,
      staleTime: 5 * 60_000,
      // A slug can point at a project that was unpublished or removed. That
      // is an expected 404, not a transient failure, so don't retry it — the
      // caller simply renders nothing for it, exactly as before.
      retry: false,
    })),
  });

  const bySlug = new Map<string, ProjectDetail>();
  results.forEach((r, i) => { if (r.data) bySlug.set(slugs[i], r.data); });
  return bySlug;
}

export function useProjectRatings(slug: string | undefined, page = 1, sort: 'helpful' | 'recent' = 'helpful') {
  const marketplaceEnabled = useMarketplaceEnabled();
  return useQuery({
    queryKey: ['marketplace', 'ratings', slug, page, sort],
    queryFn: () => fetchProjectRatings(slug!, page, 20, sort),
    enabled: marketplaceEnabled && !!slug,
    staleTime: 30_000,
  });
}

export function useRatingReplies(ratingId: string | undefined, enabled = true) {
  const marketplaceEnabled = useMarketplaceEnabled();
  return useQuery({
    queryKey: ['marketplace', 'replies', ratingId],
    queryFn: () => fetchRatingReplies(ratingId!),
    enabled: marketplaceEnabled && enabled && !!ratingId,
    staleTime: 15_000,
  });
}
