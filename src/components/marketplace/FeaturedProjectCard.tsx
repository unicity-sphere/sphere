import { Link } from 'react-router-dom';
import { FeaturedProjectCard as UiFeaturedProjectCard } from '@unicitylabs/sphere-ui';
import type { ProjectSummary, ProjectMetrics } from '../../services/marketplaceApi';
import { isStandalone, isChatAgent, supportsQuests } from '../../utils/isStandalone';

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

  // See ProjectCard.tsx's identical comments for the reasoning behind both
  // of these: one overlay span extended to cover chat-agent alongside
  // standalone (mutually exclusive, so at most one label renders; text is
  // the type's own label, never the bare word "Agent" — reserved elsewhere
  // in this repo for AOS capsule agents), and the tagline-slot @nametag
  // substitution that deliberately excludes pubkey/DIRECT:// addresses.
  const badgeLabel = isStandalone(project) ? 'STANDALONE' : isChatAgent(project) ? 'CHAT AGENT' : null;
  const agentAddress = project.agentAddress ?? '';
  const tagline = isChatAgent(project) && agentAddress.startsWith('@') ? agentAddress : project.tagline;

  return (
    <Link to={`/apps/${project.slug}`} draggable={false} className="relative block">
      {/* Same overlay as ProjectCard.tsx (sphere-ui doesn't know about project
          types, and its version is CI-bumped, so touching it there means a
          release cycle plus a dependency bump in every consumer). This card's
          banner ribbon ("Featured") sits at top-3 right-3, and the logo/title
          sit in a separate row below the banner — top-3 left-3 is free on both
          counts. Driven off project.type via isStandalone/isChatAgent (never
          off the absence of appUrl or the presence of agentAddress). */}
      {badgeLabel && (
        <span
          className="absolute top-3 left-3 z-20 px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-sm text-white/80 text-[10px] font-mono uppercase tracking-wider pointer-events-none"
        >
          {badgeLabel}
        </span>
      )}
      <UiFeaturedProjectCard
        name={project.name}
        tagline={tagline}
        logoUrl={project.logoUrl}
        bannerUrl={project.bannerUrl}
        accentColor={project.accentColor}
        users={users}
        // See ProjectCard.tsx's identical comment: sphere-ui defaults an
        // absent `quests` to 0 and renders the stat unconditionally either
        // way, but this repo's own value should still only ever be a real
        // quest count for a type that has quests, not an asserted 0.
        quests={supportsQuests(project.type) ? quests : undefined}
        positivePercent={positivePercent}
        ratingCount={ratingCount}
      />
    </Link>
  );
}
