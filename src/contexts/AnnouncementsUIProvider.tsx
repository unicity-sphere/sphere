import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnnouncements, AnnouncementModal, type ClientAnnouncement } from '@unicitylabs/sphere-ui';
import { useSphereContext } from '../sdk';
import { createAnnouncementsClient } from '../services/announcementsClient';
import { AnnouncementsUIContext, type AnnouncementsUIValue } from './AnnouncementsUIContext';

/**
 * Owns the app's single useAnnouncements() call and renders the auto-open /
 * manually-opened modal as a direct sibling of whatever it wraps.
 *
 * Must be mounted at the app root, wrapping <AppRoutes /> — never inside
 * Header or DashboardLayout. The modal renders inline rather than through a
 * portal (forced by its own test in sphere-ui), so an ancestor that
 * establishes a stacking context would render it behind other content, and
 * DashboardLayout's overflow-hidden video background would clip its
 * position:fixed backdrop.
 */
export function AnnouncementsUIProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { sphere, isInitialized } = useSphereContext();

  // The Sphere instance isn't stable across a session (lock/unlock, re-init,
  // wallet switch) — a ref read at call time avoids the client closing over
  // a snapshot that goes stale mid-session.
  const sphereRef = useRef(sphere);
  sphereRef.current = sphere;
  const client = useMemo(() => createAnnouncementsClient(() => sphereRef.current), []);

  // Before a wallet exists (or while a locked one has no live identity yet)
  // there is nothing to sign in with, and the auto-open modal must never
  // appear over onboarding — gated on isInitialized (a live, unlocked
  // Sphere), not merely on a wallet existing on disk.
  const announcements = useAnnouncements(client, { enabled: isInitialized });

  // A manually-opened item (clicked from the bell's popover) takes priority
  // over the server's auto-open choice while both are in flight, and is
  // cleared independently of it on dismiss.
  const [manualId, setManualId] = useState<string | null>(null);
  const modalId = manualId ?? announcements.autoOpenId;
  const modalAnnouncement = modalId ? announcements.items.find(i => i.id === modalId) ?? null : null;

  const closeModal = () => {
    if (modalAnnouncement) announcements.markRead(modalAnnouncement.id, 'modal');
    setManualId(null);
    announcements.dismissModal();
  };

  const handleCtaClick = (announcement: ClientAnnouncement) => {
    void client.recordClick(announcement.id);
    const url = announcement.cta?.url;
    if (!url) return;
    // The server validates cta.url as either a rooted path or an https://
    // URL (see sphere-backoffice's admin API) — route in-app for the former,
    // open a new tab for the latter.
    if (url.startsWith('/')) navigate(url);
    else window.open(url, '_blank', 'noopener,noreferrer');
  };

  const value = useMemo<AnnouncementsUIValue>(() => ({
    items:       announcements.items,
    unreadCount: announcements.unreadCount,
    prefs:       announcements.prefs,
    markRead:    announcements.markRead,
    markAllRead: announcements.markAllRead,
    setAutoOpen: announcements.setAutoOpen,
    openItem:    (announcement) => setManualId(announcement.id),
  }), [announcements.items, announcements.unreadCount, announcements.prefs, announcements.markRead, announcements.markAllRead, announcements.setAutoOpen]);

  return (
    <AnnouncementsUIContext.Provider value={value}>
      {children}
      {modalAnnouncement && (
        <AnnouncementModal
          announcement={modalAnnouncement}
          onDismiss={closeModal}
          onCtaClick={handleCtaClick}
        />
      )}
    </AnnouncementsUIContext.Provider>
  );
}
