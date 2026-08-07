import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AnnouncementsUIProvider } from '@/contexts/AnnouncementsUIProvider';

/**
 * A review/reply appeal's outcome (sphere-api's announceReviewAppealDecision,
 * task 33) is a wallet-addressed announcement — server-side only: the
 * `audience: 'wallet'` filtering happens entirely in sphere-api's
 * audienceClause() before the item ever reaches this client. The wallet has
 * no separate rendering path for it; it arrives through the exact same
 * `GET /api/announcements` feed as every portal/org announcement and renders
 * through the ordinary auto-open modal. This is the wallet-side half of that
 * guarantee: given an item shaped like an appeal outcome, it renders, and its
 * CTA (a rooted `/apps/:slug` path — the project page the review lives on)
 * navigates in-app rather than opening a new tab, exactly like every other
 * rooted-path CTA (see AnnouncementsUIProvider.recordClick.test.tsx for the
 * sibling coverage on the click-telemetry side of the same handler).
 */
vi.mock('@/sdk', () => ({
  useSphereContext: () => ({ sphere: {}, isInitialized: true }),
}));

vi.mock('@/services/announcementsClient', () => ({
  createAnnouncementsClient: () => ({
    getFeed: async () => ({
      items: [{
        id:      'appeal-1',
        priority: 'normal',
        type:     'update',
        title:    'Your appeal was granted',
        summary:  'Your appeal was granted — your review is public again.',
        body:     'Your appeal was granted — your review is public again.',
        heroUrl:  null,
        cta:      { label: 'View project', url: '/apps/demo-project' },
        publishAt: '2026-01-01T00:00:00.000Z', expiresAt: null, read: false,
      }],
      unreadCount: 1,
      autoOpen:    'appeal-1',
      prefs:       { autoOpenEnabled: true },
    }),
    getArchive:  async () => ({ items: [], nextCursor: null }),
    markRead:    async () => {},
    markAllRead: async () => {},
    recordClick: async () => {},
    setPrefs:    async () => {},
  }),
}));

describe('AnnouncementsUIProvider — wallet-addressed appeal-outcome announcement', () => {
  it('renders the outcome and its CTA navigates in-app to the project page it links to', async () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <AnnouncementsUIProvider>
          <Routes>
            <Route path="/home" element={<span>home</span>} />
            <Route path="/apps/:slug" element={<span>project page</span>} />
          </Routes>
        </AnnouncementsUIProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Your appeal was granted')).toBeTruthy();

    const cta = await waitFor(() => screen.getByRole('button', { name: 'View project' }));
    fireEvent.click(cta);

    // A rooted path CTA routes in-app (AnnouncementsUIProvider's
    // handleCtaClick) rather than opening a new tab — this is what proves it:
    // the /apps/:slug route actually rendered in place of /home.
    expect(await screen.findByText('project page')).toBeTruthy();
  });
});
