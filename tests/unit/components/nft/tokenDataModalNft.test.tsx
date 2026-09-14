import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { NftContent, NftMetadata, NftSignatureStatus, NftView } from '@unicitylabs/sphere-sdk';

/**
 * The token detail view given an NFT reading (#785). Every string in a reading
 * is chosen by whoever minted the token, and its creator key is only a claim
 * unless the signature over this token verifies.
 */

const tokenDataMock = vi.fn<(tokenId: string) => Promise<Uint8Array | null>>();
const nftsMock = vi.fn<(tokenIds: readonly string[]) => Promise<ReadonlyMap<string, NftView>>>();
const resolveMock =
  vi.fn<(identifier: string) => Promise<{ chainPubkey: string; transportPubkey: string; nametag?: string } | null>>();
const fakeSphere = { identity: { chainPubkey: '03' + '11'.repeat(32) }, resolve: resolveMock };

vi.mock('../../../../src/sdk/payments', () => ({
  getPayments: () => ({ tokenData: tokenDataMock, nfts: nftsMock }),
}));
vi.mock('../../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: fakeSphere }),
}));

import { TokenDataModal, type TokenDataTarget } from '../../../../src/components/wallet/L3/modals/TokenDataModal';
import { truncateId } from '../../../../src/utils/identifiers';

const TOKEN_ID = 'aa'.repeat(32);
const TARGET: TokenDataTarget = { tokenId: TOKEN_ID, label: 'Cats', tokenType: 'bb'.repeat(32) };
const COIN: TokenDataTarget = { tokenId: 'cc'.repeat(32), label: 'UCT' };
const CREATOR = '02' + 'ab'.repeat(32);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

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
  return { tokenId: TOKEN_ID, content, creator: signature === 'unsigned' ? null : CREATOR, signature };
}

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function renderModal(nft: NftView | null, target: TokenDataTarget = TARGET) {
  nftsMock.mockResolvedValue(new Map<string, NftView>(nft ? [[nft.tokenId, nft]] : []));
  return render(<TokenDataModal target={target} onClose={vi.fn()} />, { wrapper: makeWrapper() });
}

let urlSeq = 0;
const createObjectURL = vi.fn<(obj: Blob | MediaSource) => string>(() => `blob:nft-${String(++urlSeq)}`);
const revokeObjectURL = vi.fn<(url: string) => void>();
const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;

