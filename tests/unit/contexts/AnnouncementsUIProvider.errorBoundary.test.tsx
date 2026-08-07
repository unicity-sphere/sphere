import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AnnouncementsUIProvider } from '@/contexts/AnnouncementsUIProvider';

/**
 * Regression guard for review fix 5: the root `Sentry.ErrorBoundary` in
 * main.tsx wraps the ENTIRE app, so an uncaught throw from AnnouncementModal
 * (or Markdown, or this provider) would replace the whole wallet UI until
 * reload — for a purely decorative feature. AnnouncementsUIProvider now
 * scopes a second, silent boundary to just the modal render, so a broken
 * announcement can only ever cost the modal, never the app underneath it.
 */
vi.mock('@/sdk', () => ({
  useSphereContext: () => ({ sphere: {}, isInitialized: true }),
}));

vi.mock('@/services/announcementsClient', () => ({
  createAnnouncementsClient: () => ({
    getFeed: async () => ({
      items: [{
        id: 'a1', priority: 'critical', type: 'security', title: 'Scheduled maintenance',
        summary: 'S', body: 'B', heroUrl: null, cta: null,
        publishAt: '2026-01-01T00:00:00.000Z', expiresAt: null, read: false,
      }],
      unreadCount: 1,
      autoOpen:    'a1',
      prefs:       { autoOpenEnabled: true },
    }),
    getArchive:  async () => ({ items: [], nextCursor: null }),
    markRead:    async () => {},
    markAllRead: async () => {},
    recordClick: async () => {},
    setPrefs:    async () => {},
  }),
}));

vi.mock('@unicitylabs/sphere-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@unicitylabs/sphere-ui')>();
  return {
    ...actual,
    // Stands in for any of AnnouncementModal/Markdown throwing on a
    // malformed announcement body — the failure mode this boundary exists
    // to contain, without needing to reproduce a specific markdown bug.
    AnnouncementModal: () => {
      throw new Error('boom: broken announcement render');
    },
  };
});

// Silence the expected React console.error noise from the caught throw above
// (React logs it even when a boundary catches) so the test output stays
// readable; it asserts on behaviour, not on the absence of this log line.
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('AnnouncementsUIProvider error boundary', () => {
  it('a throwing AnnouncementModal never takes down the rest of the wallet', async () => {
    render(
      <MemoryRouter>
        <AnnouncementsUIProvider>
          <span>routed content</span>
        </AnnouncementsUIProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('routed content')).toBeTruthy());
    // The modal throws on render; the local boundary swallows it and renders
    // null instead of letting it propagate to the root Sentry.ErrorBoundary.
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('routed content')).toBeTruthy();
  });
});
