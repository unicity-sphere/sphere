import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getAgentConfig } from '../../config/activities';
import { DEV_PORTAL_URL } from '../../config/devPortal';
import { useDesktopState } from '../../hooks/useDesktopState';
import { useDmUnreadCount } from '../chat/hooks/useDmUnreadCount';
import { useGroupUnreadCount } from '../chat/hooks/useGroupUnreadCount';
import { useFeaturedProjects, useProjectsBySlugs, useProjectMetricsBatch } from '../../hooks/useMarketplace';
import { DragScrollRow } from '../common/DragScrollRow';
import { useDesktopOrder, type DesktopOrderItem } from '../../hooks/useDesktopOrder';
import type { ProjectSummary } from '../../services/marketplaceApi';
import { DesktopIcon } from './DesktopIcon';
import { InstalledProjectIcon } from './InstalledProjectIcon';
import { FeaturedProjectCard } from '../marketplace/FeaturedProjectCard';

// ── Sortable wrappers ──────────────────────────────────────────────────
// dnd-kit listeners are threaded onto the inner motion.button (via
// setActivatorNodeRef + spread props) so framer-motion's whileTap and
// the PointerSensor share the same element instead of fighting across
// wrapper layers.

interface SortableItemProps {
  item: DesktopOrderItem;
  projectsBySlug: Map<string, ProjectSummary>;
  openAppIds: Set<string>;
  getBadge: (agentId: string) => number | undefined;
  onAgentClick: (agentId: string) => void;
}

function SortableDesktopItem({ item, projectsBySlug, openAppIds, getBadge, onAgentClick }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    zIndex:  isDragging ? 50  : undefined,
    opacity: isDragging ? 0.7 : 1,
  };

  if (item.kind === 'app') {
    const project = projectsBySlug.get(item.refId);
    if (!project) return null;
    return (
      <InstalledProjectIcon
        project={project}
        containerRef={setNodeRef}
        containerStyle={style}
        buttonRef={setActivatorNodeRef}
        buttonProps={{ ...attributes, ...listeners }}
      />
    );
  }

  const agent = getAgentConfig(item.refId);
  if (!agent) return null;
  return (
    <DesktopIcon
      agent={agent}
      isOpen={openAppIds.has(agent.id)}
      badge={getBadge(agent.id)}
      onClick={() => onAgentClick(agent.id)}
      containerRef={setNodeRef}
      containerStyle={style}
      buttonRef={setActivatorNodeRef}
      buttonProps={{ ...attributes, ...listeners }}
    />
  );
}

export function DesktopShortcuts() {
  const navigate = useNavigate();
  const { openTabs } = useDesktopState();
  const dmUnreadCount = useDmUnreadCount();
  const groupUnreadCount = useGroupUnreadCount();
  const { data: featuredProjects } = useFeaturedProjects();
  const { orderedIds, orderedItems, reorder } = useDesktopOrder();

  // Resolve installed apps by SLUG, one lookup per installed app.
  //
  // This used to read the marketplace's project list — which returns a single
  // page — and drop any icon whose project was not on it. The effect was
  // silent and looked like data loss: an app the user had installed simply
  // stopped appearing on their desktop once the catalog grew past one page,
  // with no error and nothing to click. A desktop icon is a lookup by a slug
  // the user already chose, not a listing, so it must not depend on where
  // that project happens to fall in a paginated catalog.
  const installedSlugs = orderedItems
    .filter((item) => item.kind === 'app')
    .map((item) => item.refId);
  const projectsBySlug = useProjectsBySlugs(installedSlugs);

  // Batch live metrics for every project rendered on the desktop (featured + installed)
  const allProjectIds = [...new Set([
    ...(featuredProjects ?? []).map((p) => p._id),
    ...[...projectsBySlug.values()].map((p) => p._id),
  ])];
  const { data: metricsByProject = {} } = useProjectMetricsBatch(allProjectIds);

  // Require 8px drag distance before activating — prevents accidental drags on click
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const openAppIds = new Set(openTabs.map((t) => t.appId));

  const getBadge = (agentId: string): number | undefined => {
    if (agentId === 'dm') return dmUnreadCount || undefined;
    if (agentId === 'group-chat') return groupUnreadCount || undefined;
    return undefined;
  };

  const handleAgentClick = (agentId: string) => navigate(`/agents/${agentId}`);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedIds.indexOf(active.id as string);
    const newIndex = orderedIds.indexOf(over.id as string);
    if (oldIndex !== -1 && newIndex !== -1) reorder(oldIndex, newIndex);
  };

  const hasInstalled = orderedItems.some((it) => it.kind === 'app');

  return (
    <div data-tutorial="desktop-shortcuts" className="absolute inset-0 overflow-auto flex flex-col">
      <div className="relative flex-1 px-6 pt-6 sm:px-10 sm:pt-8 pb-8 flex flex-col">
        <div className="space-y-6">

        {/* 1. Featured Projects carousel */}
        {featuredProjects && featuredProjects.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-[rgba(255,255,255,0.3)]">
                Featured Projects
              </h2>
              <Link to="/explore" className="text-[11px] font-medium text-orange-500 dark:text-brand-orange hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <DragScrollRow label="featured projects" trackClassName="pb-2">
              {featuredProjects.map((project) => (
                <div key={project.slug} className="shrink-0 snap-start">
                  <FeaturedProjectCard project={project} metrics={metricsByProject[project._id]} />
                </div>
              ))}
            </DragScrollRow>
          </section>
        )}

        {/* 2. Apps + built-in agents in one draggable list — single source of order */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-[rgba(255,255,255,0.3)] mb-3 px-1">
            {hasInstalled ? 'Apps' : 'System'}
          </h2>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={orderedIds} strategy={rectSortingStrategy}>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                {orderedItems.map((item) => (
                  <SortableDesktopItem
                    key={item.id}
                    item={item}
                    projectsBySlug={projectsBySlug}
                    openAppIds={openAppIds}
                    getBadge={getBadge}
                    onAgentClick={handleAgentClick}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>

        </div>

        {/* CTA — pinned to bottom of the desktop area */}
        <p className="text-center text-xs text-neutral-400 dark:text-[rgba(255,255,255,0.3)] mt-auto pt-8">
          <Link to="/explore" className="underline hover:text-neutral-600 dark:hover:text-[rgba(255,255,255,0.6)] transition-colors">
            Explore marketplace
          </Link>
          {' '}&middot;{' '}
          <a href={DEV_PORTAL_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-neutral-600 dark:hover:text-[rgba(255,255,255,0.6)] transition-colors">
            Submit your project
          </a>
        </p>
      </div>
    </div>
  );
}
