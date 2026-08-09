import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowRight } from 'lucide-react';
import {
  useInfiniteProjects,
  useFeaturedProjects,
  useProjectMetricsByGroups,
  useMarketplaceStats,
  useCategories,
} from '../hooks/useMarketplace';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { FeaturedProjectCard } from '../components/marketplace/FeaturedProjectCard';
import { ProjectCard } from '../components/marketplace/ProjectCard';
import { CategoryFilter } from '../components/marketplace/CategoryFilter';
import { MaintenanceScreen } from '../components/MaintenanceScreen';
import { useMaintenanceStatus } from '../hooks/useMaintenanceStatus';
import { DEV_PORTAL_URL } from '../config/devPortal';
import { PROJECT_TYPES } from '../utils/isStandalone';
import type { ProjectSummary } from '../services/marketplaceApi';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * How long typing settles before it becomes a request. Search runs on the
 * server now (it has to — the browser only ever holds the pages it loaded),
 * so every keystroke would otherwise be its own round trip.
 */
const SEARCH_DEBOUNCE_MS = 300;

// ─── Drag-scrollable Featured Carousel ────────────────────────────────────────

function FeaturedCarousel({ items, metricsByProject }: {
  items: { slug: string }[];
  metricsByProject: Record<string, import('../services/marketplaceApi').ProjectMetrics>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftRef = useRef(0);
  const moved = useRef(false);

  const stopDrag = useCallback(() => {
    isDragging.current = false;
    if (scrollRef.current) scrollRef.current.style.cursor = 'grab';
    // Reset moved flag after a tick so onClickCapture can still block the current click
    setTimeout(() => { moved.current = false; }, 0);
  }, []);

  // Global mouseup to prevent stuck drag when mouse leaves window
  useEffect(() => {
    window.addEventListener('mouseup', stopDrag);
    return () => window.removeEventListener('mouseup', stopDrag);
  }, [stopDrag]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    moved.current = false;
    startX.current = e.pageX;
    scrollLeftRef.current = scrollRef.current?.scrollLeft ?? 0;
    if (scrollRef.current) scrollRef.current.style.cursor = 'grabbing';
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault();
    const walk = (e.pageX - startX.current) * 1.2;
    scrollRef.current.scrollLeft = scrollLeftRef.current - walk;
    if (Math.abs(walk) > 5) moved.current = true;
  }, []);

  return (
    <div
      ref={scrollRef}
      onDragStart={e => e.preventDefault()}
      onMouseDown={e => { e.preventDefault(); onMouseDown(e); }}
      onMouseMove={onMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      onClickCapture={(e) => { if (moved.current) { e.preventDefault(); e.stopPropagation(); } }}
      className="flex gap-4 overflow-x-auto scrollbar-hide py-3 select-none"
      style={{ cursor: 'grab' }}
    >
      {(items as import('../services/marketplaceApi').ProjectSummary[]).map((project) => (
        <div key={project.slug} className="shrink-0">
          <FeaturedProjectCard project={project} metrics={metricsByProject[project._id]} />
        </div>
      ))}
    </div>
  );
}

// ─── Hero stat ────────────────────────────────────────────────────────────────

const compactFormat = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

function HeroStat({ value, label, compact = false, testId }: { value: number; label: string; compact?: boolean; testId?: string }) {
  const display = compact ? compactFormat.format(value) : value.toLocaleString();
  return (
    <div className="flex flex-col items-center" data-testid={testId}>
      <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white tracking-tight">
        {display}
      </span>
      <span className="mt-1 text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.18em] text-neutral-400 dark:text-white/35">
        {label}
      </span>
    </div>
  );
}

function HeroDivider() {
  return <span className="h-8 w-px bg-neutral-200 dark:bg-white/10" aria-hidden />;
}

// ─── ExplorePage ──────────────────────────────────────────────────────────────

export function ExplorePage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<typeof PROJECT_TYPES.APP | typeof PROJECT_TYPES.STANDALONE>(PROJECT_TYPES.APP);
  // Proactive maintenance status — the hook polls the allowlisted status endpoint
  // and also listens for `maintenance:forced`, so the marketplace queries (gated on
  // the same status) never fire requests that would 503 during maintenance.
  const { data: maintenance } = useMaintenanceStatus();

  // Typing drives a SERVER-side search, so it is debounced before it reaches
  // the query key. The raw value stays on the input so the box itself never
  // lags behind the keyboard.
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

  // Data — only the active tab is fetched. Both tabs used to be fetched on
  // every mount so the hero could add them up; the hero now reads
  // catalog-wide totals from the API instead, which is both correct and
  // independent of what has been loaded. react-query keeps each tab's pages
  // cached for staleTime, so flipping back to a tab is still instant — only
  // the first visit costs a request.
  const {
    data, isLoading, isPlaceholderData,
    hasNextPage, fetchNextPage, isFetchingNextPage,
  } = useInfiniteProjects({ type: activeType, category, search: debouncedSearch });
  const { data: featured } = useFeaturedProjects(activeType);
  const { data: stats } = useMarketplaceStats();
  const { data: categoryCounts } = useCategories(activeType);

  // Pages flattened into one list. Deduped by id: the server's sort is a
  // total order, but a project published between two page requests still
  // shifts the window, and a repeated card is worse than a missing one.
  const items = useMemo(() => {
    const seen = new Set<string>();
    const flat: ProjectSummary[] = [];
    for (const page of data?.pages ?? []) {
      for (const project of page.projects) {
        if (seen.has(project._id)) continue;
        seen.add(project._id);
        flat.push(project);
      }
    }
    return flat;
  }, [data]);

  // How many projects match the current filters catalog-wide — not how many
  // are on screen.
  const matchingTotal = data?.pages[0]?.total ?? 0;

  // Live metrics, grouped so each loaded page keeps its own cached request
  // instead of re-fetching every project seen so far on each "Load more".
  const metricGroups = useMemo(() => {
    const groups = (data?.pages ?? []).map((page) => page.projects.map((p) => p._id));
    if (featured?.length) groups.push(featured.map((p) => p._id));
    return groups;
  }, [data, featured]);
  const metricsByProject = useProjectMetricsByGroups(metricGroups);

  // Featured items
  const featuredItems = featured ?? [];

  // Hero stats — counted across the whole published catalog by the API.
  // Deriving them from the loaded list is what made this row report the page
  // size (20) while the catalog held 24, and paging would only have made that
  // worse. `skill` projects are excluded from the project count on purpose:
  // Explore surfaces apps and standalone only, and a total the tabs below it
  // cannot reach is the same bug wearing a different number.
  const heroStats = useMemo(() => ({
    projects:
      (stats?.byType?.[PROJECT_TYPES.APP] ?? 0) +
      (stats?.byType?.[PROJECT_TYPES.STANDALONE] ?? 0),
    users:           stats?.totalUsers ?? 0,
    categoriesCount: stats?.totalCategories ?? 0,
  }), [stats]);

  // Chips come from the API, scoped to the active tab, so every chip offers a
  // filter this tab can actually satisfy. They used to be a hardcoded four
  // (game/defi/social/tool) while the catalog held eight categories, which
  // left utility, nft, trading and other unreachable by any filter.
  const categories = categoryCounts ?? [];
  const categoriesTotal = categories.reduce((sum, c) => sum + c.count, 0);
  const itemLabel = activeType === PROJECT_TYPES.STANDALONE ? 'standalone projects' : 'projects';
  const searchPlaceholder = activeType === PROJECT_TYPES.STANDALONE ? 'Search standalone projects...' : 'Search projects...';

  if (maintenance?.enabled) {
    return <MaintenanceScreen message={maintenance.message} />;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-neutral-900 dark:text-white">
      {/* Hero */}
      <section className="relative px-4 sm:px-6 py-14 sm:py-20 text-center">
        <div className="absolute inset-0 dark:bg-[radial-gradient(ellipse_50%_55%_at_50%_50%,rgba(0,0,0,0.5)_0%,transparent_100%)] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-mono uppercase tracking-[0.22em] text-orange-500 dark:text-brand-orange mb-6"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
            </span>
            Live <span className="text-neutral-400 dark:text-white/30">·</span> AgentSphere catalog
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-[1.05] tracking-tight"
          >
            Built on{' '}
            <span className="bg-linear-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              Unicity
            </span>
            .
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base sm:text-lg text-neutral-500 dark:text-white/65 max-w-xl mx-auto leading-relaxed"
          >
            Games, DeFi, tools and agents — all running on the Sphere SDK.
          </motion.p>

          {/* Catalog-wide totals — computed from apps + standalone combined (see
              combinedItems above), so this row is identical no matter which tab
              is active and never collapses just because the active tab is empty.
              Always rendered (no `> 0` gate) — a real zero, not a vanished row. */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mt-10 sm:mt-12 flex items-center justify-center gap-6 sm:gap-10"
          >
            <HeroStat testId="hero-stat-projects" value={heroStats.projects} label={heroStats.projects === 1 ? 'Total Project' : 'Total Projects'} />
            <HeroDivider />
            <HeroStat testId="hero-stat-users" value={heroStats.users} label={heroStats.users === 1 ? 'Total User' : 'Total Users'} compact />
            <HeroDivider />
            <HeroStat testId="hero-stat-categories" value={heroStats.categoriesCount} label={heroStats.categoriesCount === 1 ? 'Category' : 'Categories'} />
          </motion.div>
        </div>
      </section>

      {/* Type switch — the top-level split of the catalog: an app opens inside
          Sphere, a standalone project is installed and run on your own machine.
          A real segmented control, sized and faced like UI chrome (Geist, control
          scale) rather than the hero's display type — the hero already owns that
          register, and a filled block set in Anton at display size just reads as
          a second banner. The hero's totals row (above) carries the counting;
          this control only ever shows the two labels. */}
      <section className="px-4 sm:px-6 pb-10">
        <div className="flex justify-center">
          <div
            role="tablist"
            aria-label="Project type"
            className="relative grid grid-cols-2 gap-1 rounded-full border border-neutral-200 dark:border-white/12 bg-neutral-50 dark:bg-white/4 p-1"
          >
            {/* Sliding thumb — an absolutely-positioned pill sized to exactly one
                grid column, translated by its own width + the gap to reach the
                other column. Instant (no slide) under prefers-reduced-motion. */}
            <span
              aria-hidden
              className={
                activeType === PROJECT_TYPES.STANDALONE
                  ? 'absolute inset-y-1 left-1 w-[calc((100%-0.75rem)/2)] translate-x-[calc(100%+0.25rem)] rounded-full bg-orange-500 dark:bg-brand-orange shadow-md shadow-black/25 transition-transform duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none'
                  : 'absolute inset-y-1 left-1 w-[calc((100%-0.75rem)/2)] translate-x-0 rounded-full bg-orange-500 dark:bg-brand-orange shadow-md shadow-black/25 transition-transform duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none'
              }
            />
            {([
              { key: PROJECT_TYPES.APP, label: 'Apps' },
              { key: PROJECT_TYPES.STANDALONE, label: 'Standalone' },
            ]).map(tab => {
              const isActive = activeType === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => { setActiveType(tab.key); setCategory(null); setSearch(''); }}
                  className={
                    isActive
                      ? 'relative z-10 rounded-full px-6 sm:px-8 py-2 sm:py-2.5 text-sm font-semibold text-black cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60 focus-visible:ring-offset-2'
                      : 'relative z-10 rounded-full px-6 sm:px-8 py-2 sm:py-2.5 text-sm font-semibold text-neutral-500 dark:text-white/60 hover:text-neutral-900 dark:hover:text-white cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60 focus-visible:ring-offset-2 transition-colors'
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-3 text-center text-xs sm:text-sm text-neutral-400 dark:text-white/40">
          {activeType === PROJECT_TYPES.STANDALONE ? 'Run on your own machine' : 'Open in Sphere'}
        </p>
      </section>

      {/* Search + Filter */}
      <section className="px-4 sm:px-6 pb-8">
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-white/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-white/6 border border-neutral-200 dark:border-white/8 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 transition-all"
            />
          </div>
          <CategoryFilter
            categories={categories}
            active={category}
            onChange={setCategory}
            totalCount={categoriesTotal}
          />
        </div>
      </section>

      {/* Featured Carousel — drag-scrollable like MediaGallery */}
      {featuredItems.length > 0 && !category && !search && (
        <section className="px-4 sm:px-6 pb-10">
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Featured <span className="text-neutral-400 dark:text-white/35 font-normal">{itemLabel}</span>
            </h2>
            <FeaturedCarousel items={featuredItems} metricsByProject={metricsByProject} />
          </div>
        </section>
      )}

      {/* All Items Grid */}
      <section className="px-4 sm:px-6 pb-12">
        <div>
          <h2 className="text-lg font-semibold mb-6">
            {category ? `${category.charAt(0).toUpperCase() + category.slice(1)} ${itemLabel}` : `All ${itemLabel}`}
            {/* The catalog-wide match count, not the number of loaded cards —
                otherwise this bracket would just restate the page size. */}
            {matchingTotal > 0 && (
              <span data-testid="grid-total" className="text-neutral-400 dark:text-white/35 font-normal ml-2">
                ({matchingTotal})
              </span>
            )}
          </h2>

          {isLoading ? (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-40 rounded-2xl bg-neutral-100 dark:bg-white/4 animate-pulse" />
              ))}
            </div>
          ) : items.length > 0 ? (
            <>
              {/* Dimmed while a settled search term is still in flight: the
                  cards below are the PREVIOUS term's results, and pretending
                  otherwise would read as "these match what you just typed". */}
              <div
                className={`grid gap-4 transition-opacity ${isPlaceholderData ? 'opacity-50' : 'opacity-100'}`}
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
              >
                {items.map((project, i) => (
                  <ProjectCard
                    key={project.slug}
                    project={project}
                    index={i}
                    metrics={metricsByProject[project._id]}
                  />
                ))}
              </div>

              {/* Paging is an explicit button rather than infinite scroll:
                  this page ends in the developer CTA poster, and a list that
                  grows on scroll would push that out of reach forever. It
                  also states what is left, so "24 published but I see 20" is
                  answerable from the screen. */}
              {hasNextPage && (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() => { void fetchNextPage(); }}
                    // Disabled on placeholder data too: the next page number
                    // is derived from results that are about to be replaced.
                    disabled={isFetchingNextPage || isPlaceholderData}
                    className="px-6 py-3 rounded-xl bg-neutral-100 dark:bg-white/6 border border-neutral-200 dark:border-white/10 text-sm font-semibold text-neutral-700 dark:text-white/80 hover:border-neutral-300 dark:hover:border-white/20 hover:text-neutral-900 dark:hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isFetchingNextPage
                      ? 'Loading…'
                      : `Load more (${items.length} of ${matchingTotal})`}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-neutral-400 dark:text-white/35 text-sm">
                {debouncedSearch
                  ? `No ${itemLabel} match “${debouncedSearch}”`
                  : `No ${itemLabel} found`}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA — editorial poster for developers */}
      <section className="px-4 sm:px-6 py-12">
        <div className="no-text-shadow relative max-w-5xl mx-auto rounded-2xl border border-neutral-200 dark:border-white/8 bg-neutral-50 dark:bg-white/4 dark:backdrop-blur-2xl overflow-hidden p-8 sm:p-12 lg:p-16">
          {/* Ambient orange glow */}
          <div className="pointer-events-none absolute -top-32 -left-24 w-md h-112 rounded-full bg-orange-500/15 dark:bg-orange-500/20 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-40 -right-24 w-96 h-96 rounded-full bg-amber-500/10 dark:bg-amber-500/15 blur-3xl" aria-hidden />

          {/* Section annotation */}
          <div className="relative flex items-center gap-3 text-[10px] sm:text-xs font-mono uppercase tracking-[0.22em] text-orange-500 dark:text-brand-orange mb-8 sm:mb-10">
            <span className="h-px w-8 bg-orange-500/40" aria-hidden />
            For builders
          </div>

          {/* Massive statement */}
          <h2 className="relative text-5xl sm:text-6xl lg:text-7xl font-bold leading-[0.95] tracking-tight">
            Build on{' '}
            <span className="bg-linear-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              Sphere
            </span>
            .
          </h2>

          {/* Description + CTA */}
          <div className="relative mt-8 sm:mt-12 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <p className="text-neutral-500 dark:text-white/55 text-sm sm:text-base leading-relaxed max-w-md">
              Register your project, ship quests, and plug into wallets and chat — all from one portal.
            </p>
            <a
              href={DEV_PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 self-start sm:self-auto px-6 py-3 rounded-xl bg-orange-500 dark:bg-brand-orange hover:bg-orange-600 dark:hover:bg-brand-orange-dark text-white font-semibold text-sm transition-colors shadow-lg shadow-orange-500/20 shrink-0"
            >
              Open developer portal
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
