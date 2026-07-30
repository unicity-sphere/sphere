import { Link } from 'react-router-dom';
import { MarketplaceProjectCard } from '@unicitylabs/sphere-ui';
import type { ProjectSummary, ProjectMetrics } from '../../services/marketplaceApi';
import { useInstalledProjects } from '../../hooks/useInstalledProjects';
import { isStandalone, supportsQuests } from '../../utils/isStandalone';

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
        // sphere-ui defaults an absent `quests` prop to 0 and renders the
        // "Active quests" stat unconditionally either way (checked in its
        // compiled output — there's no `quests !== undefined &&` guard, only
        // `quests = 0` as a default param), so passing undefined doesn't
        // currently change what's on screen for a project whose type has no
        // quests. Passing it anyway is still wrong: it's a real quest count
        // for `activeQuests`/`stats.activeQuests`, not a 0 this project
        // actually has, and it costs nothing to be honest about that —
        // forward-compatible if sphere-ui ever adds the presence check.
        quests={supportsQuests(project.type) ? quests : undefined}
        positivePercent={positivePercent}
        ratingCount={ratingCount}
        installState={installed ? 'installed' : 'available'}
        onInstallClick={() => toggle(project.slug)}
      />
    </Link>
  );
}
