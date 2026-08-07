import { useContext } from 'react';
import { AnnouncementsUIContext, type AnnouncementsUIValue } from './AnnouncementsUIContext';

/**
 * Returns null rather than throwing when there's no provider — unlike
 * useServices()/useSphere(), Header.tsx renders in test harnesses that don't
 * always mount AnnouncementsUIProvider, and announcements are never a reason
 * a portal fails to render.
 */
export function useAnnouncementsUI(): AnnouncementsUIValue | null {
  return useContext(AnnouncementsUIContext);
}
