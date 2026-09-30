import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, cleanup, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';

import { SEPOLIA_USDC_BRIDGE } from '@unicitylabs/bridge-plugin/wallet';

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
  coinId: SEPOLIA_USDC_BRIDGE.coinIdHex!,
  symbol: 'EAE954',
  name: SEPOLIA_USDC_BRIDGE.coinIdHex!,
  decimals: 0,
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
  const arrival = (id: string, amount: string) => ({
    id,
    senderPubkey: '02' + 'cc'.repeat(32),
    senderNametag: 'api-4',
    tokens: [],
    unverifiedTokens: [token({ id: id.padEnd(64, '0'), amount, unverified: 'refused' })],
    receivedAt: 1,
  });

  it('is announced as a warning in the asset units the module knows, never as money arriving', async () => {
    const client = mountEvents();

    act(() => {
      handlers.get('transfer:incoming')?.(arrival('tr-1', '10000000'));
    });

    await waitFor(() => expect(toasts).toHaveLength(1));
    expect(toasts[0]?.type).toBe('warning');
    expect(toasts[0]?.transfer).toBeUndefined();
    expect(toasts[0]?.message).toBe('@api-4 sent 10 USDC this wallet could not verify. It is not counted and cannot be sent.');
    expect(client.getQueryData(SPHERE_KEYS.incoming.progress) ?? null).toBeNull();
  });

  it('adds up several refused tokens from one sender in one toast', async () => {
    mountEvents();

    act(() => {
      handlers.get('transfer:incoming')?.(arrival('tr-1', '10000000'));
      handlers.get('transfer:incoming')?.(arrival('tr-2', '5000000'));
    });

    await waitFor(() => expect(toasts).toHaveLength(2));
    expect(toasts[1]?.message).toBe('@api-4 sent 15 USDC this wallet could not verify. It is not counted and cannot be sent.');
    expect(toasts[1]?.groupId).toBe(toasts[0]?.groupId);
  });
});
