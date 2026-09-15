import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ERROR_CODES, nftContentFromWire, nftContentToWire } from '@unicitylabs/sphere-sdk/connect';
import type { WireNftMetadata } from '@unicitylabs/sphere-sdk/connect';
import { NFT_MAX_PAYLOAD_BYTES } from '@unicitylabs/sphere-sdk';
import type { NftMetadata } from '@unicitylabs/sphere-sdk';
import { checkIntent, validateIntent } from '../../../src/components/connect/intentValidation';

// The real decoder, counted: content over the payload limit must be refused before it is decoded.
vi.mock('@unicitylabs/sphere-sdk/connect', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@unicitylabs/sphere-sdk/connect')>();
  return { ...actual, nftContentFromWire: vi.fn(actual.nftContentFromWire) };
});

/**
 * A `mint_nft` intent is refused before any modal when its params are not the
 * wire shape (Connect 2.3): the content must decode (`nftContentFromWire` — shape
 * and canonical base64) and `sign` must be absent or a boolean. Value rules stay
 * with `payments.mintNft`, whose refusal becomes the intent's error — except the
 * payload limit, which is checked before anything is decoded.
 */

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

function metadata(overrides: Partial<NftMetadata> = {}): NftMetadata {
  return {
    kind: 'metadata',
    name: 'Cool Cat #7',
    description: 'A very cool cat',
    image: { kind: 'media', media_type: 'image/png', bytes: PNG },
    animation_url: null,
    external_url: null,
    attributes: [{ trait_type: 'Eyes', value: 'green' }],
    collection: 'Cats',
    collection_id: null,
    ...overrides,
  };
}

function wireMetadata(overrides: Partial<NftMetadata> = {}): WireNftMetadata {
  return nftContentToWire(metadata(overrides)) as WireNftMetadata;
}

/** Canonical base64 of `size` zero bytes. */
function base64OfSize(size: number): string {
  return Buffer.from(new Uint8Array(size)).toString('base64');
}

beforeEach(() => {
  vi.mocked(nftContentFromWire).mockClear();
});

describe('mint_nft intent validation', () => {
  it('accepts metadata with an inline image, and hands on the decoded content signed by default', () => {
    const check = checkIntent('mint_nft', { content: wireMetadata() });

    expect(check.error).toBeNull();
    expect(check.mintNft?.sign).toBe(true);
    // Decoded: the image bytes are the file again, not the base64 that carried them.
    expect(check.mintNft?.content).toEqual(metadata());
  });

  it('keeps an explicit request for an unsigned mint', () => {
    const check = checkIntent('mint_nft', { content: wireMetadata(), sign: false });

    expect(check.error).toBeNull();
    expect(check.mintNft?.sign).toBe(false);
  });

  it('hands on a claimed collection_id as it was sent', () => {
    const check = checkIntent('mint_nft', { content: wireMetadata({ collection_id: 'c0ffee' }) });

    expect(check.error).toBeNull();
    expect(check.mintNft?.content).toEqual(metadata({ collection_id: 'c0ffee' }));
  });

  it('refuses metadata without collection_id, with INVALID_PARAMS naming the field — an absent field is null, never omitted', () => {
    const content: Record<string, unknown> = { ...wireMetadata() };
    delete content.collection_id;
    const check = checkIntent('mint_nft', { content });

    expect(check.error?.code).toBe(ERROR_CODES.INVALID_PARAMS);
    expect(check.error?.message).toContain('content.collection_id');
    expect(check.mintNft).toBeNull();
  });

  it('refuses a missing content with INVALID_PARAMS naming the field', () => {
    const error = validateIntent('mint_nft', {});

    expect(error?.code).toBe(ERROR_CODES.INVALID_PARAMS);
    expect(error?.message).toContain('content');
  });

  it('refuses inline bytes that are not canonical base64, naming the field', () => {
    const content = { ...wireMetadata(), image: { kind: 'media', media_type: 'image/png', bytes: 'not base64!' } };
    const error = validateIntent('mint_nft', { content });

    expect(error?.code).toBe(ERROR_CODES.INVALID_PARAMS);
    expect(error?.message).toContain('content.image.bytes');
  });

  it('refuses a content kind that is not metadata, media or link', () => {
    const error = validateIntent('mint_nft', { content: { ...wireMetadata(), kind: 'nft' } });

    expect(error?.code).toBe(ERROR_CODES.INVALID_PARAMS);
    expect(error?.message).toContain('content.kind');
  });

  it.each([['yes'], [1], [null]])('refuses sign = %j — it must be absent or a boolean', (sign) => {
    const check = checkIntent('mint_nft', { content: wireMetadata(), sign });

    expect(check.error?.code).toBe(ERROR_CODES.INVALID_PARAMS);
    expect(check.error?.message).toContain('sign');
    expect(check.mintNft).toBeNull();
  });

  it('leaves value rules to payments.mintNft: an empty name is the right shape', () => {
    expect(validateIntent('mint_nft', { content: nftContentToWire(metadata({ name: '' })) })).toBeNull();
  });
});

