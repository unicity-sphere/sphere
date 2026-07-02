import { describe, it, expect } from 'vitest';
import { usagePercent, formatExpiry } from '@/sdk/subscription/usage';

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
});
