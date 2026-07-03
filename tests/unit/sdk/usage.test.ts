import { describe, it, expect } from 'vitest';
import { usagePercent, formatExpiry, msUntil, formatCountdown } from '@/sdk/subscription/usage';

describe('usagePercent', () => {
  it('computes a rounded percentage', () => {
    expect(usagePercent(497, 500)).toBe(99);
    expect(usagePercent(0, 500)).toBe(0);
  });
  it('clamps to 100 and guards a zero/negative limit', () => {
    expect(usagePercent(600, 500)).toBe(100);
    expect(usagePercent(5, 0)).toBe(0);
  });
});

describe('formatExpiry', () => {
  it('returns a readable date', () => {
    expect(formatExpiry('2026-08-01T00:00:00Z')).toMatch(/2026/);
  });
  it('handles null', () => {
    expect(formatExpiry(null)).toBe('—');
  });
  it('handles an unparseable date string', () => {
    expect(formatExpiry('not-a-date')).toBe('—');
  });
});

describe('msUntil', () => {
  it('returns the clamped remaining ms', () => {
    const now = Date.parse('2026-07-03T10:00:00Z');
    expect(msUntil('2026-07-03T10:00:10Z', now)).toBe(10_000);
  });
  it('clamps a past reset time to 0', () => {
    const now = Date.parse('2026-07-03T10:00:00Z');
    expect(msUntil('2026-07-03T09:59:00Z', now)).toBe(0);
  });
  it('returns null for no reset time or an invalid one', () => {
    expect(msUntil(null, 0)).toBeNull();
    expect(msUntil('nope', 0)).toBeNull();
  });
});

describe('formatCountdown', () => {
  it('shows hours and padded minutes', () => {
    expect(formatCountdown((2 * 3600 + 5 * 60) * 1000)).toBe('2h 05m');
  });
  it('shows minutes and padded seconds under an hour', () => {
    expect(formatCountdown((12 * 60 + 3) * 1000)).toBe('12m 03s');
  });
  it('shows seconds under a minute', () => {
    expect(formatCountdown(45_000)).toBe('45s');
  });
});
