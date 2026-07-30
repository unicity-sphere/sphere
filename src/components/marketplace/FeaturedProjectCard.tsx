import { Link } from 'react-router-dom';
import { FeaturedProjectCard as UiFeaturedProjectCard } from '@unicitylabs/sphere-ui';
import type { ProjectSummary, ProjectMetrics } from '../../services/marketplaceApi';
import { isStandalone } from '../../utils/isStandalone';

interface FeaturedProjectCardProps {
  project: ProjectSummary;
  /** Live metrics from /api/metrics/projects — overrides the denormalized project.stats snapshot */
  metrics?: ProjectMetrics;
}

export function FeaturedProjectCard({ project, metrics }: FeaturedProjectCardProps) {
  const users = metrics?.uniqueUsers ?? project.stats.totalUsers;
  const quests = metrics?.activeQuests ?? project.stats.activeQuests;
  const positivePercent = metrics?.positivePercent ?? 0;
  const ratingCount = metrics?.ratingCount ?? 0;

  return (
    <Link to={`/apps/${project.slug}`} draggable={false} className="relative block">
      {/* Same overlay as ProjectCard.tsx (sphere-ui doesn't know about project
          types, and its version is CI-bumped, so touching it there means a
          release cycle plus a dependency bump in every consumer). This card's
          banner ribbon ("Featured") sits at top-3 right-3, and the logo/title
          sit in a separate row below the banner — top-3 left-3 is free on both
          counts. Driven off project.type via isStandalone (never off the
          absence of appUrl). */}
      {isStandalone(project) && (
        <span
          className="absolute top-3 left-3 z-20 px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-sm text-white/80 text-[10px] font-mono uppercase tracking-wider pointer-events-none"
        >
          STANDALONE
        </span>
      )}
      <UiFeaturedProjectCard
        name={project.name}
        tagline={project.tagline}
        logoUrl={project.logoUrl}
        bannerUrl={project.bannerUrl}
        accentColor={project.accentColor}
        users={users}
        quests={quests}
        positivePercent={positivePercent}
        ratingCount={ratingCount}
      />
    </Link>
  );
}
