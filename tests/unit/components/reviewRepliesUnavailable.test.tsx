/**
 * Once the review above it is hidden, the server stops serving its reply
 * thread (403). The component read `data` and `isLoading` but never
 * `isError`, so a failed refetch simply left the last successful render on
 * screen — the thread went on displaying replies, and offering a Reply box
 * that could only fail, for content that is no longer public.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReviewReplies } from '../../../src/components/marketplace/ReviewReplies';

const ME = 'DIRECT://me';

let repliesQuery: { data: unknown; isLoading: boolean; isError: boolean };

vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: { identity: { directAddress: ME } } }),
}));

vi.mock('../../../src/hooks/useMarketplace', () => ({
  useRatingReplies: () => repliesQuery,
}));

vi.mock('../../../src/services/userApi', () => ({
  getStoredJwt: () => 'jwt',
  postReply: vi.fn(),
  deleteReply: vi.fn(),
  submitReport: vi.fn(),
  appealReply: vi.fn(),
  fetchMyReplies: vi.fn(async () => []),
}));

function Wrapper({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const A_REPLY = {
  _id: 'reply-1',
  ratingId: 'rating-1',
  userAddress: 'DIRECT://someone',
  comment: 'a visible reply',
  createdAt: new Date().toISOString(),
  replyToReplyId: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  repliesQuery = { data: { replies: [A_REPLY] }, isLoading: false, isError: false };
});

describe('ReviewReplies when the thread read fails', () => {
  it('renders the thread normally while the read succeeds', () => {
    render(<Wrapper><ReviewReplies ratingId="rating-1" /></Wrapper>);
    expect(screen.getByText('a visible reply')).toBeTruthy();
  });

  it('says the thread is unavailable instead of showing stale replies', () => {
    // react-query keeps the last successful `data` alongside the error, which
    // is exactly why ignoring isError was invisible in manual testing.
    repliesQuery = { data: { replies: [A_REPLY] }, isLoading: false, isError: true };
    render(<Wrapper><ReviewReplies ratingId="rating-1" /></Wrapper>);

    expect(screen.getByText(/no longer available/i)).toBeTruthy();
    expect(screen.queryByText('a visible reply')).toBeNull();
  });

  it('prefers the loading state over the error state while a retry is in flight', () => {
    repliesQuery = { data: undefined, isLoading: true, isError: false };
    render(<Wrapper><ReviewReplies ratingId="rating-1" /></Wrapper>);
    expect(screen.getByText(/loading replies/i)).toBeTruthy();
  });
});
