import { describe, it, expect } from 'vitest';
import type { CoinlessToken, NftLink, NftMedia, NftMetadata, NftView } from '@unicitylabs/sphere-sdk';
import { nftThumbnailRef, nftTitle, shortPubkey } from '../../../../src/components/wallet/shared/nft/nftDisplay';
import { truncateId } from '../../../../src/utils/identifiers';

function token(overrides: Partial<CoinlessToken> = {}): CoinlessToken {
  return {
    tokenId: 'aa'.repeat(32),
    tokenType: 'bb'.repeat(32),
    stateHash: 'cc'.repeat(32),
    transferring: false,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

const MEDIA: NftMedia = { kind: 'media', media_type: 'image/png', bytes: new Uint8Array([1, 2, 3]) };
const LINK: NftLink = { kind: 'link', media_type: 'image/png', uri: 'https://example.com/cat.png', sha256: 'dd'.repeat(32) };

function metadata(overrides: Partial<NftMetadata> = {}): NftMetadata {
  return {
    kind: 'metadata',
    name: 'Cool Cat #7',
    description: null,
    image: null,
    animation_url: null,
    external_url: null,
    attributes: [],
    collection: null,
    ...overrides,
  };
}

function view(content: NftView['content']): NftView {
  return { tokenId: 'aa'.repeat(32), content, creator: null, signature: 'unsigned' };
}

describe('nftTitle', () => {
  it("prefers the NFT's own metadata name over the registry's class name", () => {
    expect(nftTitle(token({ name: 'Cats' }), view(metadata()))).toBe('Cool Cat #7');
  });

  it('falls back to the registry name when there is no reading, or the NFT is a bare file', () => {
    expect(nftTitle(token({ name: 'Cats' }))).toBe('Cats');
    expect(nftTitle(token({ name: 'Cats' }), view(MEDIA))).toBe('Cats');
    expect(nftTitle(token({ name: 'Cats' }), view(LINK))).toBe('Cats');
  });

  it('then names the class by its type id, then admits it is unknown', () => {
    expect(nftTitle(token())).toBe('Type bbbbbbbb…');
    expect(nftTitle(token({ name: '' }))).toBe('Type bbbbbbbb…');
    expect(nftTitle(token({ tokenType: undefined }))).toBe('Unknown type');
  });
});

describe('nftThumbnailRef', () => {
  it("previews metadata's image", () => {
    expect(nftThumbnailRef(view(metadata({ image: LINK })))).toBe(LINK);
    expect(nftThumbnailRef(view(metadata({ image: MEDIA })))).toBe(MEDIA);
  });

  it('previews nothing for metadata without an image — animation_url is not a thumbnail', () => {
    expect(nftThumbnailRef(view(metadata({ animation_url: MEDIA })))).toBeNull();
  });

  it('previews a bare media or link NFT as itself', () => {
    expect(nftThumbnailRef(view(MEDIA))).toBe(MEDIA);
    expect(nftThumbnailRef(view(LINK))).toBe(LINK);
  });

  it('previews nothing without a reading', () => {
    expect(nftThumbnailRef(undefined)).toBeNull();
  });
});

describe('shortPubkey', () => {
  it('shortens a creator key the way every other identifier is shortened', () => {
    const creator = '02' + 'ab'.repeat(32);
    expect(shortPubkey(creator)).toBe(truncateId(creator));
  });
});
