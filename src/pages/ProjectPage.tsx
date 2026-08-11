import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, ExternalLink, Users, Target, Trophy, Globe, Check, Download, X, ChevronDown, ChevronLeft, ChevronRight, Star, Flag, MessageCircle } from 'lucide-react';
import { ProjectLogo } from '@unicitylabs/sphere-ui';
import { useSphereContext } from '../sdk/hooks/core/useSphere';
import { useProject, useProjectQuests, useProjectMetrics } from '../hooks/useMarketplace';
import { groupQuestsByTrack } from '../utils/groupQuestsByTrack';
import { QuestPreviewCard } from '../components/marketplace/QuestPreviewCard';
import { ProjectReviewsSection } from '../components/marketplace/ProjectReviewsSection';
import { ReportModal } from '../components/marketplace/ReportModal';
import { canReportProject } from '../components/marketplace/moderationAffordances';
import { submitReport, type ReportCategory } from '../services/userApi';
import { DiscordIcon, XIcon } from '../components/icons/SocialIcons';
import { useDesktopState } from '../hooks/useDesktopState';
import { useInstalledProjects } from '../hooks/useInstalledProjects';
import { isHttpsUrl } from '../utils/isHttpsUrl';
import { isStandalone, isChatAgent, hasQuestSurface, supportsQuests, PROJECT_TYPES } from '../utils/isStandalone';
import { copyToClipboard } from '../utils/copyToClipboard';
import { truncateId, stripDirectScheme } from '../utils/identifiers';

// ── Helpers ──────────────────────────────────────────────────────────
type MediaItem = { type: string; url: string; caption?: string };

function getThumb(m: MediaItem): string {
  if (m.type !== 'video') return m.url;
  const ytMatch = m.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
  return ytMatch ? `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg` : m.url;
}

