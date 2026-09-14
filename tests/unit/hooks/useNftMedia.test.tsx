import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHash } from 'node:crypto';
import type { ReactNode } from 'react';
import type { NftLink, NftMedia, NftMediaRef } from '@unicitylabs/sphere-sdk';
import { useNftMedia } from '../../../src/sdk/hooks/payments/useNftMedia';
import { MAX_LINKED_MEDIA_BYTES } from '../../../src/components/wallet/shared/nft/media';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
const CID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

// jsdom's Blob has no arrayBuffer(); FileReader is the jsdom way to read one back.
function blobBytes(blob: Blob): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve([...new Uint8Array(reader.result as ArrayBuffer)]);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

function inline(media_type: string, bytes: Uint8Array = PNG): NftMedia {
  return { kind: 'media', media_type, bytes };
}

function link(overrides: Partial<NftLink> = {}): NftLink {
  return { kind: 'link', media_type: 'image/png', uri: `ipfs://${CID}/cat.png`, sha256: sha256Hex(PNG), ...overrides };
}

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

let urlSeq = 0;
const createObjectURL = vi.fn<(obj: Blob | MediaSource) => string>(() => `blob:nft-${String(++urlSeq)}`);
const revokeObjectURL = vi.fn<(url: string) => void>();
const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;

beforeEach(() => {
  urlSeq = 0;
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  fetchMock.mockReset();
  // jsdom implements neither; the hook's lifecycle is exactly what is under test.
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
  vi.unstubAllGlobals();
});

function render(ref: NftMediaRef | null) {
  return renderHook(() => useNftMedia(ref), { wrapper: makeWrapper() });
}

