import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHash } from 'node:crypto';
import type { ReactNode } from 'react';
import type { NftLink, NftMedia } from '@unicitylabs/sphere-sdk';
import { acquireObjectUrl, releaseObjectUrl } from '../../../src/sdk/hooks/payments/sharedObjectUrl';
import { useNftMedia } from '../../../src/sdk/hooks/payments/useNftMedia';

/**
 * One object URL per (bytes, media type), however many views show them (#785): a
 * collection's shared image in every row must not become one Blob copy per row.
 */

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const CID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
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
  // jsdom implements neither.
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
  vi.unstubAllGlobals();
});

describe('acquireObjectUrl / releaseObjectUrl', () => {
  it('makes one URL for the same bytes and type, and revokes it only when the last holder releases it', () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const first = acquireObjectUrl(bytes, 'image/png');
    const second = acquireObjectUrl(bytes, 'image/png');

    expect(first).toBe('blob:nft-1');
    expect(second).toBe(first);
    expect(createObjectURL).toHaveBeenCalledTimes(1);

    releaseObjectUrl(bytes, 'image/png');
    expect(revokeObjectURL).not.toHaveBeenCalled();
    releaseObjectUrl(bytes, 'image/png');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:nft-1');

    // Once released for good, the next holder gets a new URL, never the revoked one.
    expect(acquireObjectUrl(bytes, 'image/png')).toBe('blob:nft-2');
    releaseObjectUrl(bytes, 'image/png');
  });

  it('makes a URL per type, and per array — equal bytes in another array are not shared', () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const copy = new Uint8Array(bytes);
    const png = acquireObjectUrl(bytes, 'image/png');
    const gif = acquireObjectUrl(bytes, 'image/gif');
    const other = acquireObjectUrl(copy, 'image/png');

    expect(new Set([png, gif, other]).size).toBe(3);
    expect((createObjectURL.mock.calls[1]?.[0] as Blob).type).toBe('image/gif');

    releaseObjectUrl(bytes, 'image/png');
    releaseObjectUrl(bytes, 'image/gif');
    releaseObjectUrl(copy, 'image/png');
    expect(revokeObjectURL.mock.calls.map(([url]) => url).sort()).toEqual([png, gif, other].sort());
  });

  it('ignores a release of something never acquired', () => {
    expect(() => releaseObjectUrl(new Uint8Array([9]), 'image/png')).not.toThrow();
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });
});

describe('useNftMedia — many views of the same media', () => {
  function wrapperFor(client: QueryClient) {
    return function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
  }

  it('shares one object URL among every view of a linked file, and revokes it when the last one unmounts', async () => {
    fetchMock.mockImplementation(async () => new Response(new Uint8Array(PNG), { status: 200 }));
    const wrapper = wrapperFor(new QueryClient({ defaultOptions: { queries: { retry: false } } }));
    const link: NftLink = { kind: 'link', media_type: 'image/png', uri: `ipfs://${CID}/cat.png`, sha256: sha256Hex(PNG) };

    const views = Array.from({ length: 5 }, () => renderHook(() => useNftMedia(link), { wrapper }));
    for (const view of views) await waitFor(() => expect(view.result.current.state).toBe('ready'));

    expect(new Set(views.map((view) => view.result.current.url))).toEqual(new Set(['blob:nft-1']));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    for (const view of views.slice(1)) view.unmount();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    views[0]?.unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:nft-1');
  });

  it('shares one object URL among views of the same inline bytes', async () => {
    const media: NftMedia = { kind: 'media', media_type: 'image/png', bytes: PNG };
    const wrapper = wrapperFor(new QueryClient());

    const views = Array.from({ length: 3 }, () => renderHook(() => useNftMedia(media), { wrapper }));
    for (const view of views) await waitFor(() => expect(view.result.current.url).toBe('blob:nft-1'));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    for (const view of views) view.unmount();
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });
});
