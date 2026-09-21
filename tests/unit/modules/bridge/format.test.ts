import { describe, it, expect } from 'vitest';
import { formatUnits, parseUnits } from '@/modules/bridge/format';

describe('bridge amount formatting', () => {
  it('parses decimals into smallest units without float rounding', () => {
    expect(parseUnits('1', 6)).toBe(1_000_000n);
    expect(parseUnits('0.1', 6)).toBe(100_000n);
    expect(parseUnits('1.2345678', 6)).toBe(1_234_567n);
    expect(parseUnits('.5', 6)).toBe(500_000n);
    expect(parseUnits('', 6)).toBe(0n);
    expect(parseUnits('abc', 6)).toBe(0n);
  });

  it('formats smallest units back, trimming trailing zeros', () => {
    expect(formatUnits(1_000_000n, 6)).toBe('1');
    expect(formatUnits(1_234_500n, 6)).toBe('1.2345');
    expect(formatUnits(5n, 6)).toBe('0.000005');
    expect(formatUnits(0n, 6)).toBe('0');
  });
});
