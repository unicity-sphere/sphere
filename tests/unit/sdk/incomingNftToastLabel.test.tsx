import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, cleanup, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import type { NftContent, NftView } from '@unicitylabs/sphere-sdk';

import type { ShowToastDetail } from '../../../src/components/ui/toast-utils';

/**
 * An incoming NFT toast first shows what the registry knows — the token's CLASS
 * name. The NFT's own metadata names the token itself (#785), so a single NFT's
 * toast is renamed in place once its reading lands. A name is a nicety: nothing
 * here may cost the arrival its toast.
 */
type Handler = (payload: unknown) => void;
const handlers = new Map<string, Handler>();
const nftsMock = vi.fn<(tokenIds: readonly string[]) => Promise<ReadonlyMap<string, NftView>>>();
const fakeSphere = {
  on: (event: string, fn: Handler) => { handlers.set(event, fn); },
  off: (event: string) => { handlers.delete(event); },
  identity: null,
  payments: { nfts: nftsMock },
};

vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: fakeSphere }),
}));

import { useSphereEvents } from '../../../src/sdk/hooks/core/useSphereEvents';

const TOKEN_ID = 'aa'.repeat(32);

const coinless = (over: Record<string, unknown> = {}) => ({
  tokenId: TOKEN_ID,
  tokenType: 'bb'.repeat(32),
  name: 'Cats',
  stateHash: 's',
  transferring: false,
  createdAt: 1,
  updatedAt: 1,
  ...over,
});

const arrival = (over: Record<string, unknown> = {}) => ({
  id: 'tr-1',
  senderPubkey: '02' + 'cc'.repeat(32),
  senderNametag: 'api-4',
  tokens: [],
  receivedAt: 1,
  ...over,
});

const named = (name: string): NftContent => ({
  kind: 'metadata',
  name,
  description: null,
  image: null,
  animation_url: null,
  external_url: null,
  attributes: [],
  collection: null,
});

const reading = (content: NftContent, tokenId = TOKEN_ID): NftView => ({
  tokenId,
  content,
  creator: null,
  signature: 'unsigned',
});

const readings = (...views: NftView[]): ReadonlyMap<string, NftView> =>
  new Map(views.map((v) => [v.tokenId, v] as const));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

function mountEvents() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  renderHook(() => useSphereEvents(), { wrapper });
}

