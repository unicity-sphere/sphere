import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, cleanup, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';

import type { ShowToastDetail } from '../../../src/components/ui/toast-utils';
import { SPHERE_KEYS } from '../../../src/sdk/queryKeys';

type Handler = (payload: unknown) => void;
const handlers = new Map<string, Handler>();
const fakeSphere = {
  on: (event: string, fn: Handler) => { handlers.set(event, fn); },
  off: (event: string) => { handlers.delete(event); },
  identity: null,
  payments: { nfts: vi.fn() },
};

vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: fakeSphere }),
}));

import { useSphereEvents } from '../../../src/sdk/hooks/core/useSphereEvents';

const token = (over: Record<string, unknown> = {}) => ({
  id: 'aa'.repeat(32),
  coinId: 'bb'.repeat(32),
  symbol: 'F16348',
  name: 'bb'.repeat(32),
  decimals: 6,
  amount: '10000000',
  status: 'confirmed',
  createdAt: 1,
  updatedAt: 1,
  ...over,
});

function mountEvents() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  renderHook(() => useSphereEvents(), { wrapper });
  return client;
}

let toasts: ShowToastDetail[] = [];
const record = (e: Event) => { toasts.push((e as CustomEvent<ShowToastDetail>).detail); };

beforeEach(() => {
  handlers.clear();
  toasts = [];
  window.addEventListener('show-toast', record);
});

afterEach(() => {
  window.removeEventListener('show-toast', record);
  cleanup();
});

describe('an incoming transfer of refused tokens', () => {
  it('is announced as unverified and never as balance arriving', async () => {
    const client = mountEvents();

    act(() => {
      handlers.get('transfer:incoming')?.({
        id: 'tr-1',
        senderPubkey: '02' + 'cc'.repeat(32),
        senderNametag: 'api-4',
        tokens: [],
        unverifiedTokens: [token({ unverified: 'refused' })],
        receivedAt: 1,
      });
    });

    await waitFor(() => expect(toasts).toHaveLength(1));
    expect(toasts[0]?.message).toBe('@api-4 sent you 10 unverified F16348');
    expect(client.getQueryData(SPHERE_KEYS.incoming.progress) ?? null).toBeNull();
  });
});
