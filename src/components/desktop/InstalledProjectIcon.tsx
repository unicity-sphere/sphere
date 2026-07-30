import { useState, useRef, useEffect, type CSSProperties, type Ref } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ExternalLink, Store, Trash2, MoreVertical } from 'lucide-react';
import { InstalledProjectIcon as InstalledProjectIconUI } from '@unicitylabs/sphere-ui';
import { useDesktopState } from '../../hooks/useDesktopState';
import { useInstalledProjects } from '../../hooks/useInstalledProjects';
import type { ProjectSummary } from '../../services/marketplaceApi';
import { isHttpsUrl } from '../../utils/isHttpsUrl';
import { isStandalone } from '../../utils/isStandalone';

interface InstalledProjectIconProps {
  project: ProjectSummary & { appUrl?: string | null; websiteUrl?: string | null };
  /** Outer container ref (e.g. dnd-kit `setNodeRef`). */
  containerRef?: Ref<HTMLDivElement>;
  /** Outer container inline style (e.g. dnd-kit transform/transition). */
  containerStyle?: CSSProperties;
  /** Inner button ref (e.g. dnd-kit `setActivatorNodeRef`). */
  buttonRef?: Ref<HTMLButtonElement>;
  /** Extra props spread on the inner button (e.g. dnd-kit attributes+listeners). */
  buttonProps?: { className?: string; style?: CSSProperties } & Record<string, unknown>;
}

export function InstalledProjectIcon({
  project,
  containerRef,
  containerStyle,
  buttonRef,
  buttonProps,
}: InstalledProjectIconProps) {
  const navigate = useNavigate();
  const { openTab } = useDesktopState();
  const { uninstall, ping } = useInstalledProjects();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // A `standalone` project has nothing to launch: it runs on the user's own
  // machine. Its repository must never go through openTab — GitHub sends
  // X-Frame-Options: deny, so the in-app frame would render blank. Falling
  // through to the project page gives the user the repo and website buttons,
  // the description and the install command instead.
  const launchUrl = isStandalone(project) ? null : (project.appUrl ?? project.websiteUrl);

  const handleClick = () => {
    void ping(project.slug);
    if (launchUrl) {
      openTab('custom', { url: launchUrl, label: project.name });
      navigate(`/agents/custom?url=${encodeURIComponent(launchUrl)}`);
    } else {
      navigate(`/apps/${project.slug}`);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen((prev) => !prev);
  };

  // window.open is an unsanitised navigation sink — unlike a JSX `href`, React
  // applies no protocol checking to it at all. This app is the wallet (the
  // origin holding the user's keys), and repoUrl/websiteUrl are project data
  // that can reach this component via an admin/migration/seed path that skips
  // normal write-side validation, so gate on isHttpsUrl before ever rendering
  // an entry that calls it — a non-https value gets no menu item at all,
  // rather than a menu item whose click would fail safe.
  const menuItems = [
    // Branch on type first so this list can never disagree with launchUrl,
    // which forbids framing for `standalone` unconditionally: a standalone
    // record must never offer "Open in Tab", even if it carries a stray appUrl.
    ...(isStandalone(project)
      ? (project.repoUrl && isHttpsUrl(project.repoUrl)
          ? [{
              label: 'Open repository',
              icon: ExternalLink,
              onClick: () => window.open(project.repoUrl!, '_blank', 'noopener,noreferrer'),
            }]
          : [])
      : (project.appUrl
          ? [{
              label: 'Open in Tab',
              icon: Globe,
              onClick: () => {
                openTab('custom', { url: project.appUrl!, label: project.name });
                navigate(`/agents/custom?url=${encodeURIComponent(project.appUrl!)}`);
              },
            }]
          : [])),
    ...(project.websiteUrl && isHttpsUrl(project.websiteUrl)
      ? [{
          label: 'Open Website',
          icon: ExternalLink,
          onClick: () => window.open(project.websiteUrl!, '_blank', 'noopener,noreferrer'),
        }]
      : []),
    {
      label: 'Marketplace Page',
      icon: Store,
      onClick: () => navigate(`/apps/${project.slug}`),
    },
    {
      label: 'Remove from Desktop',
      icon: Trash2,
      onClick: () => uninstall(project.slug),
      danger: true,
    },
  ];

  // Combine the outer wrapper ref (for menu outside-click) with the dnd-kit container ref
  const setContainerRef = (node: HTMLDivElement | null) => {
    (menuRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    if (typeof containerRef === 'function') containerRef(node);
    else if (containerRef && 'current' in containerRef) {
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
  };

  return (
    <div className="relative" ref={setContainerRef} style={containerStyle}>
      <InstalledProjectIconUI
        name={project.name}
        logoUrl={project.logoUrl}
        accentColor={project.accentColor}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        buttonRef={buttonRef}
        buttonProps={buttonProps}
        topRightAction={
          <div
            role="button"
            tabIndex={0}
            aria-label="Open context menu"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((prev) => !prev); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen((prev) => !prev);
              }
            }}
            // Outer wrapper extends the click target without growing the visible circle.
            className="group/menubtn absolute top-0 right-0 p-1.5 z-30 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="w-4 h-4 rounded-full bg-black/40 backdrop-blur-sm text-white/70 group-hover/menubtn:text-white group-hover/menubtn:bg-black/60 flex items-center justify-center transition-colors">
              <MoreVertical className="w-2.5 h-2.5" />
            </div>
          </div>
        }
      />

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden"
          >
            {menuItems.map(({ label, icon: Icon, onClick, danger }) => (
              <button
                key={label}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onClick();
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors text-left ${
                  danger
                    ? 'text-red-400 hover:bg-red-500/10'
                    : 'text-white/70 hover:bg-white/8 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
