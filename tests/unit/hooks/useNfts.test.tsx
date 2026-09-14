import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { NftView } from '@unicitylabs/sphere-sdk';
import { NFT_READ_RETRY_MS, useNfts } from '../../../src/sdk/hooks/payments/useNfts';
import { SPHERE_KEYS } from '../../../src/sdk/queryKeys';

const PUB_A = '02' + 'aa'.repeat(32);
const PUB_B = '03' + 'bb'.repeat(32);
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

const nftsMock = vi.fn<(ids: readonly string[]) => Promise<ReadonlyMap<string, NftView>>>();
let paymentsRunning = true;
let fakeSphere: { identity: { chainPubkey: string }; readonly payments: { nfts: typeof nftsMock } } | null = null;

function makeSphere(chainPubkey: string) {
  return {
    identity: { chainPubkey },
    // The real getter THROWS while no payments vertical runs.
    get payments() {
      if (!paymentsRunning) throw new Error('NOT_INITIALIZED');
      return { nfts: nftsMock };
    },
  };
}

vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: fakeSphere }),
}));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => {
  nftsMock.mockReset();
  nftsMock.mockImplementation(async (ids) => new Map(ids.map((id) => [id, nftView(id)])));
  paymentsRunning = true;
  fakeSphere = makeSphere(PUB_A);
});

