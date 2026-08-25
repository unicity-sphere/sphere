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
import { formatAmount } from '../../../src/sdk/index';
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

/**
 * The 54-token receive is coalesced into ONE climbing toast, keyed per group.
 * Both cases below are about that key and the single global progress slot it
 * writes to — a group that merges what it shouldn't, or clears what it doesn't
 * own, shows the user a number that is wrong rather than merely untidy.
 */
describe('incoming coalescing — group identity', () => {
  const token = (coinId: string, amount: string) => ({ coinId, symbol: 'UCT', decimals: 0, amount });
  const progressOf = (client: QueryClient): { amount: string } | null =>
    (client.getQueryData(SPHERE_KEYS.incoming.progress) as { amount: string } | null) ?? null;

  it('keeps two assets apart when they share a display symbol', async () => {
    const { wrapper, client } = harness();
    renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      emit('transfer:incoming', {
        id: 'a1',
        senderPubkey: 'PK',
        senderNametag: 'peer',
        tokens: [token('coin-a', '100')],
      });
    });
    await act(async () => {
      emit('transfer:incoming', {
        id: 'b1',
        senderPubkey: 'PK',
        senderNametag: 'peer',
        tokens: [token('coin-b', '7')],
      });
    });

    // coin-b's own total, not 107: same sender, same symbol, different asset.
    expect(progressOf(client)?.amount).toBe(formatAmount('7', 0));
  });

  it('does not let an expiring group clear another group’s live progress', async () => {
    const { wrapper, client } = harness();
    renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      emit('transfer:incoming', {
        id: 'a1',
        senderPubkey: 'PK-A',
        senderNametag: 'A',
        tokens: [token('coin-a', '10')],
      });
    });
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    await act(async () => {
      emit('transfer:incoming', {
        id: 'b1',
        senderPubkey: 'PK-B',
        senderNametag: 'B',
        tokens: [token('coin-b', '20')],
      });
    });
    // Past A's 6.5 s window, still inside B's — B is mid-receive.
    await act(async () => {
      vi.advanceTimersByTime(4000);
    });

    expect(progressOf(client)).not.toBeNull();
    expect(progressOf(client)?.amount).toBe(formatAmount('20', 0));
  });
});
