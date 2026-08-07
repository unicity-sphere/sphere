import { createContext } from 'react';
import type { ClientAnnouncement } from '@unicitylabs/sphere-ui';

/**
 * Carries useAnnouncements()'s values from the app root — the only place the
 * hook is called, since it keeps a module-level one-modal-per-session flag
 * built for a single call — down to the bell in Header.tsx, several layers
 * deeper than props can cleanly thread (App -> AppRoutes -> DashboardLayout
 * route -> Header). Header must consume this context rather than calling the
 * hook itself.
 */
export interface AnnouncementsUIValue {
  items:       ClientAnnouncement[];
  unreadCount: number;
  prefs:       { autoOpenEnabled: boolean };
  markRead:    (id: string, via: 'modal' | 'popover') => void;
  markAllRead: () => void;
  setAutoOpen: (value: boolean) => void;
  /** Opens the full modal for a popover row — the only way to see a
   *  `normal`-priority announcement in full, since those never auto-open. */
  openItem:    (announcement: ClientAnnouncement) => void;
}

export const AnnouncementsUIContext = createContext<AnnouncementsUIValue | null>(null);
