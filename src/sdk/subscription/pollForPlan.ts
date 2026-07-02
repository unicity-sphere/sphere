/**
 * Polls a key-info fetcher until the subscription reports the target plan,
 * or until the timeout elapses. Used after redirecting the user to the
 * external payment page — activation happens server-side, so we poll.
 */
export async function pollForPlan(
  fetchKeyInfo: () => Promise<{ pricingPlan: { id: number } | null }>,
  targetPlanId: number,
  opts: {
    intervalMs?: number;
    timeoutMs?: number;
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
  } = {},
): Promise<boolean> {
  const intervalMs = opts.intervalMs ?? 4000;
  const timeoutMs = opts.timeoutMs ?? 5 * 60_000;
  const now = opts.now ?? (() => Date.now());
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));

  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    try {
      const info = await fetchKeyInfo();
      if (info.pricingPlan?.id === targetPlanId) return true;
    } catch {
      // transient — keep polling
    }
    await sleep(intervalMs);
  }
  return false;
}
