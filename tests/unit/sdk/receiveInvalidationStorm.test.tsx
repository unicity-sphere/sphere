/**
 * A multi-token receive fires one transfer:incoming, one inventory:updated and
 * one history:updated PER TOKEN. The balance queries are cheap and must follow
 * that closely; the transaction history is not — useTransactionHistory walks the
 * cursor to completeness, up to 50 sequential pages.
 *
 * Measured on staging before this split: a 54-token receive issued 388
 * GET /v1/history in 34 s (~7 per token), saturating the browser's ~6
 * connections per origin so the drain's own claims queued ~590 ms each against
 * 54 ms of server time. The receive was slow because of the history refetches,
 * not because of the receive.
 */
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { renderHook, act, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';

type Handler = (payload: unknown) => void;
const listeners = new Map<string, Set<Handler>>();
const fakeSphere = {
  on: (event: string, cb: Handler) => {
    const set = listeners.get(event) ?? new Set<Handler>();
    set.add(cb);
    listeners.set(event, set);
  },
  off: (event: string, cb: Handler) => listeners.get(event)?.delete(cb),
  identity: { chainPubkey: `02${'a'.repeat(64)}` },
  payments: {},
};
const emit = (event: string, payload: unknown = {}): void => {
  for (const cb of listeners.get(event) ?? []) cb(payload);
};

vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: fakeSphere, walletApiEnabled: true }),
}));

import { useSphereEvents } from '../../../src/sdk/hooks/core/useSphereEvents';
import { SPHERE_KEYS } from '../../../src/sdk/queryKeys';

let assetFetches = 0;
let historyFetches = 0;

function harness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return { client, wrapper };
}

/**
 * The wallet as the events see it: the event bridge plus two LIVE observers —
 * a cheap balance query and the paged history walk. Both must be mounted;
 * invalidateQueries only refetches active queries.
 */
function useWallet(): void {
  useSphereEvents();
  useQuery({
    queryKey: SPHERE_KEYS.payments.assets.list,
    queryFn: async () => {
      assetFetches += 1;
      return [];
    },
  });
  useQuery({
    queryKey: SPHERE_KEYS.payments.transactions.history,
    queryFn: async () => {
      historyFetches += 1;
      return [];
    },
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  listeners.clear();
  assetFetches = 0;
  historyFetches = 0;
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

/** One token's worth of SDK events, as the receive drain emits them. */
async function receiveTokens(count: number, gapMs: number): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    await act(async () => {
      emit('transfer:incoming', { id: `t${String(i)}`, tokens: [], senderNametag: 'peer' });
      emit('inventory:updated', {});
      emit('history:updated', {});
      vi.advanceTimersByTime(gapMs);
    });
  }
}

describe('receive burst — history must not be re-walked per token', () => {
  it('keeps the balance following a 30-token receive while the history walk stays rare', async () => {
    const { wrapper, client } = harness();
    renderHook(() => useWallet(), { wrapper });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const assetsBefore = assetFetches;
    const historyBefore = historyFetches;

    // 30 tokens ~640 ms apart: the measured cadence of a real receive.
    await receiveTokens(30, 640);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    const assetRefetches = assetFetches - assetsBefore;
    const historyRefetches = historyFetches - historyBefore;

    // The balance still tracks the receive — that is the whole point of the fast path.
    expect(assetRefetches).toBeGreaterThan(5);
    // ...while the paged walk happens a handful of times, not once per token.
    // Pre-fix this was one per token, each up to 50 sequential requests.
    expect(historyRefetches).toBeLessThan(assetRefetches / 2);
    void client;
  });

  it('still refreshes the history eventually — coalesced, not dropped', async () => {
    const { wrapper } = harness();
    renderHook(() => useWallet(), { wrapper });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const before = historyFetches;

    await receiveTokens(3, 50);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    // Coalescing must not mean discarding: a receive DOES add history rows.
    expect(historyFetches).toBeGreaterThan(before);
  });
});
