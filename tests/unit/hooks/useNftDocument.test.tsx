import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHash } from 'node:crypto';
import type { ReactNode } from 'react';
import { NFT_DOCUMENT_MEDIA_TYPE, encodeNftContent } from '@unicitylabs/sphere-sdk';
import type { NftContent, NftLink, NftMedia, NftMetadata } from '@unicitylabs/sphere-sdk';
import { useNftDocument, useResolvedNftContent } from '../../../src/sdk/hooks/payments/useNftDocument';
import { useNftMedia } from '../../../src/sdk/hooks/payments/useNftMedia';
import { MAX_LINKED_MEDIA_BYTES, MAX_NFT_DOCUMENT_BYTES } from '../../../src/components/wallet/shared/nft/media';

/**
 * A metadata document link (#785) resolves under linked media's fetch policy —
 * no credentials, no referrer, a size cap, the SHA-256 checked before a byte is
 * parsed — and every answer its host gives is kept as data, not retried.
 */

const CID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

const METADATA: NftMetadata = {
  kind: 'metadata',
  name: 'Doc Cat #1',
  description: 'Hosted, not inline.',
  image: { kind: 'media', media_type: 'image/png', bytes: PNG },
  animation_url: null,
  external_url: null,
  attributes: [{ trait_type: 'Eyes', value: 'Laser' }],
  collection: 'Doc Cats',
  collection_id: 'c0ffee',
};
const DOCUMENT = encodeNftContent(METADATA);
/** Bytes that match their own fingerprint but are not a document. */
const NOT_A_DOCUMENT = new Uint8Array([0x63, 0x67, 0x6d, 0x21]);

function documentLink(bytes: Uint8Array = DOCUMENT, overrides: Partial<NftLink> = {}): NftLink {
  return {
    kind: 'link',
    media_type: NFT_DOCUMENT_MEDIA_TYPE,
    uri: `ipfs://${CID}/cat.cbor`,
    sha256: sha256Hex(bytes),
    ...overrides,
  };
}

function served(bytes: Uint8Array, headers: Record<string, string> = {}): Response {
  return new Response(new Uint8Array(bytes), { status: 200, headers });
}