function fire(event: string, payload: unknown) {
  act(() => {
    handlers.get(event)?.(payload);
  });
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

let toasts: ShowToastDetail[] = [];
const record = (e: Event) => { toasts.push((e as CustomEvent<ShowToastDetail>).detail); };

beforeEach(() => {
  handlers.clear();
  nftsMock.mockReset();
  toasts = [];
  window.addEventListener('show-toast', record);
});

afterEach(() => {
  window.removeEventListener('show-toast', record);
  cleanup();
});

describe('incoming NFT toast — named by its own metadata (#785)', () => {
  it('renames a single NFT toast in place once its reading lands', async () => {
    nftsMock.mockResolvedValue(readings(reading(named('Cool Cat #7'))));
    mountEvents();

    fire('transfer:incoming', arrival({ coinless: [coinless()] }));

    await waitFor(() => expect(toasts).toHaveLength(2));
    const [shown, renamed] = toasts;
    expect(shown?.transfer?.label).toBe('Cats');
    expect(renamed?.transfer?.label).toBe('Cool Cat #7');
    expect(renamed?.message).toBe('@api-4 sent you Cool Cat #7');
    expect(renamed?.transfer?.coinless).toBe(true);
    // The same notification, replaced — not a second toast stacked on the first.
    expect(renamed?.groupId).toBe(shown?.groupId);
    // And only for the time the original had left.
    expect(renamed?.duration).toBeGreaterThan(0);
    expect(renamed?.duration).toBeLessThanOrEqual(shown?.duration ?? 0);
    expect(nftsMock).toHaveBeenCalledWith([TOKEN_ID]);
  });

  it('retries when the inventory catches up — an arrival is announced before nfts() can see it', async () => {
    nftsMock.mockResolvedValueOnce(readings()).mockResolvedValue(readings(reading(named('Cool Cat #7'))));
    mountEvents();

    fire('transfer:incoming', arrival({ coinless: [coinless()] }));
    await waitFor(() => expect(nftsMock).toHaveBeenCalledTimes(1));
    await flush();
    expect(toasts).toHaveLength(1);

    fire('inventory:updated', {});
    await waitFor(() => expect(toasts).toHaveLength(2));
    expect(toasts[1]?.transfer?.label).toBe('Cool Cat #7');

    // Named once: later inventory changes read nothing more.
    fire('inventory:updated', {});
    await flush();
    expect(nftsMock).toHaveBeenCalledTimes(2);
    expect(toasts).toHaveLength(2);
  });

  it('keeps the count when a second NFT lands before the first is read', async () => {
    const read = deferred<ReadonlyMap<string, NftView>>();
    nftsMock.mockReturnValue(read.promise);
    mountEvents();

    fire('transfer:incoming', arrival({ id: 'a', coinless: [coinless()] }));
    fire('transfer:incoming', arrival({ id: 'b', coinless: [coinless({ tokenId: 'dd'.repeat(32), name: 'Dogs' })] }));
    await act(async () => {
      read.resolve(readings(reading(named('Cool Cat #7'))));
      await read.promise;
    });
    await flush();

    expect(toasts.map((t) => t.transfer?.label)).toEqual(['Cats', '2 NFTs']);
  });

  it('keeps the class name for an NFT that carries no metadata', async () => {
    nftsMock.mockResolvedValue(
      readings(reading({ kind: 'media', media_type: 'image/png', bytes: new Uint8Array([1]) })),
    );
    mountEvents();

    fire('transfer:incoming', arrival({ coinless: [coinless()] }));
    await waitFor(() => expect(nftsMock).toHaveBeenCalledTimes(1));
    await flush();
    expect(toasts).toHaveLength(1);

    // Settled: a reading was found, so there is nothing left to retry.
    fire('inventory:updated', {});
    await flush();
    expect(nftsMock).toHaveBeenCalledTimes(1);
  });

  it('does not bring back a toast whose time is already up', async () => {
    const read = deferred<ReadonlyMap<string, NftView>>();
    nftsMock.mockReturnValue(read.promise);
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    try {
      mountEvents();
      fire('transfer:incoming', arrival({ coinless: [coinless()] }));

      now.mockReturnValue(1_000_000 + 6_001);
      await act(async () => {
        read.resolve(readings(reading(named('Cool Cat #7'))));
        await read.promise;
      });
      await flush();
    } finally {
      now.mockRestore();
    }

    expect(toasts).toHaveLength(1);
    expect(toasts[0]?.transfer?.label).toBe('Cats');
  });

  it.each([
    ['rejects', () => Promise.reject(new Error('offline'))],
    ['throws synchronously', () => { throw new Error('NOT_INITIALIZED'); }],
  ] as const)('keeps the toast as it was when the read %s', async (_how, failure) => {
    nftsMock.mockImplementation(failure);
    mountEvents();

    expect(() => fire('transfer:incoming', arrival({ coinless: [coinless()] }))).not.toThrow();
    await waitFor(() => expect(nftsMock).toHaveBeenCalledTimes(1));
    await flush();

    expect(toasts).toHaveLength(1);
    expect(toasts[0]?.transfer?.label).toBe('Cats');
    expect(toasts[0]?.message).toBe('@api-4 sent you Cats');
  });

  it('reads nothing for a toast that counts several NFTs', async () => {
    nftsMock.mockResolvedValue(readings());
    mountEvents();

    fire(
      'transfer:incoming',
      arrival({ coinless: [coinless(), coinless({ tokenId: 'dd'.repeat(32), name: 'Dogs' })] }),
    );
    await flush();

    expect(toasts.map((t) => t.transfer?.label)).toEqual(['2 NFTs']);
    expect(nftsMock).not.toHaveBeenCalled();
  });

  it('forgets a pending name when the wallet switches address', async () => {
    nftsMock.mockResolvedValueOnce(readings()).mockResolvedValue(readings(reading(named('Cool Cat #7'))));
    mountEvents();

    fire('transfer:incoming', arrival({ coinless: [coinless()] }));
    await waitFor(() => expect(nftsMock).toHaveBeenCalledTimes(1));
    await flush();

    // The new address's inventory never held the old address's arrival.
    fire('identity:changed', {});
    fire('inventory:updated', {});
    await flush();

    expect(nftsMock).toHaveBeenCalledTimes(1);
    expect(toasts).toHaveLength(1);
  });
});
