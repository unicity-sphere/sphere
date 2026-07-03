import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SphereError } from '@unicitylabs/sphere-sdk';
import { useTransfer } from '../../../src/sdk/hooks/payments/useTransfer';

// The hook reads the wallet from useSphereContext — swap in a fake with just
// payments.send. The SDK throws a ProofUnconfirmedError (extends SphereError,
// code CERTIFICATION_UNCONFIRMED) for a possibly-certified send (#631/#633).
let fakeSphere: { payments: { send: ReturnType<typeof vi.fn> } } | null = null;
vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: fakeSphere }),
}));

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
