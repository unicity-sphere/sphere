import { describe, it, expect, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, cleanup, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';

import { useIncomingProgress } from '../../../src/sdk/hooks/payments/useIncomingProgress';
import { SPHERE_KEYS } from '../../../src/sdk/queryKeys';

/**
 * A multi-token payment lands one `transfer:incoming` event per token, but the
 * confirmed balance cannot move until the receive drain flushes its acks and
 * the server inventory is re-pulled — once, at the end. So the wallet reads its
 * old value for the whole receive unless the in-flight total is surfaced
 * separately. This covers that surface.
 */
function harness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return { client, wrapper };
}

afterEach(cleanup);

describe('useIncomingProgress', () => {
  it('reports nothing while no receive is in flight', () => {
    const { wrapper } = harness();
    const { result } = renderHook(() => useIncomingProgress(), { wrapper });

    expect(result.current).toBeNull();
  });

  it('reflects the running total as tokens land, then clears', async () => {
    const { client, wrapper } = harness();
    const { result } = renderHook(() => useIncomingProgress(), { wrapper });

    await act(async () => {
      client.setQueryData(SPHERE_KEYS.incoming.progress, {
        amount: '1200',
        symbol: 'UCT',
        sender: '@api-4',
        at: 1,
      });
    });
    await waitFor(() => expect(result.current?.amount).toBe('1200'));

    // Later tokens in the same burst raise the total.
    await act(async () => {
      client.setQueryData(SPHERE_KEYS.incoming.progress, {
        amount: '5225',
        symbol: 'UCT',
        sender: '@api-4',
        at: 2,
      });
    });
    await waitFor(() => expect(result.current?.amount).toBe('5225'));

    // Cleared once the burst is quiet and the real balance has caught up.
    await act(async () => {
      client.setQueryData(SPHERE_KEYS.incoming.progress, null);
    });
    await waitFor(() => expect(result.current).toBeNull());
  });

  it('lives outside the payments key subtree, which the receive path invalidates per token', async () => {
    const { client, wrapper } = harness();
    const { result } = renderHook(() => useIncomingProgress(), { wrapper });

    await act(async () => {
      client.setQueryData(SPHERE_KEYS.incoming.progress, {
        amount: '900',
        symbol: 'UCT',
        sender: '@api-4',
        at: 1,
      });
    });

    // This is exactly what fires on every incoming token; it must not wipe the
    // progress we just wrote.
    await act(async () => {
      await client.invalidateQueries({ queryKey: SPHERE_KEYS.payments.all });
    });

    await waitFor(() => expect(result.current?.amount).toBe('900'));
  });
});
