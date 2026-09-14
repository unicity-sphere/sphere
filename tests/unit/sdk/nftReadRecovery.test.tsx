import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import type { NftView } from '@unicitylabs/sphere-sdk';
import { SPHERE_KEYS } from '../../../src/sdk/queryKeys';

/**
 * NFT readings (#785) are cached with staleTime Infinity under nft.*, which no
 * payment event invalidates, and the wallet view reading them stays mounted for
 * the session. So useSphereEvents reads a FAILED batch again as soon as there is
 * reason to expect it to succeed — and never a successful one, since a reading
 * never changes for a token id.
 */
type Handler = (payload: unknown) => void;
const handlers = new Map<string, Handler>();
const nftsMock = vi.fn<(tokenIds: readonly string[]) => Promise<ReadonlyMap<string, NftView>>>();
const PUB = '02' + 'aa'.repeat(32);
const fakeSphere = {
  on: (event: string, fn: Handler) => { handlers.set(event, fn); },
  off: (event: string) => { handlers.delete(event); },
  identity: { chainPubkey: PUB },
  payments: { nfts: nftsMock },
};

vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: fakeSphere }),
}));

import { useSphereEvents } from '../../../src/sdk/hooks/core/useSphereEvents';
import { useNfts } from '../../../src/sdk/hooks/payments/useNfts';

const ID_1 = '11'.repeat(32);
const ID_2 = '22'.repeat(32);

function nftView(tokenId: string): NftView {
  return {
    tokenId,
    content: { kind: 'media', media_type: 'image/png', bytes: new Uint8Array([1]) },
    creator: null,
    signature: 'unsigned',
  };
}

/** Ids whose blob read currently fails; a batch holding one fails as a whole. */
const failing = new Set<string>();

function readsOf(id: string): number {
  return nftsMock.mock.calls.filter(([ids]) => ids.includes(id)).length;
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  // Two batches side by side: one that reads, one that fails.
  const hook = renderHook(
    () => {
      useSphereEvents();
      return { ok: useNfts([ID_1]), failed: useNfts([ID_2]) };
    },
    { wrapper },
  );
  return { client, ...hook };
}

function fire(event: string, payload: unknown) {
  act(() => {
    handlers.get(event)?.(payload);
  });
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

beforeEach(() => {
  handlers.clear();
  failing.clear();
  nftsMock.mockReset();
  nftsMock.mockImplementation(async (ids) => {
    if (ids.some((id) => failing.has(id))) throw new Error('HTTP 503');
    return new Map(ids.map((id) => [id, nftView(id)]));
  });
});

afterEach(() => {
  cleanup();
});

async function mountWithOneFailedBatch() {
  failing.add(ID_2);
  const mounted = mount();
  await waitFor(() => expect(mounted.result.current.ok.views.size).toBe(1));
  await waitFor(() =>
    expect(mounted.client.getQueryState(SPHERE_KEYS.nft.views(PUB, [ID_2]))?.status).toBe('error'),
  );
  expect(mounted.result.current.failed.views.size).toBe(0);
  failing.clear();
  return mounted;
}

describe('failed NFT reads are read again (#785)', () => {
  it('when the inventory changes — and a successful batch is left alone', async () => {
    const { result } = await mountWithOneFailedBatch();

    fire('inventory:updated', {});

    await waitFor(() => expect(result.current.failed.views.size).toBe(1));
    expect(readsOf(ID_2)).toBe(2);
    expect(readsOf(ID_1)).toBe(1);
  });

  it('when the wallet-api connection is back', async () => {
    const { result } = await mountWithOneFailedBatch();

    fire('connection:status', { status: 'connected' });

    await waitFor(() => expect(result.current.failed.views.size).toBe(1));
    expect(readsOf(ID_1)).toBe(1);
  });

  it('not while the connection is still degraded or offline', async () => {
    const { result } = await mountWithOneFailedBatch();

    fire('connection:status', { status: 'degraded' });
    fire('connection:status', { status: 'offline' });
    await settle();

    expect(readsOf(ID_2)).toBe(1);
    expect(result.current.failed.views.size).toBe(0);
  });
});
