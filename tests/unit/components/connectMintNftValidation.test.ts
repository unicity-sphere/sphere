import { describe, it, expect } from 'vitest';
import { ERROR_CODES, nftContentToWire } from '@unicitylabs/sphere-sdk/connect';
import type { WireNftMetadata } from '@unicitylabs/sphere-sdk/connect';
import type { NftMetadata } from '@unicitylabs/sphere-sdk';
import { checkIntent, validateIntent } from '../../../src/components/connect/intentValidation';

/**
 * A `mint_nft` intent is refused before any modal when its params are not the
 * wire shape (Connect 2.3): the content must decode (`nftContentFromWire` — shape
 * and canonical base64) and `sign` must be absent or a boolean. Value rules stay
 * with `payments.mintNft`, whose refusal becomes the intent's error.
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
