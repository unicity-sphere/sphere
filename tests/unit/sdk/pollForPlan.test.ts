import { describe, it, expect, vi } from 'vitest';
import { pollForPlan } from '@/sdk/subscription/pollForPlan';

const noSleep = () => Promise.resolve();

describe('pollForPlan', () => {
  it('resolves true when the plan activates on a later poll', async () => {
    const fetchKeyInfo = vi.fn()
      .mockResolvedValueOnce({ pricingPlan: { id: 0 } })
      .mockResolvedValueOnce({ pricingPlan: { id: 2 } });
    const ok = await pollForPlan(fetchKeyInfo, 2, { intervalMs: 1, sleep: noSleep });
    expect(ok).toBe(true);
    expect(fetchKeyInfo).toHaveBeenCalledTimes(2);
  });

  it('resolves false on timeout', async () => {
    let t = 0;
    const now = () => (t += 1000); // advances 1s each call → crosses a 2s timeout quickly
    const fetchKeyInfo = vi.fn().mockResolvedValue({ pricingPlan: { id: 0 } });
    const ok = await pollForPlan(fetchKeyInfo, 2, { intervalMs: 1, timeoutMs: 2, now, sleep: noSleep });
    expect(ok).toBe(false);
  });

  it('keeps polling through transient errors', async () => {
    const fetchKeyInfo = vi.fn()
      .mockRejectedValueOnce(new Error('flaky'))
      .mockResolvedValueOnce({ pricingPlan: { id: 3 } });
    const ok = await pollForPlan(fetchKeyInfo, 3, { intervalMs: 1, sleep: noSleep });
    expect(ok).toBe(true);
  });
});
