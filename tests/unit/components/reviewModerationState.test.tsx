/**
 * Three ways the hidden-review affordances went wrong on screen, none of
 * which the server could catch — the API was answering correctly each time.
 *
 *  1. The component is reused across projects rather than remounted, and the
 *     effect that loads "my review here" only assigned when it FOUND one. So
 *     project B showed project A's review, A's hide reason, and an Appeal
 *     button carrying A's rating id.
 *  2. `canRate` (install/completion eligibility) gated the whole block,
 *     including the "a moderator hid this" notice. Uninstalling therefore
 *     restored the shadow-ban: the review stayed hidden, its author just
 *     stopped being told and lost the Appeal button.
 *  3. The reply thread ignored its query error, so it kept rendering the last
 *     successful fetch after the server started refusing (403) to serve a
 *     hidden review's replies.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectReviewsSection } from '../../../src/components/marketplace/ProjectReviewsSection';

const ME = 'DIRECT://me';

const PROJECT_A = { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', slug: 'project-a' };
const PROJECT_B = { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', slug: 'project-b' };

const HIDE_REASON = 'off-topic rant';

vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: { identity: { directAddress: ME } } }),
}));

// The public list is not what these cases are about — an empty one keeps the
// rendered output to the caller's own review block.
vi.mock('../../../src/hooks/useMarketplace', () => ({
  useProjectRatings: () => ({ data: { ratings: [], total: 0 } }),
  useRatingReplies: () => ({ data: { replies: [] }, isLoading: false, isError: false }),
}));

const fetchMyRatings = vi.fn();
vi.mock('../../../src/services/userApi', () => ({
  getStoredJwt: () => 'jwt',
  fetchMyRatings: (...args: unknown[]) => fetchMyRatings(...args),
  submitRating: vi.fn(),
  deleteMyRating: vi.fn(),
  voteRating: vi.fn(),
  unvoteRating: vi.fn(),
  submitReport: vi.fn(),
  appealRating: vi.fn(),
}));

function Wrapper({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function renderFor(project: { id: string; slug: string }, canRate = true) {
  return render(
    <Wrapper>
      <ProjectReviewsSection
        projectId={project.id}
        slug={project.slug}
        canRate={canRate}
        positivePercent={0}
        positiveCount={0}
        negativeCount={0}
        ratingCount={0}
      />
    </Wrapper>,
  );
}

/** One hidden review, on project A only. */
const hiddenOnA = [{
  _id: 'rating-a',
  projectId: PROJECT_A.id,
  recommended: false,
  comment: 'harsh words',
  hiddenAt: new Date().toISOString(),
  hiddenReason: HIDE_REASON,
}];

beforeEach(() => {
  vi.clearAllMocks();
  fetchMyRatings.mockResolvedValue(hiddenOnA);
});

describe('the hidden-review notice belongs to the project on screen', () => {
  it('shows the notice and its reason on the project the review is actually on', async () => {
    renderFor(PROJECT_A);
    expect(await screen.findByText(/moderator hid this review/i)).toBeTruthy();
    expect(screen.getByText(new RegExp(HIDE_REASON, 'i'))).toBeTruthy();
  });

  it('does not carry it over to a project the caller has never reviewed', async () => {
    renderFor(PROJECT_B);

    // Wait for the fetch to settle, so this asserts on the resolved state
    // rather than on a render that simply hasn't loaded yet.
    await waitFor(() => expect(fetchMyRatings).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.queryByText(/moderator hid this review/i)).toBeNull();
    });
    expect(screen.queryByText(new RegExp(HIDE_REASON, 'i'))).toBeNull();
    expect(screen.queryByRole('button', { name: /appeal this decision/i })).toBeNull();
  });

  it('clears it when the same component moves from a reviewed project to an unreviewed one', async () => {
    const { rerender } = renderFor(PROJECT_A);
    expect(await screen.findByText(/moderator hid this review/i)).toBeTruthy();

    rerender(
      <Wrapper>
        <ProjectReviewsSection
          projectId={PROJECT_B.id}
          slug={PROJECT_B.slug}
          canRate
          positivePercent={0}
          positiveCount={0}
          negativeCount={0}
          ratingCount={0}
        />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.queryByText(/moderator hid this review/i)).toBeNull();
    });
  });
});

describe('losing eligibility must not hide the moderation notice', () => {
  it('keeps the notice and the Appeal button when canRate is false', async () => {
    // Uninstalling the project flips canRate to false. The review is still
    // hidden; its author must still be told, and must still be able to
    // contest it.
    renderFor(PROJECT_A, false);

    expect(await screen.findByText(/moderator hid this review/i)).toBeTruthy();
    expect(screen.getByText(new RegExp(HIDE_REASON, 'i'))).toBeTruthy();
    expect(screen.getByRole('button', { name: /appeal this decision/i })).toBeTruthy();
  });

  it('still withholds the editor itself, which eligibility genuinely gates', async () => {
    renderFor(PROJECT_A, false);
    await screen.findByText(/moderator hid this review/i);

    expect(screen.queryByRole('button', { name: /post review/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^recommend$/i })).toBeNull();
  });

  it('falls back to the plain eligibility hint when there is nothing hidden to show', async () => {
    fetchMyRatings.mockResolvedValue([]);
    renderFor(PROJECT_A, false);

    expect(await screen.findByText(/install this project or complete a quest/i)).toBeTruthy();
    expect(screen.queryByText(/moderator hid this review/i)).toBeNull();
  });
});