describe('useNftMedia — inline media', () => {
  it('has nothing to show for no reference', () => {
    const { result } = render(null);
    expect(result.current).toEqual({ url: null, mediaType: null, state: 'none' });
  });

  it('renders an allowlisted type from an object URL of exactly its bytes', async () => {
    const { result } = render(inline('image/png'));

    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current.url).toBe('blob:nft-1');
    expect(result.current.mediaType).toBe('image/png');
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(blob.type).toBe('image/png');
    expect(await blobBytes(blob)).toEqual([...PNG]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses SVG without ever making a URL for it', () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const { result } = render(inline('image/svg+xml', svg));

    expect(result.current).toEqual({ url: null, mediaType: 'image/svg+xml', state: 'unsupported' });
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('revokes the object URL on unmount', async () => {
    const { result, unmount } = render(inline('image/png'));
    await waitFor(() => expect(result.current.state).toBe('ready'));

    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:nft-1');
  });

  it('revokes the previous URL when the reference changes, and never hands it out again', async () => {
    // Every render is recorded: the one between the change and its effect runs
    // after the old URL was revoked, and is invisible to result.current.
    const seen: { bytes: Uint8Array; url: string | null }[] = [];
    const { result, rerender } = renderHook(
      ({ r }: { r: NftMedia }) => {
        const media = useNftMedia(r);
        seen.push({ bytes: r.bytes, url: media.url });
        return media;
      },
      { wrapper: makeWrapper(), initialProps: { r: inline('image/png', PNG) } },
    );
    await waitFor(() => expect(result.current.url).toBe('blob:nft-1'));

    // Same type, different bytes: the URL must follow the bytes, not the type.
    rerender({ r: inline('image/png', GIF) });
    await waitFor(() => expect(result.current.url).toBe('blob:nft-2'));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:nft-1');
    expect(seen.filter((s) => s.bytes === GIF).map((s) => s.url)).not.toContain('blob:nft-1');
  });
});

describe('useNftMedia — linked media', () => {
  it('fetches through the gateway without credentials or referrer, and renders bytes that match the hash', async () => {
    fetchMock.mockResolvedValue(new Response(PNG, { status: 200, headers: { 'content-length': String(PNG.length) } }));
    const { result } = render(link());

    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current.url).toBe('blob:nft-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`https://ipfs.io/ipfs/${CID}/cat.png`);
    expect(init).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'force-cache' });
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(await blobBytes(blob)).toEqual([...PNG]);
  });

  it('shows nothing when the served bytes do not match the fingerprint', async () => {
    fetchMock.mockResolvedValue(new Response(GIF, { status: 200 }));
    const { result } = render(link());

    await waitFor(() => expect(result.current.state).toBe('mismatch'));
    expect(result.current.url).toBeNull();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('reports a network or CORS failure as an error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = render(link());

    await waitFor(() => expect(result.current.state).toBe('error'));
    expect(result.current.url).toBeNull();
  });

  it('reports an HTTP failure as an error', async () => {
    fetchMock.mockResolvedValue(new Response('gone', { status: 404 }));
    const { result } = render(link());

    await waitFor(() => expect(result.current.state).toBe('error'));
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('refuses a file whose declared size is over the cap, even though its bytes match the hash', async () => {
    fetchMock.mockResolvedValue(
      new Response(PNG, { status: 200, headers: { 'content-length': String(MAX_LINKED_MEDIA_BYTES + 1) } }),
    );
    const { result } = render(link());

    await waitFor(() => expect(result.current.state).toBe('error'));
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('refuses a file that streams past the cap with no declared size, even though its bytes match the hash', async () => {
    const big = new Uint8Array(MAX_LINKED_MEDIA_BYTES + 1);
    const half = Math.floor(big.length / 2);
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(big.subarray(0, half));
        controller.enqueue(big.subarray(half));
        controller.close();
      },
    });
    fetchMock.mockResolvedValue(new Response(body, { status: 200 }));
    const { result } = render(link({ sha256: sha256Hex(big) }));

    await waitFor(() => expect(result.current.state).toBe('error'));
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('never fetches a link whose type is not allowlisted', () => {
    const { result } = render(link({ media_type: 'image/svg+xml' }));

    expect(result.current.state).toBe('unsupported');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never fetches a link it cannot resolve to https', () => {
    const { result } = render(link({ uri: 'http://example.com/cat.png' }));

    expect(result.current.state).toBe('unsupported');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('useNftMedia — a link whose host answered is fetched once', () => {
  // The app's own retry policy (src/lib/queryClient.ts), with no delay so a
  // retry is counted rather than waited for.
  function appClient() {
    return new QueryClient({ defaultOptions: { queries: { retry: 1, retryDelay: 0 } } });
  }

  function mountWith(client: QueryClient, ref: NftMediaRef) {
    return renderHook(() => useNftMedia(ref), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
  }

  // Long enough for a mount to have started a fetch, had one been due.
  async function settle() {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  }

  const pastTheCap = () =>
    new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array(MAX_LINKED_MEDIA_BYTES));
          controller.enqueue(new Uint8Array(1));
          controller.close();
        },
      }),
      { status: 200 },
    );

  const brokenOff = () =>
    new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(PNG);
          controller.error(new TypeError('network error'));
        },
      }),
      { status: 200 },
    );

  it.each([
    [
      'declares a size over the cap',
      () => new Response(PNG, { status: 200, headers: { 'content-length': String(MAX_LINKED_MEDIA_BYTES + 1) } }),
      'error',
    ],
    ['streams past the cap', pastTheCap, 'error'],
    ['answers with an HTTP error', () => new Response('unavailable', { status: 503 }), 'error'],
    ['breaks off mid-body', brokenOff, 'error'],
    ['serves bytes that do not match the fingerprint', () => new Response(GIF, { status: 200 }), 'mismatch'],
  ] as const)(
    'fetches a link whose host %s once — not again on retry, remount or a second view',
    async (_how, respond, state) => {
      fetchMock.mockImplementation(async () => respond());
      const client = appClient();

      const first = mountWith(client, link());
      await waitFor(() => expect(first.result.current.state).toBe(state));
      first.unmount();

      // The Tokens tab opened again, and the same NFT's detail view beside it.
      const row = mountWith(client, link());
      const detail = mountWith(client, link());
      await settle();

      expect(row.result.current.state).toBe(state);
      expect(detail.result.current.state).toBe(state);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(createObjectURL).not.toHaveBeenCalled();
    },
  );

  it('asks again on a later view when the host never answered — nothing was downloaded', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const client = appClient();

    const first = mountWith(client, link());
    await waitFor(() => expect(first.result.current.state).toBe('error'));
    const asked = fetchMock.mock.calls.length;
    first.unmount();

    fetchMock.mockResolvedValue(new Response(PNG, { status: 200 }));
    const again = mountWith(client, link());

    await waitFor(() => expect(again.result.current.state).toBe('ready'));
    expect(fetchMock.mock.calls.length).toBe(asked + 1);
  });
});
