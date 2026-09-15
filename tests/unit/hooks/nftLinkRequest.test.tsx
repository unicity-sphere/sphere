import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHash } from 'node:crypto';
import type { ReactNode } from 'react';
import { NFT_DOCUMENT_MEDIA_TYPE, encodeNftContent } from '@unicitylabs/sphere-sdk';
import type { NftLink, NftMetadata } from '@unicitylabs/sphere-sdk';
import { useNftMedia } from '../../../src/sdk/hooks/payments/useNftMedia';
import { useNftDocument, useResolvedNftContent } from '../../../src/sdk/hooks/payments/useNftDocument';
import { NftLinkFetchContext, type NftLinkFetchPolicy } from '../../../src/components/wallet/shared/nft/linkFetch';
import { linkHostIsMinterChosen } from '../../../src/components/wallet/shared/nft/media';

/**
 * A link to a host its minter chose (#785) is fetched only once the user asks: the
 * request shows that host the viewer's IP address. A link through this wallet's own
 * gateways, and any link under an `automatic` policy, is fetched as soon as it is shown.
 */

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const CID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
const AR_ID = 'bNbA3TEQVL60xlgCcqdz4ZPHFZ711cZ3hmkpGttDt_U';

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

const METADATA: NftMetadata = {
  kind: 'metadata',
  name: 'Doc Cat #1',
  description: null,
  image: null,
  animation_url: null,
  external_url: null,
  attributes: [],
  collection: null,
  collection_id: null,
};
const DOCUMENT = encodeNftContent(METADATA);

function imageLink(uri = 'https://cats.example/cat.png'): NftLink {
  return { kind: 'link', media_type: 'image/png', uri, sha256: sha256Hex(PNG) };
}

function documentLink(uri = 'https://cats.example/cat.cbor'): NftLink {
  return { kind: 'link', media_type: NFT_DOCUMENT_MEDIA_TYPE, uri, sha256: sha256Hex(DOCUMENT) };
}

function served(bytes: Uint8Array): Response {
  return new Response(new Uint8Array(bytes), { status: 200 });
}

let urlSeq = 0;
const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;

beforeEach(() => {
  urlSeq = 0;
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  // jsdom implements neither.
  URL.createObjectURL = vi.fn(() => `blob:nft-${String(++urlSeq)}`);
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
  vi.unstubAllGlobals();
});

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrapperFor(client: QueryClient, policy?: NftLinkFetchPolicy) {
  return function Wrapper({ children }: { children: ReactNode }) {
    const tree = <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    return policy ? <NftLinkFetchContext.Provider value={policy}>{tree}</NftLinkFetchContext.Provider> : tree;
  };
}

// Long enough for a mount to have started a fetch, had one been due.
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

describe('linkHostIsMinterChosen', () => {
  it('holds for an https link, and not for a link through the IPFS or Arweave gateway', () => {
    expect(linkHostIsMinterChosen('https://cats.example/cat.png')).toBe(true);
    expect(linkHostIsMinterChosen(`ipfs://${CID}/cat.png`)).toBe(false);
    expect(linkHostIsMinterChosen(`ar://${AR_ID}`)).toBe(false);
  });
});

