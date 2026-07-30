import type { ProjectType } from '../utils/isStandalone';

const API_BASE = import.meta.env.VITE_SPHERE_API_URL ?? 'http://localhost:3001';

// ── Types ─────────────────────────────────────────────────────────────
export interface ProjectSummary {
  _id: string;
  type: ProjectType;
  slug: string;
  name: string;
  tagline: string;
  logoUrl: string;
  bannerUrl?: string | null;
  category: string;
  tags: string[];
  accentColor: string;
  featured: boolean;
  stats: { totalUsers: number; totalCompletions: number; activeQuests: number };
  appUrl?: string | null;
  websiteUrl?: string | null;
  repoUrl: string | null;
  installCommand: string | null;
  pricing?: { model: string; priceUCT: number | null };
}

export interface PaginatedProjects {
  projects: ProjectSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProjectDetail extends ProjectSummary {
  description: string;
  bannerUrl: string | null;
  media: { type: string; url: string; caption?: string | null }[];
  websiteUrl: string | null;
  appUrl: string | null;
  socialLinks: { twitter: string | null; discord: string | null; telegram: string | null };
  pointsConfig: { name: string; icon: string | null; symbol: string };
}

export interface ProjectQuest {
  _id: string;
  title: string;
  description: string;
  points: number;
  platform: string | null;
  imageUrl: string | null;
  tags: string[];
  questType: string;
  /** Active track this quest belongs to; null for trackless quests. */
  track?: { slug: string; title: string; sortOrder: number } | null;
}

export interface ProjectAchievement {
  _id: string;
  title: string;
  description: string;
  points: number;
  source: string;
  target: number;
  imageUrl: string | null;
}

export interface CategoryCount {
  category: string;
  count: number;
}

// ── Fetch helpers ─────────────────────────────────────────────────────

/** Central fetch wrapper — adds X-Client header and handles 503 maintenance gate. */
async function marketplaceFetch(url: string): Promise<Response> {
  const res = await fetch(url, { headers: { 'x-client': 'sphere' } });
  if (res.status === 503) {
    const body = await res.clone().json().catch(() => null) as { error?: string; message?: string } | null;
    if (body?.error === 'under_maintenance') {
      window.dispatchEvent(new CustomEvent('maintenance:forced', { detail: { message: body.message } }));
    }
  }
  return res;
}

async function get<T>(path: string): Promise<T> {
  const res = await marketplaceFetch(`${API_BASE}/api/marketplace${path}`);
  if (!res.ok) throw new Error(`Marketplace API error: ${res.status}`);
  return res.json();
}

// ── API functions ─────────────────────────────────────────────────────
export function fetchProjects(params?: {
  type?: ProjectType;
  category?: string;
  search?: string;
  sort?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
}): Promise<PaginatedProjects> {
  const sp = new URLSearchParams();
  if (params?.type) sp.set('type', params.type);
  if (params?.category) sp.set('category', params.category);
  if (params?.search) sp.set('search', params.search);
  if (params?.sort) sp.set('sort', params.sort);
  if (params?.featured) sp.set('featured', 'true');
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  const qs = sp.toString();
  return get(`${qs ? `?${qs}` : ''}`);
}

export function fetchFeaturedProjects(type?: ProjectType): Promise<ProjectSummary[]> {
  return get(type ? `/featured?type=${type}` : '/featured');
}

export function fetchProject(slug: string, preview?: boolean): Promise<ProjectDetail> {
  return get(preview ? `/${slug}?preview=true` : `/${slug}`);
}

export function fetchProjectQuests(slug: string): Promise<ProjectQuest[]> {
  return get(`/${slug}/quests`);
}

export function fetchProjectAchievements(slug: string): Promise<ProjectAchievement[]> {
  return get(`/${slug}/achievements`);
}

export function fetchCategories(): Promise<CategoryCount[]> {
  return get('/categories');
}

// ── Public project metrics (live user/install/completion counts) ──────

export interface ProjectMetrics {
  projectId:        string;
  /** completers ∪ installers — canonical "users" number */
  uniqueUsers:      number;
  /** wallets that completed a quest or claimed an achievement */
  completers:       number;
  /** wallets that ever installed (active + uninstalled) */
  installers:       number;
  /** wallets that currently have it installed */
  activeInstallers: number;
  totalCompletions: number;
  activeQuests:     number;
  /** Total reviews left on the project */
  ratingCount:      number;
  positiveCount:    number;
  negativeCount:    number;
  /** 0..100 integer (0 if no ratings) */
  positivePercent:  number;
}

export async function fetchProjectMetrics(projectId: string): Promise<ProjectMetrics> {
  const res = await marketplaceFetch(`${API_BASE}/api/metrics/projects/${projectId}`);
  if (!res.ok) throw new Error(`Metrics API error: ${res.status}`);
  return res.json();
}

export async function fetchProjectMetricsBatch(projectIds: string[]): Promise<Record<string, ProjectMetrics>> {
  if (projectIds.length === 0) return {};
  const res = await marketplaceFetch(`${API_BASE}/api/metrics/projects?ids=${projectIds.join(',')}`);
  if (!res.ok) throw new Error(`Metrics API error: ${res.status}`);
  return res.json();
}

// ── Public project ratings (Steam-style reviews) ──────────────────────

export interface ProjectRatingEntry {
  _id:             string;
  userAddress:     string;
  userNametag:     string | null;
  recommended:     boolean;
  comment:         string | null;
  helpfulCount:    number;
  notHelpfulCount: number;
  replyCount:      number;
  createdAt:       string;
  updatedAt:       string;
}

export interface PaginatedRatings {
  ratings:    ProjectRatingEntry[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export async function fetchProjectRatings(
  slug: string,
  page = 1,
  limit = 20,
  sort: 'helpful' | 'recent' = 'helpful',
): Promise<PaginatedRatings> {
  const res = await marketplaceFetch(`${API_BASE}/api/marketplace/${slug}/ratings?page=${page}&limit=${limit}&sort=${sort}`);
  if (!res.ok) throw new Error(`Ratings API error: ${res.status}`);
  return res.json();
}

// ── Public reply thread for a single rating ───────────────────────────

export interface RatingReplyEntry {
  _id:         string;
  ratingId:    string;
  userAddress: string;
  userNametag: string | null;
  comment:     string;
  createdAt:   string;
  quoted: null | {
    _id:         string;
    userAddress: string;
    userNametag: string | null;
    comment:     string;
  };
}

export interface PaginatedReplies {
  replies:    RatingReplyEntry[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export async function fetchRatingReplies(ratingId: string, page = 1, limit = 50): Promise<PaginatedReplies> {
  const res = await marketplaceFetch(`${API_BASE}/api/marketplace/ratings/${ratingId}/replies?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error(`Replies API error: ${res.status}`);
  return res.json();
}
