import { Link } from 'react-router-dom';
import { MarketplaceProjectCard } from '@unicitylabs/sphere-ui';
import type { ProjectSummary, ProjectMetrics } from '../../services/marketplaceApi';
import { useInstalledProjects } from '../../hooks/useInstalledProjects';
import { isStandalone } from '../../utils/isStandalone';

interface ProjectCardProps {
  project: ProjectSummary;
  /**
   * Kept for caller compatibility (e.g. ExplorePage passes the list index).
   * No longer used: sphere-ui's MarketplaceProjectCard has no entrance animation.
   */
  index?: number;
  /** Live metrics from /api/metrics/projects — overrides the denormalized project.stats snapshot */
  metrics?: ProjectMetrics;
}

export function ProjectCard({ project, metrics }: ProjectCardProps) {
  const { isInstalled, toggle } = useInstalledProjects();
  const installed = isInstalled(project.slug);
  const users = metrics?.uniqueUsers ?? project.stats.totalUsers;
  const quests = metrics?.activeQuests ?? project.stats.activeQuests;
  const positivePercent = metrics?.positivePercent ?? 0;
  const ratingCount = metrics?.ratingCount ?? 0;

  return (
    <Link to={`/apps/${project.slug}`} className="relative block">
      {/* sphere-ui's MarketplaceProjectCard doesn't know about project types, and
          its version is bumped by CI — adding a type-aware badge there would mean
          a release cycle plus a dependency bump in every consumer. Overlay it here
          instead, driven off project.type via isStandalone (never off the
          absence of appUrl). */}
      {isStandalone(project) && (
        <span
          className="absolute top-3 left-3 z-20 px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-sm text-white/80 text-[10px] font-mono uppercase tracking-wider pointer-events-none"
        >
          STANDALONE
        </span>
      )}
      <MarketplaceProjectCard
        name={project.name}
        tagline={project.tagline}
        logoUrl={project.logoUrl}
        bannerUrl={project.bannerUrl}
        accentColor={project.accentColor}
        category={project.category}
        users={users}
        quests={quests}
        positivePercent={positivePercent}
        ratingCount={ratingCount}
        installState={installed ? 'installed' : 'available'}
        onInstallClick={() => toggle(project.slug)}
      />
    </Link>
  );
}
