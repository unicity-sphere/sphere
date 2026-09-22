import { describe, it, expect } from 'vitest';
import { formatUnits, parseUnits, returnStatusSentence } from '@/modules/bridge/format';

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

describe('return status sentence', () => {
  it('says the wallet keeps a burn the service has not taken yet', () => {
    expect(returnStatusSentence({ status: 'burned' }, 'Tron')).toMatch(/has not accepted the burn yet.*keeps the burned token/);
  });

  it('names the chain for the release steps', () => {
    expect(returnStatusSentence({ status: 'proven' }, 'Tron')).toBe('The burn is proven. The release is being sent to Tron.');
    expect(returnStatusSentence({ status: 'submitted' }, 'Tron')).toBe('The release is waiting for confirmation on Tron.');
    expect(returnStatusSentence({ status: 'settled' }, 'Tron')).toBe('Released on Tron.');
  });

  it('quotes the service on a refusal', () => {
    expect(returnStatusSentence({ status: 'failed', message: 'stale config' }, 'Tron')).toBe('The return service refused the burn: stale config');
    expect(returnStatusSentence({ status: 'failed' }, 'Tron')).toBe('The return service refused the burn.');
  });
});