describe('useNftMedia — a link to a host its minter chose', () => {
  it('fetches nothing until the user asks, and names the host asking would reach', async () => {
    const { result } = renderHook(() => useNftMedia(imageLink()), { wrapper: wrapperFor(newClient()) });
    await settle();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.state).toBe('ask');
    expect(result.current.url).toBeNull();
    expect(result.current.request?.host).toBe('cats.example');
  });

  it('fetches it once asked, under the linked-file policy, and every view of the link shows it', async () => {
    fetchMock.mockImplementation(async () => served(PNG));
    const client = newClient();
    const detail = renderHook(() => useNftMedia(imageLink()), { wrapper: wrapperFor(client) });
    const row = renderHook(() => useNftMedia(imageLink()), { wrapper: wrapperFor(client) });
    await settle();

    act(() => detail.result.current.request?.load());

    await waitFor(() => expect(detail.result.current.state).toBe('ready'));
    await waitFor(() => expect(row.result.current.state).toBe('ready'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://cats.example/cat.png');
    expect(init).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer' });
    expect(detail.result.current.request).toBeUndefined();
    expect(row.result.current.request).toBeUndefined();
  });

  it('offers to try again when the file could not be loaded, and fetches again only when asked', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useNftMedia(imageLink()), { wrapper: wrapperFor(newClient()) });
    await settle();
    act(() => result.current.request?.load());

    await waitFor(() => expect(result.current.state).toBe('error'));
    expect(result.current.request?.host).toBe('cats.example');
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockImplementation(async () => served(PNG));
    act(() => result.current.request?.load());
    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('fetches it without asking under an automatic policy', async () => {
    fetchMock.mockImplementation(async () => served(PNG));
    const { result } = renderHook(() => useNftMedia(imageLink()), { wrapper: wrapperFor(newClient(), 'automatic') });

    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current.request).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([`ipfs://${CID}/cat.png`, `ar://${AR_ID}`])('fetches a gateway link, %s, without asking', async (uri) => {
    fetchMock.mockImplementation(async () => served(PNG));
    const { result } = renderHook(() => useNftMedia(imageLink(uri)), { wrapper: wrapperFor(newClient()) });

    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current.request).toBeUndefined();
  });

  it('asks nothing about inline media, nor about a link it cannot fetch', async () => {
    const inline = renderHook(() => useNftMedia({ kind: 'media', media_type: 'image/png', bytes: PNG }), {
      wrapper: wrapperFor(newClient()),
    });
    const http = renderHook(() => useNftMedia(imageLink('http://cats.example/cat.png')), {
      wrapper: wrapperFor(newClient()),
    });
    await settle();

    expect(inline.result.current.state).toBe('ready');
    expect(inline.result.current.request).toBeUndefined();
    expect(http.result.current).toEqual({ url: null, mediaType: 'image/png', state: 'unsupported' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('useNftDocument — a document on a host its minter chose', () => {
  it('fetches nothing until the user asks, then resolves the document', async () => {
    fetchMock.mockImplementation(async () => served(DOCUMENT));
    const { result } = renderHook(() => useNftDocument(documentLink()), { wrapper: wrapperFor(newClient()) });
    await settle();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.state).toBe('ask');
    expect(result.current.request?.host).toBe('cats.example');

    act(() => result.current.request?.load());
    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current.document).toEqual(METADATA);
    expect(result.current.request).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('offers to try again when the document could not be fetched', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useNftDocument(documentLink()), { wrapper: wrapperFor(newClient()) });
    await settle();
    act(() => result.current.request?.load());

    await waitFor(() => expect(result.current.state).toBe('error'));
    expect(result.current.request?.host).toBe('cats.example');
  });

  it('fetches without asking when its caller passes an automatic policy, whatever the context says', async () => {
    fetchMock.mockImplementation(async () => served(DOCUMENT));
    const { result } = renderHook(() => useNftDocument(documentLink(), 'automatic'), {
      wrapper: wrapperFor(newClient(), 'on-request'),
    });

    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fetches a gateway document link without asking', async () => {
    fetchMock.mockImplementation(async () => served(DOCUMENT));
    const { result } = renderHook(() => useNftDocument(documentLink(`ipfs://${CID}/cat.cbor`)), {
      wrapper: wrapperFor(newClient()),
    });

    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current.request).toBeUndefined();
  });

  it('keeps the link as the content to show, and passes on how to ask, until the user does', async () => {
    const link = documentLink();
    const { result } = renderHook(() => useResolvedNftContent(link), { wrapper: wrapperFor(newClient()) });
    await settle();

    expect(result.current.content).toBe(link);
    expect(result.current.hostedAt).toBeNull();
    expect(result.current.documentState).toBe('ask');
    expect(result.current.documentRequest?.host).toBe('cats.example');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
