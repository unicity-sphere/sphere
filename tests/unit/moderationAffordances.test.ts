// tests/unit/moderationAffordances.test.ts
import { describe, it, expect } from 'vitest';
import { canReport, canReportProject, canAppeal } from '../../src/components/marketplace/moderationAffordances';

describe('canReport', () => {
  it('allows reporting someone else\'s content', () => {
    expect(canReport('direct://viewer', 'direct://author')).toBe(true);
  });

  it('never allows reporting your own content', () => {
    expect(canReport('direct://same', 'direct://same')).toBe(false);
  });

  it('disallows reporting when the viewer is not signed in', () => {
    expect(canReport(null, 'direct://author')).toBe(false);
  });
});

describe('canReportProject', () => {
  it('allows reporting a project when signed in', () => {
    expect(canReportProject('direct://viewer')).toBe(true);
  });

  it('disallows reporting a project when the viewer is not signed in', () => {
    expect(canReportProject(null)).toBe(false);
  });
});

describe('canAppeal', () => {
  it('is false when there is no review yet', () => {
    expect(canAppeal(undefined, false)).toBe(false);
  });

  it('is false when the review is visible (not hidden)', () => {
    expect(canAppeal({ hiddenAt: null }, false)).toBe(false);
  });

  it('is true when the review is hidden and no appeal is open', () => {
    expect(canAppeal({ hiddenAt: '2026-08-05T12:00:00.000Z' }, false)).toBe(true);
  });

  it('is false when the review is hidden but an appeal is already open', () => {
    expect(canAppeal({ hiddenAt: '2026-08-05T12:00:00.000Z' }, true)).toBe(false);
  });
});
