import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type {
  CoinlessToken,
  NftContent,
  NftMetadata,
  NftSignatureStatus,
  NftView,
} from '@unicitylabs/sphere-sdk';
import { CoinlessTokenRow } from '../../../../src/components/wallet/shared/components/CoinlessTokenRow';

/**
 * A coinless row given an NFT reading (#785): the reading names the row, adds
 * its collection and a preview, and says whether the creator signed it. Every
 * string in a reading is chosen by whoever minted the token.
 */

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const REGISTRY_ICON = 'https://registry.example/cats.png';
const CREATOR = '02' + 'ab'.repeat(32);

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
});

describe('CoinlessTokenRow — the creator signature pill', () => {
  it('marks an NFT whose creator signature verifies', () => {
    renderRow(view(metadata(), 'valid'));

    expect(screen.getByText('Verified')).toBeTruthy();
    expect(screen.queryByText('Invalid signature')).toBeNull();
    expect(screen.getByText('NFT')).toBeTruthy();
  });

  it('warns about a creator signature that does not verify', () => {
    renderRow(view(metadata(), 'invalid'));

    expect(screen.getByText('Invalid signature')).toBeTruthy();
    expect(screen.queryByText('Verified')).toBeNull();
    expect(screen.getByText('NFT')).toBeTruthy();
  });

  it('shows no signature pill for an unsigned NFT — only the NFT pill', () => {
    renderRow(view(metadata(), 'unsigned'));

    expect(screen.queryByText('Verified')).toBeNull();
    expect(screen.queryByText('Invalid signature')).toBeNull();
    expect(screen.getByText('NFT')).toBeTruthy();
  });

  it('keeps the signature pill while the token is being sent', () => {
    renderRow(view(metadata(), 'valid'), { transferring: true });

    expect(screen.getByText('Verified')).toBeTruthy();
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
    expect(screen.queryByText('Verified')).toBeNull();

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
    expect(screen.getByText('Verified')).toBeTruthy();
  });

  it('follows a reading replaced in place', () => {
    const onSend = vi.fn();
    const { rerender } = render(
      <CoinlessTokenRow token={token()} nft={view(metadata(), 'valid')} delay={0} isNew={false} onSend={onSend} />,
      { wrapper: makeWrapper() },
    );
    expect(screen.getByText('Verified')).toBeTruthy();

    rerender(
      <CoinlessTokenRow token={token()} nft={view(metadata(), 'invalid')} delay={0} isNew={false} onSend={onSend} />,
    );
    expect(screen.getByText('Invalid signature')).toBeTruthy();
    expect(screen.queryByText('Verified')).toBeNull();
  });
});
