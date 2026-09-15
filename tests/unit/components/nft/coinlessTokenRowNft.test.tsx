import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHash } from 'node:crypto';
import type { ReactNode } from 'react';
import { NFT_DOCUMENT_MEDIA_TYPE, encodeNftContent } from '@unicitylabs/sphere-sdk';
import type {
  CoinlessToken,
  NftContent,
  NftLink,
  NftMetadata,
  NftSignatureStatus,
  NftView,
} from '@unicitylabs/sphere-sdk';
import { CoinlessTokenRow } from '../../../../src/components/wallet/shared/components/CoinlessTokenRow';
import { truncateId } from '../../../../src/utils/identifiers';

/**
 * A coinless row given an NFT reading (#785): the reading names the row, adds
 * its collection and a preview, and says whether the item is signed. Every
 * string in a reading is chosen by whoever minted the token.
 */

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const REGISTRY_ICON = 'https://registry.example/cats.png';
const CREATOR = '02' + 'ab'.repeat(32);
const SIGNED_TITLE = 'Signed by the key shown in its details. This does not prove it belongs to a collection.';

const token = (over: Partial<CoinlessToken> = {}): CoinlessToken => ({
  tokenId: 'cc'.repeat(32),
  tokenType: 'dd'.repeat(32),
  name: 'Cats',
  stateHash: 'ee'.repeat(32),
  transferring: false,
  createdAt: 1,
  updatedAt: 1,
  ...over,
});

function metadata(over: Partial<NftMetadata> = {}): NftMetadata {
  return {
    kind: 'metadata',
    name: 'Cool Cat #7',
    description: null,
    image: null,
    animation_url: null,
    external_url: null,
    attributes: [],
    collection: null,
    collection_id: null,
    ...over,
  };
}

function view(content: NftContent, signature: NftSignatureStatus = 'unsigned'): NftView {
  return { tokenId: 'cc'.repeat(32), content, creator: signature === 'unsigned' ? null : CREATOR, signature };
}

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/** A hosted metadata document, and bytes that match their own fingerprint but are no document. */
const DOCUMENT = encodeNftContent(
  metadata({
    name: 'Doc Cat #1',
    collection: 'Doc Cats',
    image: { kind: 'media', media_type: 'image/png', bytes: PNG },
  }),
);
const NOT_A_DOCUMENT = new Uint8Array([0x63, 0x67, 0x6d, 0x21]);

/** A document link pinned to `pinned`'s fingerprint. */
function documentLink(pinned: Uint8Array = DOCUMENT): NftLink {
  return { kind: 'link', media_type: NFT_DOCUMENT_MEDIA_TYPE, uri: 'https://nft.example/cat.cbor', sha256: sha256Hex(pinned) };
}

