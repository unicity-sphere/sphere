import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AnnouncementsUIProvider } from '@/contexts/AnnouncementsUIProvider';

/**
 * Regression guard for the review-round-1 requirement: the modal must
 * render as a direct sibling of whatever AnnouncementsUIProvider wraps,
 * never nested inside it. It renders inline (not through a portal), so an
 * ancestor establishing a stacking context would render it behind other
 * content, and an ancestor `overflow: hidden` would clip its
 * `position: fixed` backdrop — exactly what App.tsx's real DashboardLayout
 * ancestor does. `layout-wrapper` below stands in for that (or any future)
 * layout chrome; the point is that it doesn't matter what `children`
 * contains, the modal must never end up inside it.
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

describe('AnnouncementsUIProvider mount point', () => {
  it('renders the auto-open modal outside an overflow-hidden layout wrapper, never inside it', async () => {
    render(
      <MemoryRouter>
        <AnnouncementsUIProvider>
          <div data-testid="layout-wrapper" style={{ overflow: 'hidden', position: 'relative' }}>
            <span>routed content</span>
          </div>
        </AnnouncementsUIProvider>
      </MemoryRouter>,
    );

    const dialog = await waitFor(() => screen.getByRole('dialog'));
    const wrapper = screen.getByTestId('layout-wrapper');
    expect(wrapper.contains(dialog)).toBe(false);

    // Also walk the dialog's real ancestor chain: even if some future edit
    // wraps {children} and the modal in a shared div instead of nesting the
    // modal inside children directly, an overflow-hidden ancestor there
    // would clip it exactly the same way DashboardLayout's real one would.
    for (let node = dialog.parentElement; node && node !== document.body; node = node.parentElement) {
      expect(getComputedStyle(node).overflow).not.toBe('hidden');
    }
  });
});
