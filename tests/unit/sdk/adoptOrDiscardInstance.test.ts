/**
 * #453: SphereProvider.initialize() is not re-entrant. Two overlapping inits
 * (StrictMode double-mount, an IPFS/network toggle) both build a live Sphere;
 * the loser of the setSphere race was never destroyed and leaked as a zombie
 * (open relay + IndexedDB connections). The guard: a superseded init must
 * DESTROY the instance it built and never adopt it — while the latest init
 * always adopts, so there is always exactly one live instance.
 */
import { describe, it, expect, vi } from 'vitest';
import { adoptOrDiscardInstance } from '../../../src/sdk/adoptOrDiscardInstance';

describe('adoptOrDiscardInstance (re-entrant init guard)', () => {
  it('adopts the instance when the init is still the latest', async () => {
    const destroy = vi.fn(async () => {});
    const adopt = vi.fn();
    const instance = { destroy };

    const outcome = await adoptOrDiscardInstance(instance, () => false, adopt);

    expect(outcome).toBe('adopted');
    expect(adopt).toHaveBeenCalledWith(instance);
    expect(destroy).not.toHaveBeenCalled();
  });

  it('destroys (never adopts) a superseded instance so it cannot leak', async () => {
    const destroy = vi.fn(async () => {});
    const adopt = vi.fn();
    const instance = { destroy };

    const outcome = await adoptOrDiscardInstance(instance, () => true, adopt);

    expect(outcome).toBe('discarded');
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(adopt).not.toHaveBeenCalled();
  });
});
