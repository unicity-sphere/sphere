import { pollOrderStatus } from '@/sdk/subscription/pollOrder';
import type { OrderStatusInfo } from '@/services/subscriptionApi';

const base: OrderStatusInfo = { orderId: 'o', status: 'pending', statusName: 'x', fulfilled: false, confirming: false };
const instant = () => ({ intervalMs: 1, timeoutMs: 50, sleep: async () => {}, now: (() => { let t = 0; return () => (t += 10); })() });

it('resolves paid with the revealed key', async () => {
  const seq: OrderStatusInfo[] = [base, { ...base, status: 'paid', fulfilled: true, apiKey: 'sk_new' }];
  const res = await pollOrderStatus(async () => seq.shift() ?? seq[0], { ...instant, now: (() => { let t = 0; return () => (t += 10); })() });
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