beforeEach(() => {
  tokenDataMock.mockReset();
  nftsMock.mockReset();
  resolveMock.mockReset();
  // 0x63 'gm!' — the raw block shows whatever the blob holds.
  tokenDataMock.mockResolvedValue(new Uint8Array([0x63, 0x67, 0x6d, 0x21]));
  resolveMock.mockResolvedValue(null);
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

// Long enough for a query or a resolve to have started, had one been due.
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

describe('TokenDataModal — an NFT reading (#785)', () => {
  it('shows the name, collection, description and attributes above the token fields', async () => {
    renderModal(
      view(
        metadata({
          collection: 'Cool Cats',
          description: 'A very cool cat.',
          attributes: [
            { trait_type: 'Eyes', value: 'Laser' },
            { trait_type: 'Level', value: 7 },
          ],
        }),
      ),
    );

    const heading = await screen.findByRole('heading', { name: 'Cool Cat #7' });
    expect(screen.getByText('Cool Cats')).toBeTruthy();
    expect(screen.getByText('A very cool cat.')).toBeTruthy();
    expect(screen.getByText('Eyes')).toBeTruthy();
    expect(screen.getByText('Laser')).toBeTruthy();
    expect(screen.getByText('Level')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
    // Above the token id, type and raw data — not after them.
    expect(heading.compareDocumentPosition(screen.getByText('Token ID')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(nftsMock).toHaveBeenCalledWith([TOKEN_ID]);
  });

  it.each(['valid', 'invalid', 'unsigned'] as const)(
    'keeps the raw genesis data and its label exactly, and names no format (%s)',
    async (signature) => {
      renderModal(
        view(
          metadata({
            collection: 'Cool Cats',
            description: 'A very cool cat.',
            image: { kind: 'media', media_type: 'image/png', bytes: PNG },
            attributes: [{ trait_type: 'Eyes', value: 'Laser' }],
            external_url: 'https://coolcats.example/7',
          }),
          signature,
        ),
      );

      await screen.findByRole('heading', { name: 'Cool Cat #7' });
      await waitFor(() => expect(screen.getByText('63676d21')).toBeTruthy());
      expect(screen.getByText('Genesis data — 4 bytes')).toBeTruthy();
      expect(screen.getByText('Token ID')).toBeTruthy();
      expect(screen.getByText('Token type (class)')).toBeTruthy();
      expect(screen.queryByText(/CBOR/)).toBeNull();
    },
  );

  it('renders markup in the description, collection and attributes as literal text', async () => {
    const description = '<img src=x onerror=alert(1)>';
    const collection = '<b>Official</b>';
    const value = '<script>alert(1)</script>';
    const { container } = renderModal(
      view(metadata({ description, collection, attributes: [{ trait_type: 'Note', value }] })),
    );

    expect(await screen.findByText(description)).toBeTruthy();
    expect(screen.getByText(collection)).toBeTruthy();
    expect(screen.getByText(value)).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
  });

  it('links an https external_url, opened away from the wallet', async () => {
    const url = 'https://coolcats.example/7';
    renderModal(view(metadata({ external_url: url })));

    const link = (await screen.findByText(url)).closest('a');
    expect(link?.getAttribute('href')).toBe(url);
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')?.split(' ').sort()).toEqual(['nofollow', 'noopener', 'noreferrer']);
  });

  it.each(['javascript:alert(1)', 'http://coolcats.example/7', 'data:text/html,hi'])(
    'shows the external_url %s as text, never as a link',
    async (url) => {
      const { container } = renderModal(view(metadata({ external_url: url })));

      expect((await screen.findByText(url)).closest('a')).toBeNull();
      expect(container.querySelector('a')).toBeNull();
    },
  );

  it("shows a bare media NFT's image, named by the target label", async () => {
    const { container } = renderModal(view({ kind: 'media', media_type: 'image/png', bytes: PNG }, 'valid'));

    await waitFor(() => expect(container.querySelector('img')?.getAttribute('src')).toMatch(/^blob:nft-/));
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('Cats');
    expect(screen.getByText('Signed by its creator')).toBeTruthy();
  });

  it('plays animation_url alongside the image', async () => {
    const { container } = renderModal(
      view(
        metadata({
          image: { kind: 'media', media_type: 'image/png', bytes: PNG },
          animation_url: { kind: 'media', media_type: 'video/mp4', bytes: PNG },
        }),
      ),
    );

    await waitFor(() => {
      expect(container.querySelector('img')).toBeTruthy();
      expect(container.querySelector('video')).toBeTruthy();
    });
  });
});

describe('TokenDataModal — the creator (#785)', () => {
  const OTHER = '03' + 'cd'.repeat(32);

  /**
   * A binding as resolve() answers it: the chain key it names, its nametag, and
   * the key that signed it — by default the named key's own x-only form, which
   * is how a Sphere wallet signs its binding.
   */
  function binding(chainPubkey: string, nametag?: string, signer: string = chainPubkey.slice(2)) {
    return { chainPubkey, transportPubkey: signer, ...(nametag !== undefined ? { nametag } : {}) };
  }

  /** resolve() answers from this table: a key's lookup, and `@name` for the name's own binding. */
  function resolvesTo(answers: Record<string, ReturnType<typeof binding>>) {
    resolveMock.mockImplementation(async (identifier) => answers[identifier] ?? null);
  }

  it('names a verified creator, by nametag once its binding resolves both ways', async () => {
    resolvesTo({ [CREATOR]: binding(CREATOR, 'alice'), '@alice': binding(CREATOR, 'alice') });
    renderModal(view(metadata(), 'valid'));

    expect(await screen.findByText('@alice')).toBeTruthy();
    expect(screen.getByText('Creator')).toBeTruthy();
    expect(screen.getByText(truncateId(CREATOR))).toBeTruthy();
    expect(screen.getByText('Signed by its creator')).toBeTruthy();
    expect(resolveMock).toHaveBeenCalledWith(CREATOR);
    expect(resolveMock).toHaveBeenCalledWith('@alice');
  });

  it('shows the verified key without a name when no binding resolves', async () => {
    renderModal(view(metadata(), 'valid'));

    expect(await screen.findByText('Creator')).toBeTruthy();
    await waitFor(() => expect(resolveMock).toHaveBeenCalled());
    await settle();
    expect(screen.getByText(truncateId(CREATOR))).toBeTruthy();
    expect(screen.queryByText(/^@/)).toBeNull();
  });

  it('takes no name from a resolver answer about a different key', async () => {
    resolvesTo({ [CREATOR]: binding(OTHER, 'someone-else'), '@someone-else': binding(OTHER, 'someone-else') });
    renderModal(view(metadata(), 'valid'));

    expect(await screen.findByText('Creator')).toBeTruthy();
    await waitFor(() => expect(resolveMock).toHaveBeenCalled());
    await settle();
    expect(screen.queryByText('@someone-else')).toBeNull();
    expect(screen.getByText(truncateId(CREATOR))).toBeTruthy();
  });

  it("takes no name that the key's binding states but the name's own binding gives to another key", async () => {
    // The lookup by key is answered by the creator's own binding, which names a
    // nametag registered to someone else: a binding's name is only its publisher's word.
    resolvesTo({ [CREATOR]: binding(CREATOR, 'unicity'), '@unicity': binding(OTHER, 'unicity') });
    renderModal(view(metadata(), 'valid'));

    expect(await screen.findByText('Creator')).toBeTruthy();
    await waitFor(() => expect(resolveMock).toHaveBeenCalledWith('@unicity'));
    await settle();
    expect(screen.queryByText('@unicity')).toBeNull();
    expect(screen.getByText(truncateId(CREATOR))).toBeTruthy();
    expect(screen.getByText('Signed by its creator')).toBeTruthy();
  });

  it('takes no name that resolves to no binding of its own', async () => {
    resolvesTo({ [CREATOR]: binding(CREATOR, 'ghost') });
    renderModal(view(metadata(), 'valid'));

    expect(await screen.findByText('Creator')).toBeTruthy();
    await waitFor(() => expect(resolveMock).toHaveBeenCalledWith('@ghost'));
    await settle();
    expect(screen.queryByText('@ghost')).toBeNull();
  });

  it('takes no name outside the format a nametag is registered in, even when both lookups confirm it', async () => {
    // An invisible character makes a different name that renders just like "unicity".
    const lookalike = 'unicity​';
    resolvesTo({ [CREATOR]: binding(CREATOR, lookalike), [`@${lookalike}`]: binding(CREATOR, lookalike) });
    renderModal(view(metadata(), 'valid'));

    expect(await screen.findByText('Creator')).toBeTruthy();
    await waitFor(() => expect(resolveMock).toHaveBeenCalledWith(CREATOR));
    await settle();
    expect(screen.queryByText(/^@unicity/)).toBeNull();
    expect(screen.getByText(truncateId(CREATOR))).toBeTruthy();
  });

  it('shows a name in its canonical form, and looks up that form', async () => {
    resolvesTo({ [CREATOR]: binding(CREATOR, ' Alice '), '@alice': binding(CREATOR, 'alice') });
    renderModal(view(metadata(), 'valid'));

    expect(await screen.findByText('@alice')).toBeTruthy();
    expect(resolveMock).toHaveBeenCalledWith('@alice');
  });

  it.each(['by key', 'by name'] as const)(
    'takes no name when the binding found %s names the creator but was signed by another key',
    async (which) => {
      const foreignSigner = 'cd'.repeat(32);
      resolvesTo({
        [CREATOR]: binding(CREATOR, 'alice', which === 'by key' ? foreignSigner : undefined),
        '@alice': binding(CREATOR, 'alice', which === 'by name' ? foreignSigner : undefined),
      });
      renderModal(view(metadata(), 'valid'));

      expect(await screen.findByText('Creator')).toBeTruthy();
      await waitFor(() => expect(resolveMock).toHaveBeenCalledWith(CREATOR));
      await settle();
      expect(screen.queryByText('@alice')).toBeNull();
      expect(screen.getByText(truncateId(CREATOR))).toBeTruthy();
    },
  );

  it("presents an invalid signature's key only as a claim: never resolved, never named, never the creator", async () => {
    resolvesTo({ [CREATOR]: binding(CREATOR, 'alice'), '@alice': binding(CREATOR, 'alice') });
    renderModal(view(metadata(), 'invalid'));

    expect(await screen.findByText('Claimed creator (not verified)')).toBeTruthy();
    await settle();
    expect(screen.getByText('Creator signature does not verify — this may be a copy')).toBeTruthy();
    expect(screen.getByText(truncateId(CREATOR))).toBeTruthy();
    expect(screen.queryByText('Creator')).toBeNull();
    expect(screen.queryByText('Signed by its creator')).toBeNull();
    expect(screen.queryByText('@alice')).toBeNull();
    expect(resolveMock).not.toHaveBeenCalled();
  });

  it('shows no creator at all for an unsigned NFT', async () => {
    renderModal(view(metadata(), 'unsigned'));

    expect(await screen.findByText('Unsigned — anyone could mint an identical token')).toBeTruthy();
    await settle();
    expect(screen.queryByText(/creator/i)).toBeNull();
    expect(resolveMock).not.toHaveBeenCalled();
  });
});

describe('TokenDataModal — no reading', () => {
  it('adds nothing for a coinless token whose payload is not an NFT', async () => {
    renderModal(null);

    expect(await screen.findByText('63676d21')).toBeTruthy();
    await waitFor(() => expect(nftsMock).toHaveBeenCalledWith([TOKEN_ID]));
    await settle();
    expect(screen.queryByRole('region', { name: 'NFT' })).toBeNull();
    expect(screen.queryByText(/Signed by its creator|Unsigned|does not verify/)).toBeNull();
  });

  it('never reads a coin token as an NFT', async () => {
    renderModal(null, COIN);

    expect(await screen.findByText('63676d21')).toBeTruthy();
    await settle();
    expect(nftsMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: 'NFT' })).toBeNull();
  });

  it("does not carry one token's reading over to another", async () => {
    const other: TokenDataTarget = { tokenId: 'dd'.repeat(32), label: 'Dogs', tokenType: 'bb'.repeat(32) };
    const { rerender } = renderModal(view(metadata(), 'valid'));
    await screen.findByRole('heading', { name: 'Cool Cat #7' });

    // The mock still answers only for the first token.
    rerender(<TokenDataModal target={other} onClose={vi.fn()} />);
    await waitFor(() => expect(nftsMock).toHaveBeenCalledWith([other.tokenId]));
    await settle();
    expect(screen.queryByRole('heading', { name: 'Cool Cat #7' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'NFT' })).toBeNull();
  });
});