describe('mint_nft intent validation — the payload limit, before decoding', () => {
  const MEDIA_TYPE = 'image/png';

  it('refuses inline media over the limit with INVALID_PARAMS naming it, without decoding the content', () => {
    // 'A' is valid base64: this is the right shape, only too large.
    const bytes = 'A'.repeat(4 * Math.ceil((NFT_MAX_PAYLOAD_BYTES + 1) / 3));
    const check = checkIntent('mint_nft', { content: { kind: 'media', media_type: MEDIA_TYPE, bytes } });

    expect(check.error?.code).toBe(ERROR_CODES.INVALID_PARAMS);
    expect(check.error?.message).toContain(String(NFT_MAX_PAYLOAD_BYTES));
    expect(check.mintNft).toBeNull();
    expect(nftContentFromWire).not.toHaveBeenCalled();
  });

  it('accepts content that reaches the limit exactly, and decodes it', () => {
    const bytes = base64OfSize(NFT_MAX_PAYLOAD_BYTES - MEDIA_TYPE.length);
    const check = checkIntent('mint_nft', { content: { kind: 'media', media_type: MEDIA_TYPE, bytes } });

    expect(check.error).toBeNull();
    expect(nftContentFromWire).toHaveBeenCalledTimes(1);
    expect(check.mintNft?.content.kind).toBe('media');
  });

  it('refuses content one byte over the limit, without decoding it', () => {
    const bytes = base64OfSize(NFT_MAX_PAYLOAD_BYTES - MEDIA_TYPE.length + 1);
    const check = checkIntent('mint_nft', { content: { kind: 'media', media_type: MEDIA_TYPE, bytes } });

    expect(check.error?.code).toBe(ERROR_CODES.INVALID_PARAMS);
    expect(nftContentFromWire).not.toHaveBeenCalled();
  });

  it('refuses text over the limit, without decoding the content', () => {
    const content = { ...wireMetadata(), description: 'x'.repeat(NFT_MAX_PAYLOAD_BYTES + 1) };
    const check = checkIntent('mint_nft', { content });

    expect(check.error?.code).toBe(ERROR_CODES.INVALID_PARAMS);
    expect(check.error?.message).toContain(String(NFT_MAX_PAYLOAD_BYTES));
    expect(nftContentFromWire).not.toHaveBeenCalled();
  });

  it('counts text in UTF-8 bytes: multibyte text over the limit is refused, though it has fewer characters', () => {
    // Three UTF-8 bytes each, one UTF-16 code unit each.
    const description = '界'.repeat(Math.floor(NFT_MAX_PAYLOAD_BYTES / 3) + 1);
    expect(description.length).toBeLessThan(NFT_MAX_PAYLOAD_BYTES);
    const check = checkIntent('mint_nft', { content: { ...wireMetadata(), description } });

    expect(check.error?.code).toBe(ERROR_CODES.INVALID_PARAMS);
    expect(nftContentFromWire).not.toHaveBeenCalled();
  });

  it('counts a character beyond the BMP — a surrogate pair — as its four UTF-8 bytes', () => {
    // Accepted at 4 bytes each (it would not be at 6, counting each half alone)...
    const under = '😺'.repeat(Math.floor(NFT_MAX_PAYLOAD_BYTES / 5));
    expect(checkIntent('mint_nft', { content: { ...wireMetadata(), description: under } }).error).toBeNull();

    // ...and refused once 4 bytes each is over the limit, though it has fewer code units.
    vi.mocked(nftContentFromWire).mockClear();
    const over = '😺'.repeat(Math.floor(NFT_MAX_PAYLOAD_BYTES / 4) + 1);
    expect(over.length).toBeLessThan(NFT_MAX_PAYLOAD_BYTES);
    expect(checkIntent('mint_nft', { content: { ...wireMetadata(), description: over } }).error?.code).toBe(
      ERROR_CODES.INVALID_PARAMS,
    );
    expect(nftContentFromWire).not.toHaveBeenCalled();
  });

  it('counts two-byte text as two bytes each, not a worst case: text under the limit is still decoded', () => {
    // Refused if every code unit counted as three bytes.
    const description = 'é'.repeat(Math.floor(NFT_MAX_PAYLOAD_BYTES / 3) + 1);
    const check = checkIntent('mint_nft', { content: { ...wireMetadata(), description } });

    expect(check.error).toBeNull();
    expect(nftContentFromWire).toHaveBeenCalledTimes(1);
  });

  it('leaves a malformed shape to the decoder, whose refusal names the field', () => {
    const check = checkIntent('mint_nft', { content: { kind: 'media', media_type: MEDIA_TYPE, bytes: 12345 } });

    expect(check.error?.code).toBe(ERROR_CODES.INVALID_PARAMS);
    expect(check.error?.message).toContain('content.bytes');
    expect(nftContentFromWire).toHaveBeenCalledTimes(1);
  });
});
