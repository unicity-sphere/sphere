import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowRight } from 'lucide-react';
import { useProjects, useFeaturedProjects, useProjectMetricsBatch } from '../hooks/useMarketplace';
import { FeaturedProjectCard } from '../components/marketplace/FeaturedProjectCard';
import { ProjectCard } from '../components/marketplace/ProjectCard';
import { CategoryFilter } from '../components/marketplace/CategoryFilter';
import { MaintenanceScreen } from '../components/MaintenanceScreen';
import { useMaintenanceStatus } from '../hooks/useMaintenanceStatus';
import { DEV_PORTAL_URL } from '../config/devPortal';

// ─── Constants ────────────────────────────────────────────────────────────────

const APP_CATEGORIES = ['game', 'defi', 'social', 'tool'];

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
  const [activeType, setActiveType] = useState<'app' | 'sdk'>('app');
  // Proactive maintenance status — the hook polls the allowlisted status endpoint
  // and also listens for `maintenance:forced`, so the marketplace queries (gated on
  // the same status) never fire requests that would 503 during maintenance.
  const { data: maintenance } = useMaintenanceStatus();

  // Data — both types are always fetched (not just the active one) so the type
  // switch can show a real count on each side and so flipping tabs is instant,
  // reading from the already-cached query instead of refetching.
  const { data: appProjectsData, isLoading: appLoading } = useProjects({ type: 'app' });
  const { data: sdkProjectsData, isLoading: sdkLoading } = useProjects({ type: 'sdk' });
  const projectsData = activeType === 'sdk' ? sdkProjectsData : appProjectsData;
  const isLoading = activeType === 'sdk' ? sdkLoading : appLoading;
  const allItems = projectsData?.projects ?? [];
  // Apps + standalone together — the hero stats describe the whole catalog,
  // not just the active tab, so they must read identically on both tabs and
  // never collapse just because the tab you happen to be on is empty.
  const combinedItems = useMemo(
    () => [...(appProjectsData?.projects ?? []), ...(sdkProjectsData?.projects ?? [])],
    [appProjectsData, sdkProjectsData],
  );
  const { data: featured } = useFeaturedProjects(activeType);

  // Single batch request for live metrics across every project on this page —
  // sourced from the combined list so hero stats and card metrics are equally
  // live regardless of which tab is active.
  const allProjectIds = useMemo(
    () => [...new Set([...combinedItems, ...(featured ?? [])].map((p) => p._id))],
    [combinedItems, featured],
  );
  const { data: metricsByProject = {} } = useProjectMetricsBatch(allProjectIds);

  // Filtered items
  const filtered = useMemo(() => {
    let result = allItems;
    if (category) result = result.filter((p) => p.category === category);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [allItems, category, search]);

  // Featured items
  const featuredItems = featured ?? [];

  // Hero stats — apps + standalone combined (never just the active tab), prefer
  // live metrics, fall back to denormalized stats
  const heroStats = useMemo(() => {
    const projects = combinedItems.length;
    const users = combinedItems.reduce((sum, p) => {
      const live = metricsByProject[p._id]?.uniqueUsers;
      return sum + (live ?? p.stats.totalUsers ?? 0);
    }, 0);
    const categoriesCount = new Set(combinedItems.map((p) => p.category)).size;
    return { projects, users, categoriesCount };
  }, [combinedItems, metricsByProject]);

  const categories = APP_CATEGORIES;
  const itemLabel = activeType === 'sdk' ? 'standalone projects' : 'projects';
  const searchPlaceholder = activeType === 'sdk' ? 'Search standalone projects...' : 'Search projects...';

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
                activeType === 'sdk'
                  ? 'absolute inset-y-1 left-1 w-[calc((100%-0.75rem)/2)] translate-x-[calc(100%+0.25rem)] rounded-full bg-orange-500 dark:bg-brand-orange shadow-md shadow-black/25 transition-transform duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none'
                  : 'absolute inset-y-1 left-1 w-[calc((100%-0.75rem)/2)] translate-x-0 rounded-full bg-orange-500 dark:bg-brand-orange shadow-md shadow-black/25 transition-transform duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none'
              }
            />
            {([
              { key: 'app' as const, label: 'Apps' },
              { key: 'sdk' as const, label: 'Standalone' },
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
          {activeType === 'sdk' ? 'Run on your own machine' : 'Open in Sphere'}
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
          <CategoryFilter categories={categories} active={category} onChange={setCategory} />
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
            {filtered.length > 0 && <span className="text-neutral-400 dark:text-white/35 font-normal ml-2">({filtered.length})</span>}
          </h2>

          {isLoading ? (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-40 rounded-2xl bg-neutral-100 dark:bg-white/4 animate-pulse" />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {filtered.map((project, i) => (
                <ProjectCard
                  key={project.slug}
                  project={project}
                  index={i}
                  metrics={metricsByProject[project._id]}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-neutral-400 dark:text-white/35 text-sm">No {itemLabel} found</p>
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
