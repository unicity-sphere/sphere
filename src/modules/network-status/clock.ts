/**
 * Estimates the aggregator's clock from the browser's, for placing rounds on a
 * moving time axis: aggregator time ≈ `now + offset`.
 *
 * Each newly seen round is a sighting, `createdAt − now`. A round is always seen
 * after it was created, so the least-delayed sighting is the best estimate: the
 * offset is the max over the sightings of the last `windowMs`. Sightings are keyed
 * by round, not by "a larger timestamp than before", so one block with a wild
 * timestamp is forgotten within the window, even when the rounds after it carry
 * smaller (correct) timestamps.
 */
export class ClockEstimator {
  private readonly windowMs: number;
  private readonly sightings: { at: number; offset: number }[] = [];
  private lastRound: number | null = null;

  constructor(windowMs = 8_000) {
    this.windowMs = windowMs;
  }

  /** Record the newest round, identified by its root round. Repeats are ignored. */
  observe(rootRound: number, createdAt: number, now: number): void {
    if (rootRound === this.lastRound) return;
    this.lastRound = rootRound;
    this.sightings.push({ at: now, offset: createdAt - now });
  }

  /** Treat `ms` as not having passed (a paused page): every sighting moves forward by it. */
  shift(ms: number): void {
    for (const s of this.sightings) {
      s.at += ms;
      s.offset -= ms;
    }
  }

  /** `null` before the first sighting. */
  offset(now: number): number | null {
    while (this.sightings.length > 1 && now - this.sightings[0].at > this.windowMs) this.sightings.shift();
    if (this.sightings.length === 0) return null;
    let best = -Infinity;
    for (const s of this.sightings) best = Math.max(best, s.offset);
    return best;
  }
}