// ── Drag-scrollable media strip ──────────────────────────────────────
function MediaGallery({ items, onOpen }: { items: MediaItem[]; onOpen: (i: number) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const moved = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    moved.current = false;
    startX.current = e.pageX - (scrollRef.current?.offsetLeft ?? 0);
    scrollLeft.current = scrollRef.current?.scrollLeft ?? 0;
    if (scrollRef.current) scrollRef.current.style.cursor = 'grabbing';
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
    if (Math.abs(walk) > 5) moved.current = true;
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    if (scrollRef.current) scrollRef.current.style.cursor = 'grab';
  }, []);

  return (
    <section className="px-4 sm:px-6 pb-8">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-lg font-semibold mb-4">Media</h2>
        <div
          ref={scrollRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 select-none"
          style={{ cursor: 'grab' }}
        >
          {items.map((item, i) => {
            const isVideo = item.type === 'video';
            return (
              <button
                key={i}
                onClick={() => { if (!moved.current) onOpen(i); }}
                className="shrink-0 rounded-xl overflow-hidden border border-neutral-200 dark:border-white/8 hover:border-orange-500/50 dark:hover:border-brand-orange/50 transition-all hover:shadow-lg hover:shadow-orange-500/10 cursor-pointer group relative"
              >
                <img
                  src={getThumb(item)}
                  alt={item.caption ?? `Media ${i + 1}`}
                  draggable={false}
                  className="h-44 sm:h-52 w-72 sm:w-80 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {isVideo && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center group-hover:bg-orange-500/90 transition-colors">
                      <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Lightbox with keyboard + thumbnails ───────────────────────────────
function MediaLightbox({ items, index, onClose, onChange }: {
  items: MediaItem[];
  index: number;
  onClose: () => void;
  onChange: (i: number) => void;
}) {
  const thumbsRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && index > 0) onChange(index - 1);
      if (e.key === 'ArrowRight' && index < items.length - 1) onChange(index + 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [index, items.length, onClose, onChange]);

  // Scroll thumbnail into view
  useEffect(() => {
    const thumb = thumbsRef.current?.children[index] as HTMLElement | undefined;
    thumb?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [index]);

  const current = items[index];
  const isVideo = current.type === 'video';
  const ytMatch = current.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
  const ytId = ytMatch?.[1];
  const vimeoMatch = current.url.match(/vimeo\.com\/(\d+)/);
  const vimeoId = vimeoMatch?.[1];

  return (
    <div className="fixed inset-0 z-9999 bg-black/95 flex flex-col" onClick={onClose}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" onClick={e => e.stopPropagation()}>
        <span className="text-white/50 text-sm font-mono">{index + 1} / {items.length}</span>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center relative min-h-0 px-14" onClick={onClose}>
        {/* Previous */}
        {index > 0 && (
          <button
            onClick={e => { e.stopPropagation(); onChange(index - 1); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Next */}
        {index < items.length - 1 && (
          <button
            onClick={e => { e.stopPropagation(); onChange(index + 1); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Content */}
        <div onClick={e => e.stopPropagation()} className="max-h-full max-w-full">
          {isVideo ? (
            <div className="w-[80vw] max-w-5xl aspect-video rounded-lg overflow-hidden shadow-2xl">
              {ytId ? (
                <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=1`} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              ) : vimeoId ? (
                <iframe src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1`} className="w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
              ) : (
                <video src={current.url} controls autoPlay className="w-full h-full" />
              )}
            </div>
          ) : (
            <img src={current.url} alt="" className="max-h-[70vh] max-w-[80vw] object-contain rounded-lg shadow-2xl" />
          )}
        </div>
      </div>

      {/* Thumbnail strip */}
      <div className="shrink-0 px-4 py-3" onClick={e => e.stopPropagation()}>
        <div ref={thumbsRef} className="flex gap-2 justify-center overflow-x-auto scrollbar-hide">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => onChange(i)}
              className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                i === index
                  ? 'border-orange-500 dark:border-brand-orange opacity-100 scale-105'
                  : 'border-transparent opacity-50 hover:opacity-80'
              }`}
            >
              <img
                src={getThumb(item)}
                alt=""
                draggable={false}
                className="w-full h-full object-cover"
              />
              {item.type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const categoryLabels: Record<string, string> = {
  game: 'Game', defi: 'DeFi', social: 'Social', tool: 'Tool', nft: 'NFT', other: 'Other',
};

export function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const navigate = useNavigate();
  const { sphere } = useSphereContext();
  const { openTab } = useDesktopState();
  const { isInstalled, toggle } = useInstalledProjects();
  const { data: project, isLoading } = useProject(slug ?? '', isPreview || undefined);
  const installed = slug ? isInstalled(slug) : false;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const myAddress = sphere?.identity?.directAddress ?? null;
  // Session-local, same pattern as ProjectReviewsSection's reportedRatingIds:
  // the backend has no "did I already report this" read, so this only ever
  // flips true on a successful submit for the current page visit.
  const [projectReported, setProjectReported] = useState(false);
  const [projectReportOpen, setProjectReportOpen] = useState(false);
  // Whether to even fetch quests, and whether to show the Quests section
  // below, are gated on `hasQuestSurface`, NOT on `supportsQuests` — this is
  // deliberately the wider check. `useProjectQuests`/the Quests section had
  // no type gate at all before this project-type work started, so an `app`
  // or `skill` project must keep fetching/showing quests exactly as before;
  // `standalone` and `chat-agent` (neither of which structurally has any)
  // are excluded. The narrower `supportsQuests` (app-only) governs the
  // Quests/Completions stat TILES further down, which already excluded
  // `skill` before this work — that's a different, pre-existing behaviour
  // this file must not disturb.
  // Fetch optimistically before `project` has loaded (unknown type yet).
  const { data: quests } = useProjectQuests(slug ?? '', !project || hasQuestSurface(project));
  const { data: metrics } = useProjectMetrics(project?._id);
  // Quests are heavy content — collapsed by default, and collapsed per track.
  const [questsOpen, setQuestsOpen] = useState(false);
  const [openTracks, setOpenTracks] = useState<Set<string>>(new Set());
  const questGroups = groupQuestsByTrack(quests ?? []);
  const onlyGeneralGroup = questGroups.length === 1 && questGroups[0].key === 'general';

  const toggleTrack = (key: string) => {
    setOpenTracks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // All media items (screenshots + videos) in one list. The API returns
  // `caption: string | null`; coerce nulls to undefined so MediaItem (which
  // expects `caption?: string`) matches without a cast at every usage.
  const mediaItems: MediaItem[] = (project?.media ?? []).map((m) => ({
    type: m.type,
    url: m.url,
    caption: m.caption ?? undefined,
  }));

  // appUrl reaches the wallet's most dangerous sink here: openTab persists it
  // into DesktopTab.url in localStorage, DesktopLayout turns it into
  // iframeUrl, and IframeAgent renders <iframe src={activeUrl}>. The frame
  // does carry a sandbox attribute (AGENT_IFRAME_SANDBOX), but it includes
  // both allow-scripts and allow-same-origin, which together leave a framed
  // page free to script in its own inherited origin — the sandbox grants no
  // protection against a malicious `src` itself. The https gate is what
  // protects the origin here, so a non-https value must never be stored via
  // openTab.
  const handleAddToDesktop = () => {
    if (!project?.appUrl || !isHttpsUrl(project.appUrl)) return;
    openTab('custom', { url: project.appUrl, label: project.name });
    navigate(`/agents/custom?url=${encodeURIComponent(project.appUrl)}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-neutral-400 dark:text-white/35">Project not found</p>
        <Link to="/explore" className="text-orange-500 dark:text-brand-orange text-sm mt-2 inline-block hover:underline">Back to Explore</Link>
      </div>
    );
  }

  // A chat agent's Unicity ID (project.agentAddress) — shown in full for a
  // @nametag, since that's already a short human-chosen name, and
  // MetaMask-style middle-truncated (never an inline slice) for a pubkey or
  // a DIRECT:// address, both of which are long opaque strings. The scheme
  // has to come off BEFORE truncating: truncateId slices the first/last N
  // literal characters, so an untouched "DIRECT://02ab...9012" would show as
  // "DIRECT...9012" — all scheme, no address. stripDirectScheme is a no-op
  // on a bare pubkey, so it's safe to always apply here. Only the LABEL is
  // truncated; the href and the copied value below always use the full,
  // untouched chatAgentAddress.
  const chatAgentAddress = project.agentAddress ?? '';
  const chatAgentLabel = chatAgentAddress.startsWith('@')
    ? chatAgentAddress
    : truncateId(stripDirectScheme(chatAgentAddress));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-neutral-900 dark:text-white pb-12">
      {/* Preview mode banner */}
      {isPreview && (
        <div className="mx-4 sm:mx-6 mt-2 mb-2 px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 text-sm font-medium text-center">
          Preview Mode — this is how your project will appear in the marketplace
        </div>
      )}
      {/* Banner — ratio pinned so the crop is identical on every screen. A fixed
          height on a full-bleed box drove the box ratio to ~6:1 at 2K, cropping
          the same banner differently at every window width. 3:1 matches the
          uploaded master, so the hero now crops to zero.

          Width is bounded by the same px-4/max-w-5xl/mx-auto container every
          other section on this page uses, so the banner lines up with the
          content below it. The bound must come from max-width, never from
          max-height on the ratio box: max-height clamps after the ratio
          resolves and would float the box ratio again. Must stay identical to
          sphere-ui's ProjectPagePreview. */}
      <section className="px-4 sm:px-6 mt-2">
      <div className="relative max-w-5xl mx-auto">
        <div className="relative aspect-[3/1] rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center" style={{
            backgroundColor: project.accentColor,
            backgroundImage: project.bannerUrl ? `url(${project.bannerUrl})` : undefined,
          }} />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />

          {/* Back button */}
          <Link to="/explore" className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-sm text-white/80 hover:text-white text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Explore
          </Link>
        </div>

        {/* Logo — outside overflow-hidden container.
            Uses ProjectLogo for consistency with marketplace cards / desktop dock:
            real uploaded logo renders un-cropped on the accent tile; a missing
            logo falls back to a 2-letter monogram with gloss.
            No frame around the tile — mirrors the border-4 removal on the
            dev-portal/backoffice overview pages. */}
        <div className="absolute -bottom-6 left-6 sm:left-8 z-10">
          <ProjectLogo
            name={project.name}
            logoUrl={project.logoUrl}
            accentColor={project.accentColor}
            size="lg"
          />
        </div>
      </div>
      </section>

      {/* Info Header + Stats card */}
      <section className="px-4 sm:px-6 pt-10 pb-6">
        <div className="no-text-shadow max-w-5xl mx-auto bg-neutral-50 dark:bg-white/4 dark:backdrop-blur-2xl rounded-2xl border border-neutral-200 dark:border-white/8 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{project.name}</h1>
            <p className="text-neutral-500 dark:text-white/55 mt-1">{project.tagline}</p>
            <div className="flex items-center gap-2 mt-3">
              {/* Neutral chip on purpose — accent-tinted text turns unreadable
                  with dark/low-contrast project accent colors. */}
              <span className="inline-flex px-2.5 py-0.5 rounded-lg text-xs font-semibold uppercase tracking-wider bg-neutral-100 dark:bg-white/6 text-neutral-600 dark:text-white/60 border border-neutral-200 dark:border-white/10">
                {categoryLabels[project.category] ?? project.category}
              </span>
              {project.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-white/6 text-neutral-500 dark:text-white/40 text-[10px] font-mono">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {!isPreview && (
          <div className="flex flex-col items-stretch sm:items-end shrink-0">
            {/* Standalone projects run outside Sphere — no in-app tab to
                launch, so the install command is surfaced right above the
                action row as a copyable terminal line. */}
            {isStandalone(project) && project.installCommand && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-neutral-100 dark:bg-white/6 font-mono text-xs">
                <span className="text-neutral-400 dark:text-white/30">$</span>
                <span className="flex-1 truncate">{project.installCommand}</span>
                <button
                  type="button"
                  aria-label="copy install command"
                  onClick={async () => {
                    // The copy affordance is a convenience with no visual feedback
                    // today — copyToClipboard already never throws (missing API,
                    // non-secure context, rejected write all resolve to false), so
                    // failures are silent by design rather than surfaced here.
                    await copyToClipboard(project.installCommand!);
                  }}
                  className="text-neutral-500 dark:text-white/45 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  copy
                </button>
              </div>
            )}
            {/* Chat agent: no install command (there's nothing to install —
                the API refuses this type), so the copyable line here is the
                agent's Unicity ID instead, reusing the same copy affordance
                as the install-command block above. */}
            {isChatAgent(project) && (
              chatAgentAddress ? (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-neutral-100 dark:bg-white/6 font-mono text-xs">
                  <span className="flex-1 truncate">{chatAgentLabel}</span>
                  <button
                    type="button"
                    aria-label="copy unicity id"
                    onClick={async () => {
                      // Same silent-by-design copy affordance as the install
                      // command above — copyToClipboard never throws.
                      await copyToClipboard(chatAgentAddress);
                    }}
                    className="text-neutral-500 dark:text-white/45 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    copy
                  </button>
                </div>
              ) : (
                // The API makes this unlikely (agentAddress is set at
                // creation) but not impossible — a developer PUT can clear
                // it later. Without this branch the action row below is
                // entirely empty (no Message button either) with nothing on
                // screen to explain why.
                <p className="mb-3 text-xs text-neutral-400 dark:text-white/35">
                  This agent hasn't published a Unicity ID yet.
                </p>
              )
            )}
          <div className="flex gap-2 shrink-0 flex-wrap">
            {project.type === PROJECT_TYPES.SKILL ? (
              /* Skill: Install to Astrid */
              <button
                onClick={() => slug && toggle(slug)}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
                  installed
                    ? 'bg-green-500/15 text-green-500 border border-green-500/25 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/25'
                    : 'bg-violet-500 hover:bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                }`}
              >
                {installed ? <><Check className="w-4 h-4" /> Installed</> : <><Download className="w-4 h-4" /> Install to Astrid</>}
              </button>
            ) : isStandalone(project) ? (
              /* Standalone: Add to Desktop, then the repository link in place
                 of "Open App" — the app tab launches its target in a frame,
                 and GitHub sends X-Frame-Options: deny, so a framed
                 repository would render as a blank panel. A plain new-tab
                 link avoids that entirely. */
              <>
                <button
                  onClick={() => slug && toggle(slug)}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
                    installed
                      ? 'bg-green-500/15 text-green-500 border border-green-500/25 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/25'
                      : 'bg-orange-500 dark:bg-brand-orange hover:bg-orange-600 dark:hover:bg-brand-orange-dark text-white shadow-lg shadow-orange-500/20'
                  }`}
                >
                  {installed ? <><Check className="w-4 h-4" /> On Desktop</> : <><Download className="w-4 h-4" /> Add to Desktop</>}
                </button>
                {isHttpsUrl(project.repoUrl) && (
                  <a
                    href={project.repoUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-neutral-200 dark:border-white/8 text-neutral-600 dark:text-white/55 hover:text-neutral-900 dark:hover:text-white transition-colors"
                  >
                    Open repository <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </>
            ) : isChatAgent(project) ? (
              /* Chat agent: Message (a real in-app route, so Link rather than
                 a plain <a> — an <a href> here would force a full browser
                 navigation and lose DesktopLayout's mounted tabs) plus the
                 repository link when present, same rationale as standalone's
                 above (a framed GitHub page renders blank). No Open App, no
                 Install, no Add to Desktop — the API refuses to install this
                 type, and there is nothing here to open in a frame. */
              <>
                {chatAgentAddress ? (
                  <Link
                    to={`/agents/dm?peer=${encodeURIComponent(chatAgentAddress)}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all bg-orange-500 dark:bg-brand-orange hover:bg-orange-600 dark:hover:bg-brand-orange-dark text-white shadow-lg shadow-orange-500/20"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" />
                    {/* Nametags are admitted up to 64 chars by the API — cap
                        the label so a long one can't blow out the button.
                        The copy line above already truncates the same way. */}
                    Message <span className="inline-block align-bottom max-w-[16ch] truncate">{chatAgentLabel}</span>
                  </Link>
                ) : (
                  // Same "no Unicity ID yet" case as the copy line above —
                  // without this, a chat agent with a cleared agentAddress
                  // renders neither that line nor a Message button, leaving
                  // the whole action row empty with no explanation.
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm border border-neutral-200 dark:border-white/8 text-neutral-400 dark:text-white/35">
                    <MessageCircle className="w-4 h-4 shrink-0" /> No Unicity ID published yet
                  </span>
                )}
                {isHttpsUrl(project.repoUrl) && (
                  <a
                    href={project.repoUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-neutral-200 dark:border-white/8 text-neutral-600 dark:text-white/55 hover:text-neutral-900 dark:hover:text-white transition-colors"
                  >
                    Open repository <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </>
            ) : (
              /* App: Add to Desktop */
              <>
                <button
                  onClick={() => slug && toggle(slug)}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
                    installed
                      ? 'bg-green-500/15 text-green-500 border border-green-500/25 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/25'
                      : 'bg-orange-500 dark:bg-brand-orange hover:bg-orange-600 dark:hover:bg-brand-orange-dark text-white shadow-lg shadow-orange-500/20'
                  }`}
                >
                  {installed ? <><Check className="w-4 h-4" /> On Desktop</> : <><Download className="w-4 h-4" /> Add to Desktop</>}
                </button>
                {isHttpsUrl(project.appUrl) && (
                  <button onClick={handleAddToDesktop} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-neutral-200 dark:border-white/8 text-neutral-600 dark:text-white/55 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-white/15 transition-colors cursor-pointer">
                    Open App <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
            {isHttpsUrl(project.websiteUrl) && (
              <a href={project.websiteUrl!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-neutral-200 dark:border-white/8 text-neutral-600 dark:text-white/55 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-white/15 transition-colors">
                Website <Globe className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-6 sm:gap-10 border-t border-neutral-200 dark:border-white/8 mt-6 pt-5">
          {[
            {
              label: project.type === PROJECT_TYPES.SKILL ? 'Installs' : 'Users',
              value: metrics?.uniqueUsers ?? project.stats.totalUsers,
              icon: Users,
            },
            // Quest-derived stats — gate on capability (supportsQuests: app
            // only). This already excluded `skill` before this project-type
            // work (skill shows "Installs" instead, above); supportsQuests
            // reproduces that exactly while also fixing standalone, which
            // this array previously forgot to exclude and so read 0/0.
            ...(supportsQuests(project.type)
              ? [
                  { label: 'Quests',      value: metrics?.activeQuests     ?? project.stats.activeQuests,     icon: Target },
                  { label: 'Completions', value: metrics?.totalCompletions ?? project.stats.totalCompletions, icon: Trophy },
                ]
              : []),
            ...(metrics && metrics.ratingCount > 0
              ? [{ label: `${metrics.positivePercent}% +`, value: metrics.ratingCount, icon: Star, isCount: true as const }]
              : []),
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="text-center sm:text-left">
              <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                <Icon className="w-4 h-4 text-neutral-400 dark:text-white/30" />
                <span className="text-xl sm:text-2xl font-bold font-mono">{value.toLocaleString()}</span>
              </div>
              <span className="text-xs text-neutral-400 dark:text-white/35 uppercase tracking-wider">{label}</span>
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* Media gallery (screenshots + videos, drag-scrollable) */}
      {mediaItems.length > 0 && <MediaGallery items={mediaItems} onOpen={setLightboxIndex} />}

      {/* Lightbox with keyboard nav + thumbnails */}
      {lightboxIndex !== null && mediaItems.length > 0 && (
        <MediaLightbox
          items={mediaItems as MediaItem[]}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      )}

      {/* About */}
      <section className="px-4 sm:px-6 pb-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-lg font-semibold mb-4">About</h2>
          <div className="no-text-shadow bg-neutral-50 dark:bg-white/4 dark:backdrop-blur-2xl rounded-2xl border border-neutral-200 dark:border-white/8 p-6">
            <p className="text-neutral-600 dark:text-white/55 text-sm leading-relaxed whitespace-pre-line">{project.description}</p>
          </div>
        </div>
      </section>

      {/* Quests — collapsed by default; expanded view groups quests by track,
          each track collapsed as well. Only active tracks reach this list
          (the API filters out quests of DRAFT/ENDED tracks). Gated on
          hasQuestSurface (see the useProjectQuests call above for why that's
          the right predicate here, not supportsQuests) — a standalone or
          chat-agent project's quest list is always empty, but gate on the
          type rather than relying on that emptiness. */}
      {hasQuestSurface(project) && quests && quests.length > 0 && (
        <section className="px-4 sm:px-6 pb-8">
          <div className="max-w-5xl mx-auto">
            <button
              type="button"
              onClick={() => setQuestsOpen((o) => !o)}
              aria-expanded={questsOpen}
              className="w-full flex items-center justify-between mb-4 cursor-pointer group"
            >
              <h2 className="text-lg font-semibold">
                Quests <span className="text-neutral-400 dark:text-white/35 font-normal">({quests.length})</span>
              </h2>
              <ChevronDown
                className={`w-5 h-5 text-neutral-400 dark:text-white/35 group-hover:text-neutral-600 dark:group-hover:text-white/60 transition-transform duration-200 ${questsOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {questsOpen && (onlyGeneralGroup ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {quests.map((quest) => (
                  <QuestPreviewCard key={quest._id} quest={quest} accentColor={project.accentColor} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {questGroups.map((group) => {
                  const open = openTracks.has(group.key);
                  return (
                    <div
                      key={group.key}
                      className="no-text-shadow bg-neutral-50 dark:bg-white/4 dark:backdrop-blur-2xl rounded-2xl border border-neutral-200 dark:border-white/8 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleTrack(group.key)}
                        aria-expanded={open}
                        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-neutral-100 dark:hover:bg-white/4 transition-colors"
                      >
                        <span className="text-sm font-semibold">{group.title}</span>
                        <span className="flex items-center gap-2 text-xs text-neutral-400 dark:text-white/35">
                          {group.quests.length} {group.quests.length === 1 ? 'quest' : 'quests'}
                          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                        </span>
                      </button>
                      {open && (
                        <div className="grid sm:grid-cols-2 gap-3 px-4 pb-4">
                          {group.quests.map((quest) => (
                            <QuestPreviewCard key={quest._id} quest={quest} accentColor={project.accentColor} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews — aggregate, rater (if eligible), list */}
      {!isPreview && (
        <ProjectReviewsSection
          projectId={project._id}
          slug={project.slug}
          canRate={installed}
          positivePercent={metrics?.positivePercent ?? 0}
          positiveCount={metrics?.positiveCount ?? 0}
          negativeCount={metrics?.negativeCount ?? 0}
          ratingCount={metrics?.ratingCount ?? 0}
        />
      )}

      {/* Social */}
      {(project.socialLinks.twitter || project.socialLinks.discord || project.socialLinks.telegram) && (
        <section className="px-4 sm:px-6 pb-8">
          <div className="max-w-5xl mx-auto flex items-center gap-4">
            {project.socialLinks.twitter && (
              <a href={project.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-neutral-400 dark:text-white/35 hover:text-orange-500 dark:hover:text-brand-orange transition-colors">
                <XIcon className="w-5 h-5" />
              </a>
            )}
            {project.socialLinks.discord && (
              <a href={project.socialLinks.discord} target="_blank" rel="noopener noreferrer" className="text-neutral-400 dark:text-white/35 hover:text-orange-500 dark:hover:text-brand-orange transition-colors">
                <DiscordIcon className="w-5 h-5" />
              </a>
            )}
            {project.socialLinks.telegram && (
              <a href={project.socialLinks.telegram} target="_blank" rel="noopener noreferrer" className="text-neutral-400 dark:text-white/35 hover:text-orange-500 dark:hover:text-brand-orange transition-colors text-sm font-medium">
                Telegram
              </a>
            )}
          </div>
        </section>
      )}

      {/* Report this project — a safety affordance, not a primary action, so
          it sits quietly at the foot of the page rather than beside the
          install/open buttons up top. Same signed-in gate and "Reported"
          marker style as the per-review Report control in
          ProjectReviewsSection; hidden in preview mode like the reviews
          section itself (a project being previewed isn't published yet). */}
      {!isPreview && canReportProject(myAddress) && (
        <section className="px-4 sm:px-6 pb-8">
          <div className="max-w-5xl mx-auto">
            {projectReported ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400 dark:text-white/35">
                <Flag className="w-3 h-3" /> Reported
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setProjectReportOpen(true)}
                title="Report this project"
                className="inline-flex items-center gap-1 text-[11px] text-neutral-400 dark:text-white/35 hover:text-red-500"
              >
                <Flag className="w-3 h-3" /> Report this project
              </button>
            )}
          </div>
        </section>
      )}

      <ReportModal
        isOpen={projectReportOpen}
        onClose={() => setProjectReportOpen(false)}
        onSubmit={async (category: ReportCategory, comment?: string) => {
          if (!sphere) throw new Error('wallet-unavailable');
          await submitReport(sphere, { targetType: 'project', targetId: project._id, category, comment });
          setProjectReported(true);
        }}
      />
    </motion.div>
  );
}
