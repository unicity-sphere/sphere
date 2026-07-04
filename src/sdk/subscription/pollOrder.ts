/**
 * Polls a Paymento order until it settles. On 'paid' the response may carry the
 * one-time revealed apiKey — absent when the gateway return page consumed the
 * reveal first (the UI then falls back to a paste-key claim step).
 */
import type { OrderStatusInfo } from '../../services/subscriptionApi';

export interface OrderPollResult { outcome: 'paid' | 'failed' | 'timeout'; apiKey?: string }

export async function pollOrderStatus(
  fetchStatus: () => Promise<OrderStatusInfo>,
  opts: { intervalMs?: number; timeoutMs?: number; now?: () => number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<OrderPollResult> {
  const intervalMs = opts.intervalMs ?? 3000;
  const timeoutMs = opts.timeoutMs ?? 5 * 60_000;
  const now = opts.now ?? (() => Date.now());
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));

  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    try {
      const order = await fetchStatus();
      if (order.status === 'paid') return { outcome: 'paid', apiKey: order.apiKey };
      if (order.status === 'failed') return { outcome: 'failed' };
    } catch {
      // transient — keep polling
    }
    await sleep(intervalMs);
  }
  return { outcome: 'timeout' };
}