function streamed(...chunks: Uint8Array[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  return new Response(body, { status: 200 });
}

function makeWrapper(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// Long enough for a mount to have started a fetch, had one been due.
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

function render(link: NftLink | null) {
  return renderHook(() => useNftDocument(link), { wrapper: makeWrapper() });
}

describe('useNftDocument — resolving', () => {
  it('fetches through the gateway without credentials or referrer, and parses bytes that match the hash', async () => {
    fetchMock.mockImplementation(async () => served(DOCUMENT));
    const { result } = render(documentLink());

    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current.document).toEqual(METADATA);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`https://ipfs.io/ipfs/${CID}/cat.cbor`);
    // Revalidated with the host: another NFT may pin the same URL to other bytes.
    expect(init).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-cache' });
  });

  it('resolves a document that holds a media item', async () => {
    const media: NftMedia = { kind: 'media', media_type: 'image/png', bytes: PNG };
    const bytes = encodeNftContent(media);
    fetchMock.mockImplementation(async () => served(bytes));
    const { result } = render(documentLink(bytes));

    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current.document).toEqual(media);
  });

  it('parses nothing that does not match the fingerprint', async () => {
    fetchMock.mockImplementation(async () => served(PNG));
    const { result } = render(documentLink());

    await waitFor(() => expect(result.current.state).toBe('mismatch'));
    expect(result.current.document).toBeNull();
  });

  it.each([
    ['bytes that are no NFT item', NOT_A_DOCUMENT],
    ['a link — links do not chain', encodeNftContent(documentLink())],
    ['a media link', encodeNftContent({ kind: 'link', media_type: 'image/png', uri: 'https://example.com/cat.png', sha256: sha256Hex(PNG) })],
  ] as const)('reports a file that matches its fingerprint but holds %s as an invalid document', async (_what, bytes) => {
    fetchMock.mockImplementation(async () => served(bytes));
    const { result } = render(documentLink(bytes));

    await waitFor(() => expect(result.current.state).toBe('invalid'));
    expect(result.current.document).toBeNull();
  });

  it('is loading until the host answers', async () => {
    fetchMock.mockReturnValue(new Promise<Response>(() => {}));
    const { result } = render(documentLink());
    await settle();

    expect(result.current).toEqual({ document: null, state: 'loading' });
  });

  it('reports a network or CORS failure as an error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = render(documentLink());

    await waitFor(() => expect(result.current.state).toBe('error'));
    expect(result.current.document).toBeNull();
  });

  it('reports an HTTP failure as an error', async () => {
    fetchMock.mockImplementation(async () => new Response('gone', { status: 404 }));
    const { result } = render(documentLink());

    await waitFor(() => expect(result.current.state).toBe('error'));
  });

  it('holds a document to 1 MiB — refusing a file linked media could fetch, even though it matches its hash', async () => {
    expect(MAX_NFT_DOCUMENT_BYTES).toBe(1024 * 1024);
    const big = new Uint8Array(MAX_NFT_DOCUMENT_BYTES + 1);
    expect(big.length).toBeLessThan(MAX_LINKED_MEDIA_BYTES);
    const half = Math.floor(big.length / 2);
    fetchMock.mockImplementation(async () => streamed(big.subarray(0, half), big.subarray(half)));
    const { result } = render(documentLink(big));

    await waitFor(() => expect(result.current.state).toBe('error'));
    expect(result.current.document).toBeNull();
  });

  it('refuses a document whose declared size is over the cap, even though its bytes match the hash', async () => {
    fetchMock.mockImplementation(async () =>
      served(DOCUMENT, { 'content-length': String(MAX_NFT_DOCUMENT_BYTES + 1) }),
    );
    const { result } = render(documentLink());

    await waitFor(() => expect(result.current.state).toBe('error'));
  });

  it('never fetches a document link it cannot resolve to https', async () => {
    const { result } = render(documentLink(DOCUMENT, { uri: 'http://example.com/cat.cbor' }));
    await settle();

    expect(result.current).toEqual({ document: null, state: 'unsupported' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never fetches a link that is not a document link, nor without one', async () => {
    const media = render({ kind: 'link', media_type: 'image/png', uri: 'https://example.com/cat.png', sha256: sha256Hex(PNG) });
    const none = render(null);
    await settle();

    expect(media.result.current).toEqual({ document: null, state: 'none' });
    expect(none.result.current).toEqual({ document: null, state: 'none' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('useNftDocument — a document whose host answered is fetched once', () => {
  // The app's own retry policy (src/lib/queryClient.ts), with no delay so a
  // retry is counted rather than waited for.
  function appClient() {
    return new QueryClient({ defaultOptions: { queries: { retry: 1, retryDelay: 0 } } });
  }

  function mountWith(client: QueryClient, link: NftLink) {
    return renderHook(() => useNftDocument(link), { wrapper: makeWrapper(client) });
  }

  const pastTheCap = () => streamed(new Uint8Array(MAX_NFT_DOCUMENT_BYTES), new Uint8Array(1));

  it.each([
    ['serves the document', () => served(DOCUMENT), documentLink(), 'ready'],
    ['serves bytes that do not match the fingerprint', () => served(PNG), documentLink(), 'mismatch'],
    ['serves a file that is not a document', () => served(NOT_A_DOCUMENT), documentLink(NOT_A_DOCUMENT), 'invalid'],
    ['answers with an HTTP error', () => new Response('unavailable', { status: 503 }), documentLink(), 'error'],
    ['streams past the cap', pastTheCap, documentLink(), 'error'],
  ] as const)(
    'fetches a document whose host %s once — not again on retry, remount or a second view',
    async (_how, respond, link, state) => {
      fetchMock.mockImplementation(async () => respond());
      const client = appClient();

      const first = mountWith(client, link);
      await waitFor(() => expect(first.result.current.state).toBe(state));
      first.unmount();

      // The Tokens tab opened again, and the same NFT's detail view beside it.
      const row = mountWith(client, link);
      const detail = mountWith(client, link);
      await settle();

      expect(row.result.current.state).toBe(state);
      expect(detail.result.current.state).toBe(state);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it('asks again on a later view when the host never answered — nothing was downloaded', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const client = appClient();

    const first = mountWith(client, documentLink());
    await waitFor(() => expect(first.result.current.state).toBe('error'));
    const asked = fetchMock.mock.calls.length;
    first.unmount();

    fetchMock.mockImplementation(async () => served(DOCUMENT));
    const again = mountWith(client, documentLink());

    await waitFor(() => expect(again.result.current.state).toBe('ready'));
    expect(fetchMock.mock.calls.length).toBe(asked + 1);
  });
});

describe('useResolvedNftContent', () => {
  function resolve(content: NftContent | null | undefined) {
    return renderHook(() => useResolvedNftContent(content), { wrapper: makeWrapper() });
  }

  it("gives content that is not a document link as it is, and fetches nothing", async () => {
    const { result } = resolve(METADATA);
    const none = resolve(undefined);
    await settle();

    expect(result.current.content).toBe(METADATA);
    expect(result.current.hostedAt).toBeNull();
    expect(result.current.documentState).toBe('none');
    expect(none.result.current).toEqual({ content: null, hostedAt: null, documentState: 'none' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("gives the document's item, and where it is hosted, once the link resolves", async () => {
    fetchMock.mockImplementation(async () => served(DOCUMENT));
    const link = documentLink();
    const { result } = resolve(link);

    await waitFor(() => expect(result.current.documentState).toBe('ready'));
    expect(result.current.content).toEqual(METADATA);
    expect(result.current.hostedAt).toBe(link);
  });

  it('keeps the link itself while the document loads', async () => {
    fetchMock.mockReturnValue(new Promise<Response>(() => {}));
    const link = documentLink();
    const { result } = resolve(link);
    await settle();

    expect(result.current).toEqual({ content: link, hostedAt: null, documentState: 'loading' });
  });

  it.each([
    ['does not match its fingerprint', () => served(PNG), documentLink(), 'mismatch'],
    ['is not a document', () => served(NOT_A_DOCUMENT), documentLink(NOT_A_DOCUMENT), 'invalid'],
    ['cannot be fetched', () => Promise.reject(new TypeError('Failed to fetch')), documentLink(), 'error'],
  ] as const)('keeps the link itself, and names no host, when the document %s', async (_how, respond, link, state) => {
    fetchMock.mockImplementation(async () => respond());
    const { result } = resolve(link);

    await waitFor(() => expect(result.current.documentState).toBe(state));
    expect(result.current.content).toBe(link);
    expect(result.current.hostedAt).toBeNull();
  });
});

describe('useNftDocument — beside linked media', () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  afterEach(() => {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it('shares no cached answer with a media link that names the same uri and fingerprint', async () => {
    // Nothing stops one token's image link from naming exactly the file another
    // token's document link names. Each must read its own answer: a document is
    // held to a smaller cap, and the two cache different things.
    URL.createObjectURL = vi.fn(() => 'blob:nft-1');
    URL.revokeObjectURL = vi.fn();
    fetchMock.mockImplementation(async () => served(DOCUMENT));
    const docLink = documentLink();
    const imageLink: NftLink = { ...docLink, media_type: 'image/png' };

    const { result } = renderHook(() => ({ document: useNftDocument(docLink), media: useNftMedia(imageLink) }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(result.current.document.state).toBe('ready');
      expect(result.current.media.state).toBe('ready');
    });
    expect(result.current.document.document).toEqual(METADATA);
    expect(result.current.media.url).toBe('blob:nft-1');
  });
});
