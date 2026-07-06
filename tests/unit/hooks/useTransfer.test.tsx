import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SphereError } from '@unicitylabs/sphere-sdk';
import type { UtilizationInfo } from '../../../src/services/subscriptionApi';
import { useTransfer } from '../../../src/sdk/hooks/payments/useTransfer';

// The hook reads the wallet from useSphereContext — swap in a fake with just
// payments.send. The SDK throws a ProofUnconfirmedError (extends SphereError,
// code CERTIFICATION_UNCONFIRMED) for a possibly-certified send (#631/#633).
let fakeSphere: { payments: { send: ReturnType<typeof vi.fn> } } | null = null;
vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: fakeSphere }),
}));

// Task 3: proactive quota gate. Mock checkSendQuota (keep the real
// QuotaBlockedError class so `instanceof` in useTransfer still works) and
// make SUBSCRIPTION_ENABLED independently toggleable per test.
vi.mock('../../../src/sdk/quotaGate', async (orig) => ({
  ...(await orig<typeof import('../../../src/sdk/quotaGate')>()),
  checkSendQuota: vi.fn(),
}));
vi.mock('../../../src/config/subscription', async (orig) => ({
  ...(await orig<typeof import('../../../src/config/subscription')>()),
  SUBSCRIPTION_ENABLED: true,
}));

import { checkSendQuota, QuotaBlockedError } from '../../../src/sdk/quotaGate';
import * as subscriptionConfig from '../../../src/config/subscription';

function utilization(overrides: { status?: UtilizationInfo['status']; availablePerMinute?: number } = {}): UtilizationInfo {
  return {
    status: overrides.status ?? 'active',
    plan: { name: 'free', requestsPerMinute: 60, requestsPerDay: 1000 },
    activeUntil: null,
    utilization: {
      consumedPerMinute: 0,
      maxPerMinute: 60,
      availablePerMinute: overrides.availablePerMinute ?? 60,
      utilizationPercentPerMinute: 0,
      consumedPerDay: 0,
      maxPerDay: 1000,
      availablePerDay: 1000,
      utilizationPercentPerDay: 0,
    },
  };
}

function Wrapper({ children }: { children: ReactNode }) {
  // One stable client per wrapper instance — a fresh QueryClient on each render
  // would reset mutation state mid-test and flake.
  const [qc] = useState(
    () => new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } }),
  );
  return createElement(QueryClientProvider, { client: qc }, children);
}

const PARAMS = { coinId: 'c', amount: '100', recipient: '@bob' };

beforeEach(() => {
  fakeSphere = null;
  vi.mocked(checkSendQuota).mockReset().mockResolvedValue({ verdict: 'allow' });
  (subscriptionConfig as { SUBSCRIPTION_ENABLED: boolean }).SUBSCRIPTION_ENABLED = true;
});

describe('useTransfer — #631/#633 possibly-certified send', () => {
  it('converts a CERTIFICATION_UNCONFIRMED reject into a delivery-pending SUCCESS (no re-send → no double-pay)', async () => {
    const send = vi.fn().mockRejectedValue(
      new SphereError('certification unconfirmed — the source spend may be on-chain', 'CERTIFICATION_UNCONFIRMED'),
    );
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    let res: { deliveryPending?: boolean } | undefined;
    await act(async () => {
      res = await result.current.transfer(PARAMS);
    });

    // Resolved (NOT rejected) as a pending success: the send screen shows "Sent —
    // pending" and never returns to a re-sendable confirm step. send() ran exactly once.
    expect(res?.deliveryPending).toBe(true);
    expect(result.current.error).toBeNull();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('still rejects a genuine failure so the user is told (and can retry safely)', async () => {
    const send = vi.fn().mockRejectedValue(new SphereError('not enough balance', 'INSUFFICIENT_BALANCE'));
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    await expect(
      act(async () => {
        await result.current.transfer(PARAMS);
      }),
    ).rejects.toThrow(/not enough balance/);
  });

  it('passes a normal success result through unchanged', async () => {
    const ok = { id: 't1', status: 'completed', tokens: [], tokenTransfers: [] };
    const send = vi.fn().mockResolvedValue(ok);
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    let res: unknown;
    await act(async () => {
      res = await result.current.transfer(PARAMS);
    });
    expect(res).toEqual(ok);
  });
});

describe('useTransfer — proactive quota gate (Task 3)', () => {
  it('rejects with QuotaBlockedError and never calls send on a "block" verdict', async () => {
    const info = utilization({ status: 'expired' });
    vi.mocked(checkSendQuota).mockResolvedValue({ verdict: 'block', info });
    const send = vi.fn().mockResolvedValue({ id: 't1', status: 'completed', tokens: [], tokenTransfers: [] });
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    await expect(
      act(async () => {
        await result.current.transfer(PARAMS);
      }),
    ).rejects.toThrow(QuotaBlockedError);
    expect(send).not.toHaveBeenCalled();
  });

  it('proceeds to send on an "allow" verdict', async () => {
    vi.mocked(checkSendQuota).mockResolvedValue({ verdict: 'allow' });
    const ok = { id: 't1', status: 'completed', tokens: [], tokenTransfers: [] };
    const send = vi.fn().mockResolvedValue(ok);
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    let res: unknown;
    await act(async () => {
      res = await result.current.transfer(PARAMS);
    });
    expect(res).toEqual(ok);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('proceeds to send on a "warn" verdict (UI-only, no hook effect)', async () => {
    const info = utilization({ availablePerMinute: 3 });
    vi.mocked(checkSendQuota).mockResolvedValue({ verdict: 'warn', info });
    const ok = { id: 't1', status: 'completed', tokens: [], tokenTransfers: [] };
    const send = vi.fn().mockResolvedValue(ok);
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    let res: unknown;
    await act(async () => {
      res = await result.current.transfer(PARAMS);
    });
    expect(res).toEqual(ok);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('still calls send when checkSendQuota throws unexpectedly (defensive fail-open)', async () => {
    vi.mocked(checkSendQuota).mockRejectedValue(new Error('boom'));
    const ok = { id: 't1', status: 'completed', tokens: [], tokenTransfers: [] };
    const send = vi.fn().mockResolvedValue(ok);
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    let res: unknown;
    await act(async () => {
      res = await result.current.transfer(PARAMS);
    });
    expect(res).toEqual(ok);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('never calls checkSendQuota when SUBSCRIPTION_ENABLED is false', async () => {
    (subscriptionConfig as { SUBSCRIPTION_ENABLED: boolean }).SUBSCRIPTION_ENABLED = false;
    const ok = { id: 't1', status: 'completed', tokens: [], tokenTransfers: [] };
    const send = vi.fn().mockResolvedValue(ok);
    fakeSphere = { payments: { send } };
    const { result } = renderHook(() => useTransfer(), { wrapper: Wrapper });

    let res: unknown;
    await act(async () => {
      res = await result.current.transfer(PARAMS);
    });
    expect(res).toEqual(ok);
    expect(checkSendQuota).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
  });
});
