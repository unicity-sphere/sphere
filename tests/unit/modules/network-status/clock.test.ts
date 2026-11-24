import { describe, it, expect } from 'vitest';
import { ClockEstimator } from '@/modules/network-status/clock';

describe('ClockEstimator', () => {
  it('takes the least-delayed sighting as the offset', () => {
    const clock = new ClockEstimator(8_000);
    clock.observe(1, 10_000, 1_300); // seen 300 ms late
    clock.observe(2, 10_900, 1_950); // seen 50 ms late: the better estimate
    expect(clock.offset(2_000)).toBe(10_900 - 1_950);
  });

  it('forgets a round with a far-future timestamp, even when the rounds after it carry smaller ones', () => {
    const clock = new ClockEstimator(8_000);
    clock.observe(1, 10_000, 1_000);
    clock.observe(2, 3_600_000, 1_900); // one wild block, an hour ahead
    for (let n = 3, now = 2_800; n < 20; n++, now += 900) clock.observe(n, 10_000 + (n - 1) * 900, now);
    expect(clock.offset(17_000)).toBeLessThan(10_000);
  });

  it('ignores repeated sightings of the same round', () => {
    const clock = new ClockEstimator(8_000);
    clock.observe(1, 10_000, 1_000);
    clock.observe(1, 10_000, 9_000); // the same round, seen again much later
    expect(clock.offset(9_000)).toBe(9_000);
  });

  it('can treat a paused stretch as not having passed', () => {
    const clock = new ClockEstimator(8_000);
    clock.observe(1, 10_000, 1_000);
    clock.shift(60_000);
    expect(61_000 + clock.offset(61_000)!).toBe(10_000);
  });

  it('has no estimate before the first round', () => {
    expect(new ClockEstimator().offset(0)).toBeNull();
  });
});
