import { pollOrderStatus } from '@/sdk/subscription/pollOrder';
import type { OrderStatusInfo } from '@/services/subscriptionApi';

const base: OrderStatusInfo = { orderId: 'o', status: 'pending', statusName: 'x', fulfilled: false, confirming: false };
const instant = () => ({ intervalMs: 1, timeoutMs: 50, sleep: async () => {}, now: (() => { let t = 0; return () => (t += 10); })() });

it('resolves paid with the revealed key', async () => {
  const seq: OrderStatusInfo[] = [base, { ...base, status: 'paid', fulfilled: true, apiKey: 'sk_new' }];
  // `instant()` — CALL the factory; `{ ...instant }` spreads a function (no own
  // enumerable props) so intervalMs/timeoutMs/sleep fall back to prod defaults
  // and the test silently runs on a real 3s timer.
  const res = await pollOrderStatus(async () => seq.shift() ?? seq[0], instant());
  expect(res).toEqual({ outcome: 'paid', apiKey: 'sk_new' });
});

it('resolves paid without a key when the reveal was consumed elsewhere', async () => {
  const res = await pollOrderStatus(async () => ({ ...base, status: 'paid', fulfilled: true }), instant());
  expect(res).toEqual({ outcome: 'paid', apiKey: undefined });
});

it('resolves failed on a failed order', async () => {
  const res = await pollOrderStatus(async () => ({ ...base, status: 'failed' }), instant());
  expect(res.outcome).toBe('failed');
});

it('times out while pending, swallowing transient errors', async () => {
  let n = 0;
  const res = await pollOrderStatus(async () => { if (n++ % 2) throw new Error('net'); return base; }, instant());
  expect(res.outcome).toBe('timeout');
});

it('resolves cancelled when the signal is already aborted (never fetches)', async () => {
  const ac = new AbortController();
  ac.abort();
  const fetchStatus = vi.fn(async () => base);
  const res = await pollOrderStatus(fetchStatus, { ...instant(), signal: ac.signal });
  expect(res.outcome).toBe('cancelled');
  expect(fetchStatus).not.toHaveBeenCalled();
});

it('resolves cancelled when aborted mid-poll', async () => {
  const ac = new AbortController();
  const res = await pollOrderStatus(
    async () => { ac.abort(); return base; }, // pending, then abort before next tick
    { ...instant(), signal: ac.signal },
  );
  expect(res.outcome).toBe('cancelled');
});

it('the default (real-timer) sleep unblocks immediately on abort', async () => {
  // No custom `sleep` — exercises pollOrder's abortable setTimeout branch. A
  // 60s interval would hang the test if abort did not clear/resolve the timer.
  const ac = new AbortController();
  const res = await pollOrderStatus(
    async () => { ac.abort(); return base; },
    { intervalMs: 60_000, timeoutMs: 120_000, signal: ac.signal }, // real setTimeout
  );
  expect(res.outcome).toBe('cancelled');
});
