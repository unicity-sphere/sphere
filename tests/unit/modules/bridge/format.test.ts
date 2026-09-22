import { describe, it, expect } from 'vitest';
import { formatDuration, formatUnits, parseUnits, returnStatusSentence, returnTimingSentence } from '@/modules/bridge/format';

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

const MIN = 60_000;

describe('returnTimingSentence', () => {
  it('says how long the proof has run and what a proof usually takes', () => {
    expect(returnTimingSentence({ status: 'proving', sinceMs: 100 * MIN }, { averageProofMs: 58 * MIN }, 112 * MIN)).toBe(
      'Proving for 12 min. A proof takes about 58 min on average.',
    );
  });

  it('admits when no proof has finished on the service yet', () => {
    expect(returnTimingSentence({ status: 'proving', sinceMs: 100 * MIN }, {}, 105 * MIN)).toBe(
      'Proving for 5 min. No proof has finished on this service yet.',
    );
    expect(returnTimingSentence({ status: 'proving', sinceMs: 100 * MIN }, null, 105 * MIN)).toBe(
      'Proving for 5 min. No proof has finished on this service yet.',
    );
  });

  it('places a queued burn behind the batch that is proving', () => {
    expect(
      returnTimingSentence({ status: 'queued', queuePosition: 2 }, { provingSinceMs: 0, averageProofMs: 60 * MIN }, 30 * MIN),
    ).toBe('Position 2 in the queue. Another batch has been proving for 30 min; this burn joins the next one. A proof takes about 1 h on average.');
  });

  it('has nothing to add once the proof is done', () => {
    expect(returnTimingSentence({ status: 'proven' }, null, 0)).toBeNull();
    expect(returnTimingSentence({ status: 'settled' }, null, 0)).toBeNull();
  });
});

describe('formatDuration', () => {
  it('rounds to the useful unit', () => {
    expect(formatDuration(40_000)).toBe('40 s');
    expect(formatDuration(12 * MIN)).toBe('12 min');
    expect(formatDuration(65 * MIN)).toBe('1 h 5 min');
    expect(formatDuration(120 * MIN)).toBe('2 h');
    expect(formatDuration(-5_000)).toBe('0 s');
  });
});
