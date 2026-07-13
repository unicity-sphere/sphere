/**
 * Polls a Paymento order until it settles. On 'paid':
 * - `upgrade` true means the buyer's existing key was upgraded IN PLACE — no
 *   key is ever delivered (only `maskedKey`/`planName`);
 * - otherwise `apiKey` carries the freshly issued key, which current gateways
 *   keep delivering until the caller acks receipt (ackOrderKeyDelivery). It is
 *   absent only on a pre-ack gateway whose one-time reveal was consumed by the
 *   payment return page (the UI then falls back to a paste-key claim step).
 */
import type { OrderStatusInfo } from '../../services/subscriptionApi';

export interface OrderPollResult {
  outcome: 'paid' | 'failed' | 'timeout' | 'cancelled';
  apiKey?: string;
  /** Set on 'paid' only: whether the order upgraded an existing key in place. */
  upgrade?: boolean;
  maskedKey?: string;
  planName?: string;
}

export async function pollOrderStatus(
  fetchStatus: () => Promise<OrderStatusInfo>,
  opts: {
    intervalMs?: number;
    timeoutMs?: number;
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
    /** Abort the poll (e.g. the upgrade modal closed). Resolves 'cancelled'. */
    signal?: AbortSignal;
  } = {},
): Promise<OrderPollResult> {
  const intervalMs = opts.intervalMs ?? 3000;
  const timeoutMs = opts.timeoutMs ?? 5 * 60_000;
  const now = opts.now ?? (() => Date.now());
  const signal = opts.signal;
  // Default sleep resolves early on abort so a closed modal stops polling
  // within the same tick instead of after a full interval. Check `aborted`
  // synchronously first: if the signal is ALREADY aborted, the 'abort' event
  // has fired and addEventListener would never call back (leaving the full
  // timer to run).
  const sleep =
    opts.sleep ??
    ((ms) =>
      new Promise<void>((resolve) => {
        if (signal?.aborted) { resolve(); return; }
        // Remove the listener on the normal-timer path too: with only
        // `{ once: true }` it lingers on the signal every interval it does NOT
        // fire, accumulating ~one per poll over the multi-minute window.
        const onAbort = () => { clearTimeout(t); resolve(); };
        const t = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, ms);
        signal?.addEventListener('abort', onAbort, { once: true });
      }));

  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    if (signal?.aborted) return { outcome: 'cancelled' };
    try {
      const order = await fetchStatus();
      if (order.status === 'paid') {
        return {
          outcome: 'paid',
          apiKey: order.apiKey,
          upgrade: order.upgrade === true,
          maskedKey: order.maskedKey,
          planName: order.planName,
        };
      }
      if (order.status === 'failed') return { outcome: 'failed' };
    } catch {
      // transient — keep polling
    }
    await sleep(intervalMs);
  }
  return signal?.aborted ? { outcome: 'cancelled' } : { outcome: 'timeout' };
}