describe('useNfts', () => {
  it('reads one sorted, de-duplicated batch and returns its map', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useNfts([ID_2, ID_1, ID_2]), { wrapper });

    await waitFor(() => expect(result.current.views.size).toBe(2));
    expect(nftsMock).toHaveBeenCalledTimes(1);
    expect(nftsMock).toHaveBeenCalledWith([ID_1, ID_2]);
    expect(result.current.views.get(ID_2)?.tokenId).toBe(ID_2);
    expect(result.current.isLoading).toBe(false);
  });

  it('answers an empty map while the read is in flight', () => {
    nftsMock.mockImplementation(() => new Promise(() => {}));
    const { wrapper } = setup();
    const { result } = renderHook(() => useNfts([ID_1]), { wrapper });

    expect(result.current.views.size).toBe(0);
    expect(result.current.isLoading).toBe(true);
  });

  it('asks nothing for an empty list, or without a wallet', () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useNfts([]), { wrapper });
    expect(result.current.views.size).toBe(0);

    fakeSphere = null;
    renderHook(() => useNfts([ID_1]), { wrapper });
    expect(nftsMock).not.toHaveBeenCalled();
  });

  it('is cached outside payments.*, so payment events never re-read the blobs', async () => {
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useNfts([ID_1]), { wrapper });
    await waitFor(() => expect(result.current.views.size).toBe(1));

    await client.invalidateQueries({ queryKey: SPHERE_KEYS.payments.all });
    await client.refetchQueries({ queryKey: SPHERE_KEYS.payments.all });

    expect(nftsMock).toHaveBeenCalledTimes(1);
    expect(client.getQueryCache().findAll({ queryKey: SPHERE_KEYS.payments.all })).toHaveLength(0);
    expect(client.getQueryCache().findAll({ queryKey: SPHERE_KEYS.nft.all })).toHaveLength(1);
  });

  it('keys by the active chain pubkey — the same ids on another address are read again', async () => {
    const { wrapper } = setup();
    const { result, rerender } = renderHook(() => useNfts([ID_1]), { wrapper });
    await waitFor(() => expect(result.current.views.size).toBe(1));

    fakeSphere = makeSphere(PUB_B);
    rerender();

    await waitFor(() => expect(nftsMock).toHaveBeenCalledTimes(2));
  });

  it('keeps the last readings on screen while a changed set of ids loads', async () => {
    // A send or receive changes the id set; without this every row dropped back to its
    // registry name and reloaded its thumbnail until the new batch arrived.
    const { wrapper } = setup();
    const { result, rerender } = renderHook(({ ids }) => useNfts(ids), {
      wrapper,
      initialProps: { ids: [ID_1] },
    });
    await waitFor(() => expect(result.current.views.size).toBe(1));

    nftsMock.mockImplementation(() => new Promise(() => {}));
    rerender({ ids: [ID_1, ID_2] });

    expect(nftsMock).toHaveBeenCalledTimes(2);
    expect(result.current.views.get(ID_1)?.tokenId).toBe(ID_1);
    expect(result.current.views.has(ID_2)).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("never shows one address's readings under another while the other loads", async () => {
    const { wrapper } = setup();
    const { result, rerender } = renderHook(() => useNfts([ID_1]), { wrapper });
    await waitFor(() => expect(result.current.views.size).toBe(1));

    nftsMock.mockImplementation(() => new Promise(() => {}));
    fakeSphere = makeSphere(PUB_B);
    rerender();

    await waitFor(() => expect(nftsMock).toHaveBeenCalledTimes(2));
    expect(result.current.views.size).toBe(0);
    expect(result.current.isLoading).toBe(true);
  });

  it('does not cache "no NFTs" while payments is not running — the next mount reads them', async () => {
    paymentsRunning = false;
    const { client, wrapper } = setup();
    const first = renderHook(() => useNfts([ID_1]), { wrapper });

    await waitFor(() =>
      expect(client.getQueryState(SPHERE_KEYS.nft.views(PUB_A, [ID_1]))?.status).toBe('error'),
    );
    expect(first.result.current.views.size).toBe(0);
    first.unmount();

    paymentsRunning = true;
    const second = renderHook(() => useNfts([ID_1]), { wrapper });
    await waitFor(() => expect(second.result.current.views.size).toBe(1));
  });

  it('keeps the readings already on screen when a changed set of ids fails to read', async () => {
    const { client, wrapper } = setup();
    const { result, rerender } = renderHook(({ ids }) => useNfts(ids), {
      wrapper,
      initialProps: { ids: [ID_1] },
    });
    await waitFor(() => expect(result.current.views.size).toBe(1));

    // One failed blob read (a wallet-api 503, a timeout) fails the whole batch.
    nftsMock.mockRejectedValue(new Error('HTTP 503'));
    rerender({ ids: [ID_1, ID_2] });

    await waitFor(() =>
      expect(client.getQueryState(SPHERE_KEYS.nft.views(PUB_A, [ID_1, ID_2]))?.status).toBe('error'),
    );
    expect(result.current.views.get(ID_1)?.tokenId).toBe(ID_1);
    expect(result.current.views.has(ID_2)).toBe(false);
  });

  it("never falls back to another address's readings when a read fails", async () => {
    const { client, wrapper } = setup();
    const { result, rerender } = renderHook(() => useNfts([ID_1]), { wrapper });
    await waitFor(() => expect(result.current.views.size).toBe(1));

    nftsMock.mockRejectedValue(new Error('HTTP 503'));
    fakeSphere = makeSphere(PUB_B);
    rerender();

    await waitFor(() => expect(client.getQueryState(SPHERE_KEYS.nft.views(PUB_B, [ID_1]))?.status).toBe('error'));
    expect(result.current.views.size).toBe(0);
  });

  describe('a failed read on a view that stays mounted', () => {
    // RTL's waitFor polls on timers, so these step the fake clock by hand.
    async function tick(ms: number) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
      });
    }

    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('is read again, until it succeeds', async () => {
      nftsMock.mockRejectedValueOnce(new Error('HTTP 503'));
      const { client, wrapper } = setup();
      const { result } = renderHook(() => useNfts([ID_1]), { wrapper });
      await tick(10);
      expect(client.getQueryState(SPHERE_KEYS.nft.views(PUB_A, [ID_1]))?.status).toBe('error');
      expect(result.current.views.size).toBe(0);

      await tick(NFT_READ_RETRY_MS);
      await tick(10);

      expect(nftsMock).toHaveBeenCalledTimes(2);
      expect(result.current.views.size).toBe(1);
    });

    it('is the only kind read again — a successful batch is never re-read', async () => {
      const { wrapper } = setup();
      const { result } = renderHook(() => useNfts([ID_1]), { wrapper });
      await tick(10);
      expect(result.current.views.size).toBe(1);

      await tick(NFT_READ_RETRY_MS * 3);

      expect(nftsMock).toHaveBeenCalledTimes(1);
    });
  });
});