function served(bytes: Uint8Array): Response {
  return new Response(new Uint8Array(bytes), { status: 200 });
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

function renderRow(nft: NftView | undefined, over: Partial<CoinlessToken> = {}) {
  return render(<CoinlessTokenRow token={token(over)} nft={nft} delay={0} isNew={false} />, {
    wrapper: makeWrapper(),
  });
}

// Long enough for a query to have settled, had one been due.
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

describe('CoinlessTokenRow — naming an NFT', () => {
  it("titles the row with the NFT's own name, over the registry's class name, and shows its collection", () => {
    renderRow(view(metadata({ collection: 'Cool Cats' })));

    expect(screen.getByText('Cool Cat #7')).toBeTruthy();
    expect(screen.getByText('Cool Cats')).toBeTruthy();
    expect(screen.queryByText('Cats')).toBeNull();
  });

  it('renders markup in a name or collection as literal text', () => {
    const name = '<img src=x onerror=alert(1)>';
    const collection = '<b>Official</b>';
    const { container } = renderRow(view(metadata({ name, collection })), { iconUrl: undefined });

    expect(screen.getByText(name)).toBeTruthy();
    expect(screen.getByText(collection)).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
  });

  it('shows the collection by name only — never the id the item claims', () => {
    const id = 'c0ffee' + '00'.repeat(10) + 'beef';
    renderRow(view(metadata({ collection: 'Cool Cats', collection_id: id }), 'valid'));

    expect(screen.getByText('Cool Cats')).toBeTruthy();
    expect(screen.queryByText('Collection ID')).toBeNull();
    expect(screen.queryByText(truncateId(id))).toBeNull();
    expect(screen.queryByText(/c0ffee/)).toBeNull();
  });
});

describe('CoinlessTokenRow — the signature pill', () => {
  it('marks an NFT whose signature verifies as signed, and says what that does not prove', () => {
    renderRow(view(metadata(), 'valid'));

    expect(screen.getByText('Signed').getAttribute('title')).toBe(SIGNED_TITLE);
    expect(screen.queryByText('Verified')).toBeNull();
    expect(screen.queryByText('Invalid signature')).toBeNull();
    expect(screen.getByText('NFT')).toBeTruthy();
  });

  it('warns about a signature that does not verify', () => {
    renderRow(view(metadata(), 'invalid'));

    expect(screen.getByText('Invalid signature')).toBeTruthy();
    expect(screen.queryByText('Signed')).toBeNull();
    expect(screen.getByText('NFT')).toBeTruthy();
  });

  it('shows no signature pill for an unsigned NFT — only the NFT pill', () => {
    renderRow(view(metadata(), 'unsigned'));

    expect(screen.queryByText('Signed')).toBeNull();
    expect(screen.queryByText('Invalid signature')).toBeNull();
    expect(screen.getByText('NFT')).toBeTruthy();
  });

  it('keeps the signature pill while the token is being sent', () => {
    renderRow(view(metadata(), 'valid'), { transferring: true });

    expect(screen.getByText('Signed')).toBeTruthy();
    expect(screen.getByText('Sending')).toBeTruthy();
  });
});

describe('CoinlessTokenRow — the thumbnail', () => {
  it("previews the NFT's image instead of the registry icon", async () => {
    const { container } = renderRow(
      view(metadata({ image: { kind: 'media', media_type: 'image/png', bytes: PNG } })),
      { iconUrl: REGISTRY_ICON },
    );

    await waitFor(() => expect(container.querySelector('img')?.getAttribute('src')).toBe('blob:nft-1'));
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('Cool Cat #7');
  });

  it('keeps the registry icon when the NFT has no image', () => {
    const { container } = renderRow(view(metadata()), { iconUrl: REGISTRY_ICON });

    expect(container.querySelector('img')?.getAttribute('src')).toBe(REGISTRY_ICON);
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('does not show the registry icon in place of an image that fails its checks', async () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>');
    const { container } = renderRow(view({ kind: 'media', media_type: 'image/svg+xml', bytes: svg }), {
      iconUrl: REGISTRY_ICON,
    });

    expect(container.querySelector('img')).toBeNull();
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});

describe('CoinlessTokenRow — a hosted metadata document (#785)', () => {
  it('titles and previews the row from the document its link resolves to', async () => {
    fetchMock.mockImplementation(async () => served(DOCUMENT));
    const { container } = renderRow(view(documentLink()), { iconUrl: REGISTRY_ICON });

    expect(await screen.findByText('Doc Cat #1')).toBeTruthy();
    expect(screen.getByText('Doc Cats')).toBeTruthy();
    expect(screen.queryByText('Cats')).toBeNull();
    await waitFor(() => expect(container.querySelector('img')?.getAttribute('src')).toBe('blob:nft-1'));
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('Doc Cat #1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://nft.example/cat.cbor');
  });

  it('keeps the registry name, and shows no icon in place of the preview, while the document loads', async () => {
    fetchMock.mockReturnValue(new Promise<Response>(() => {}));
    const { container } = renderRow(view(documentLink()), { iconUrl: REGISTRY_ICON });
    await settle();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Cats')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
  });

  it.each([
    ['does not match its fingerprint', () => served(PNG), documentLink()],
    ['is not a valid NFT document', () => served(NOT_A_DOCUMENT), documentLink(NOT_A_DOCUMENT)],
    ['cannot be fetched', () => Promise.reject(new TypeError('Failed to fetch')), documentLink()],
  ] as const)('names and previews nothing from a document that %s', async (_how, respond, link) => {
    fetchMock.mockImplementation(async () => respond());
    const { container } = renderRow(view(link), { iconUrl: REGISTRY_ICON });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await settle();

    expect(screen.getByText('Cats')).toBeTruthy();
    expect(screen.queryByText('Doc Cat #1')).toBeNull();
    expect(screen.queryByText('Doc Cats')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it.each([
    ['valid', 'Signed'],
    ['invalid', 'Invalid signature'],
  ] as const)("keeps the token's own %s signature pill beside the document's name", async (signature, pill) => {
    fetchMock.mockImplementation(async () => served(DOCUMENT));
    renderRow(view(documentLink(), signature));

    expect(await screen.findByText('Doc Cat #1')).toBeTruthy();
    expect(screen.getByText(pill)).toBeTruthy();
  });

  it('adds no signature pill to an unsigned token, whatever its document holds', async () => {
    fetchMock.mockImplementation(async () => served(DOCUMENT));
    renderRow(view(documentLink(), 'unsigned'));

    expect(await screen.findByText('Doc Cat #1')).toBeTruthy();
    expect(screen.queryByText('Signed')).toBeNull();
    expect(screen.queryByText('Invalid signature')).toBeNull();
  });

  it('names the token to Send and inspect as the row shows it — the document name once resolved', async () => {
    let answer!: (response: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => { answer = resolve; }));
    const onSend = vi.fn();
    const onInspect = vi.fn();
    const held = token();
    render(
      <CoinlessTokenRow token={held} nft={view(documentLink())} delay={0} isNew={false} onSend={onSend} onInspect={onInspect} />,
      { wrapper: makeWrapper() },
    );

    // Before the document resolves the row shows the registry name, and says so.
    act(() => { screen.getByRole('button', { name: 'Send this token' }).click(); });
    expect(onSend).toHaveBeenLastCalledWith(held, 'Cats');

    await act(async () => { answer(served(DOCUMENT)); });
    expect(await screen.findByText('Doc Cat #1')).toBeTruthy();

    act(() => { screen.getByRole('button', { name: 'Send this token' }).click(); });
    expect(onSend).toHaveBeenLastCalledWith(held, 'Doc Cat #1');
    act(() => { screen.getByText('Doc Cat #1').click(); });
    expect(onInspect).toHaveBeenCalledTimes(1);
    expect(onInspect).toHaveBeenLastCalledWith(held, 'Doc Cat #1');
  });
});

describe('CoinlessTokenRow — a reading that changes on an already-mounted row', () => {
  // rerender() reuses the mounted instance, which is exactly the path the memo
  // comparator guards: every other compared prop stays identical here.
  it('adopts a reading that arrives after mount', () => {
    const onSend = vi.fn();
    const onInspect = vi.fn();
    const { rerender } = render(
      <CoinlessTokenRow token={token()} delay={0} isNew={false} onSend={onSend} onInspect={onInspect} />,
      { wrapper: makeWrapper() },
    );
    expect(screen.getByText('Cats')).toBeTruthy();
    expect(screen.queryByText('Signed')).toBeNull();

    rerender(
      <CoinlessTokenRow
        token={token()}
        nft={view(metadata({ collection: 'Cool Cats' }), 'valid')}
        delay={0}
        isNew={false}
        onSend={onSend}
        onInspect={onInspect}
      />,
    );
    expect(screen.getByText('Cool Cat #7')).toBeTruthy();
    expect(screen.getByText('Cool Cats')).toBeTruthy();
    expect(screen.getByText('Signed')).toBeTruthy();
  });

  it('follows a reading replaced in place', () => {
    const onSend = vi.fn();
    const { rerender } = render(
      <CoinlessTokenRow token={token()} nft={view(metadata(), 'valid')} delay={0} isNew={false} onSend={onSend} />,
      { wrapper: makeWrapper() },
    );
    expect(screen.getByText('Signed')).toBeTruthy();

    rerender(
      <CoinlessTokenRow token={token()} nft={view(metadata(), 'invalid')} delay={0} isNew={false} onSend={onSend} />,
    );
    expect(screen.getByText('Invalid signature')).toBeTruthy();
    expect(screen.queryByText('Signed')).toBeNull();
  });
});
