import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AnnouncementsUIProvider } from '@/contexts/AnnouncementsUIProvider';

/**
 * Regression guard for review fix 4: `recordClick` rejects on any non-2xx
 * response like every other call this client makes, but its result was
 * never awaited or caught in handleCtaClick — the one announcements request
 * not already wrapped in a swallowed catch. Left unhandled, the rejection
 * escapes as an `unhandledrejection`, which in the real app reaches Sentry's
 * global handler as production noise for what is a cosmetic telemetry call.
 *
 * `recordClick` below is a plain function, not `vi.fn()`: vitest's own mock
 * internally attaches a `.then()` to whatever a mock returns (to power
 * `toHaveResolved`/`toHaveRejected` assertions), which itself "handles" the
 * rejection and would mask exactly the bug this test exists to catch — a
 * `vi.fn().mockRejectedValue(...)` was verified NOT to trigger
 * `unhandledRejection` even with no `.catch()` anywhere, for that reason.
 *
 * vi.mock factories are hoisted above regular top-level `const`s, so the
 * mutable call log referenced inside the factory below is created via
 * vi.hoisted to avoid a TDZ ReferenceError (see
 * featuredProjectCardQuestsProp.test.tsx for the same pattern).
 */
const { recordClickCalls } = vi.hoisted(() => ({ recordClickCalls: [] as string[] }));

vi.mock('@/sdk', () => ({
  useSphereContext: () => ({ sphere: {}, isInitialized: true }),
}));

vi.mock('@/services/announcementsClient', () => ({
  createAnnouncementsClient: () => ({
    getFeed: async () => ({
      items: [{
        id: 'a1', priority: 'major', type: 'release', title: 'Season 3 quests are open',
        summary: 'S', body: 'B', heroUrl: null,
        cta: { label: 'See quests', url: '/quests' },
        publishAt: '2026-01-01T00:00:00.000Z', expiresAt: null, read: false,
      }],
      unreadCount: 1,
      autoOpen:    'a1',
      prefs:       { autoOpenEnabled: true },
    }),
    getArchive:  async () => ({ items: [], nextCursor: null }),
    markRead:    async () => {},
    markAllRead: async () => {},
    recordClick: (id: string) => {
      recordClickCalls.push(id);
      return Promise.reject(new Error('offline'));
    },
    setPrefs:    async () => {},
  }),
}));

describe('AnnouncementsUIProvider CTA click', () => {
  it('never lets a rejected recordClick escape as an unhandled rejection', async () => {
    const unhandled: unknown[] = [];
    const handler = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', handler);

    try {
      render(
        <MemoryRouter>
          <AnnouncementsUIProvider>
            <span>routed content</span>
          </AnnouncementsUIProvider>
        </MemoryRouter>,
      );

      const cta = await waitFor(() => screen.getByRole('button', { name: 'See quests' }));
      fireEvent.click(cta);

      // Give the rejected promise's microtask queue a turn to (mis)fire
      // before asserting — an unhandled rejection is reported asynchronously.
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(recordClickCalls).toEqual(['a1']);
      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', handler);
    }
  });
});
