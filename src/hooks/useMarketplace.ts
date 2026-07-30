import { useQuery } from '@tanstack/react-query';
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
} from '../services/marketplaceApi';
import { useMarketplaceEnabled } from './useMaintenanceStatus';

// Every query below talks to the sphere-api marketplace/metrics routes, which the
// maintenance gate answers with 503 while `sphere` is under maintenance. Gating on
// `useMarketplaceEnabled()` means the requests simply don't fire in that window, so
// the browser never logs the (expected) 503s as red console errors. The wallet core
// is unaffected — it talks to the chain/SDK, not sphere-api.

export function useProjects(params?: { type?: 'app' | 'skill' | 'sdk'; category?: string; search?: string; sort?: string; page?: number; limit?: number }) {
  const marketplaceEnabled = useMarketplaceEnabled();
  return useQuery({
    queryKey: ['marketplace', 'projects', params],
    queryFn: () => fetchProjects(params),
    enabled: marketplaceEnabled,
    staleTime: 5 * 60_000,
  });
}

export function useFeaturedProjects(type?: 'app' | 'skill' | 'sdk') {
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

export function useProjectQuests(slug: string) {
  const marketplaceEnabled = useMarketplaceEnabled();
  return useQuery({
    queryKey: ['marketplace', 'project-quests', slug],
    queryFn: () => fetchProjectQuests(slug),
    enabled: marketplaceEnabled && !!slug,
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

export function useCategories() {
  const marketplaceEnabled = useMarketplaceEnabled();
  return useQuery({
    queryKey: ['marketplace', 'categories'],
    queryFn: fetchCategories,
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
