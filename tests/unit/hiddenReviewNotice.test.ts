// tests/unit/hiddenReviewNotice.test.ts
import { describe, it, expect } from 'vitest';
import { hiddenNoticeFor } from '../../src/components/marketplace/hiddenReviewNotice';
import type { MyRating } from '../../src/services/userApi';

function ratingFixture(overrides: Partial<MyRating>): MyRating {
  return {
    _id:          'r1',
    projectId:    'p1',
    recommended:  true,
    comment:      null,
    updatedAt:    '2026-08-01T00:00:00.000Z',
    hiddenAt:     null,
    hiddenReason: null,
    ...overrides,
  };
}

describe('hiddenNoticeFor', () => {
  it('returns null for a visible review', () => {
    const mine = ratingFixture({ hiddenAt: null, hiddenReason: null });
    expect(hiddenNoticeFor(mine)).toBeNull();
  });

  it('returns both fields for a hidden review with a reason', () => {
    const mine = ratingFixture({ hiddenAt: '2026-08-05T12:00:00.000Z', hiddenReason: 'Spam' });
    expect(hiddenNoticeFor(mine)).toEqual({ at: '2026-08-05T12:00:00.000Z', reason: 'Spam' });
  });

  it('returns a null reason for a hidden review with no reason given', () => {
    const mine = ratingFixture({ hiddenAt: '2026-08-05T12:00:00.000Z', hiddenReason: null });
    expect(hiddenNoticeFor(mine)).toEqual({ at: '2026-08-05T12:00:00.000Z', reason: null });
  });

  it('returns null when there is no review yet', () => {
    expect(hiddenNoticeFor(undefined)).toBeNull();
  });
});
