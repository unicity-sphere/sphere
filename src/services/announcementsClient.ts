/**
 * AnnouncementsClient port (from @unicitylabs/sphere-ui) implemented over this
 * app's existing auth — the lazy sign-in in userApi.ts, JWT under
 * `sphere_user_jwt`, `X-Client: sphere`. No second auth path: the JWT comes
 * from ensureJwt(), the same function fetchInstalledApps() etc. already use.
 *
 * The Sphere instance isn't a stable module-level value (it comes from
 * SphereProvider's React state, and changes across lock/unlock/re-init), so
 * this takes a getter rather than a single instance: each call reads whatever
 * is live at that moment instead of closing over a snapshot that may go stale
 * mid-session.
 */
import type { Sphere } from '@unicitylabs/sphere-sdk';
import type { AnnouncementsClient, AnnouncementFeed, ClientAnnouncement } from '@unicitylabs/sphere-ui';
import { ensureJwt } from './userApi';

const API_BASE = import.meta.env.VITE_SPHERE_API_URL ?? 'http://localhost:3001';
const X_CLIENT = 'sphere';

async function request<T>(
  getSphere: () => Sphere | null,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const sphere = getSphere();
  if (!sphere) throw new Error('announcementsClient: wallet not initialized');

  const jwt = await ensureJwt(sphere);
  const headers: Record<string, string> = {
    'X-Client': X_CLIENT,
    Authorization: `Bearer ${jwt}`,
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`announcementsClient: ${init.method ?? 'GET'} ${path} failed: ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function createAnnouncementsClient(getSphere: () => Sphere | null): AnnouncementsClient {
  return {
    getFeed: () => request<AnnouncementFeed>(getSphere, '/api/announcements'),

    getArchive: (cursor) => {
      const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
      return request<{ items: ClientAnnouncement[]; nextCursor: string | null }>(
        getSphere, `/api/announcements/archive${qs}`,
      );
    },

    async markRead(id, via) {
      await request(getSphere, `/api/announcements/${id}/read`, {
        method: 'POST',
        body:   JSON.stringify({ via }),
      });
    },

    async markAllRead() {
      await request(getSphere, '/api/announcements/read-all', { method: 'POST' });
    },

    async recordClick(id) {
      await request(getSphere, `/api/announcements/${id}/click`, { method: 'POST' });
    },

    async setPrefs(autoOpenEnabled) {
      await request(getSphere, '/api/announcements/prefs', {
        method: 'PUT',
        body:   JSON.stringify({ autoOpenEnabled }),
      });
    },
  };
}
