import { describe, it, expect } from 'vitest';
import {
  AUDIO_TYPES,
  IMAGE_TYPES,
  MAX_LINKED_MEDIA_BYTES,
  MAX_NFT_DOCUMENT_BYTES,
  VIDEO_TYPES,
  mediaKindOf,
  resolveLinkUrl,
} from '../../../../src/components/wallet/shared/nft/media';

const CID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
const AR_ID = 'bNbA3TEQVL60xlgCcqdz4ZPHFZ711cZ3hmkpGttDt_U';

describe('NFT media allowlists', () => {
  it('render raster images, mp4/webm video and mpeg/ogg/wav audio — nothing else', () => {
    expect([...IMAGE_TYPES]).toEqual(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif']);
    expect([...VIDEO_TYPES]).toEqual(['video/mp4', 'video/webm']);
    expect([...AUDIO_TYPES]).toEqual(['audio/mpeg', 'audio/ogg', 'audio/wav']);
  });

  it('maps each allowlisted type to its element', () => {
    for (const t of IMAGE_TYPES) expect(mediaKindOf(t)).toBe('image');
    for (const t of VIDEO_TYPES) expect(mediaKindOf(t)).toBe('video');
    for (const t of AUDIO_TYPES) expect(mediaKindOf(t)).toBe('audio');
  });

  it('renders no SVG — a document that can carry script — nor any other type', () => {
    for (const t of ['image/svg+xml', 'text/html', 'application/pdf', 'video/quicktime', 'IMAGE/PNG', 'image/png; q=1', '']) {
      expect(mediaKindOf(t)).toBeNull();
    }
  });

  it('never renders a metadata document as media', () => {
    expect(mediaKindOf('application/vnd.unicity.nft+cbor')).toBeNull();
  });

  it('caps a linked file at 10 MiB', () => {
    expect(MAX_LINKED_MEDIA_BYTES).toBe(10 * 1024 * 1024);
  });

  it('caps a linked metadata document at 1 MiB', () => {
    expect(MAX_NFT_DOCUMENT_BYTES).toBe(1024 * 1024);
  });
});

describe('resolveLinkUrl', () => {
  it('fetches an https link as it is', () => {
    expect(resolveLinkUrl('https://example.com/cat.png')).toBe('https://example.com/cat.png');
  });

  it('routes ipfs:// through the public gateway, keeping any path', () => {
    expect(resolveLinkUrl(`ipfs://${CID}`)).toBe(`https://ipfs.io/ipfs/${CID}`);
    expect(resolveLinkUrl(`ipfs://${CID}/art/cat.png`)).toBe(`https://ipfs.io/ipfs/${CID}/art/cat.png`);
  });

  it('routes ar:// through the Arweave gateway', () => {
    expect(resolveLinkUrl(`ar://${AR_ID}`)).toBe(`https://arweave.net/${AR_ID}`);
  });

  it('refuses every other scheme', () => {
    expect(resolveLinkUrl('http://example.com/cat.png')).toBeNull();
    expect(resolveLinkUrl('javascript:alert(1)')).toBeNull();
    expect(resolveLinkUrl('data:image/png;base64,iVBORw0KGgo=')).toBeNull();
    expect(resolveLinkUrl('HTTPS://example.com/cat.png')).toBeNull();
    expect(resolveLinkUrl('ftp://example.com/cat.png')).toBeNull();
    expect(resolveLinkUrl('')).toBeNull();
  });

  it('refuses a link with no identifier, or one shaped to move the gateway host', () => {
    expect(resolveLinkUrl('https://')).toBeNull();
    expect(resolveLinkUrl('ipfs://')).toBeNull();
    expect(resolveLinkUrl('ipfs:///cat.png')).toBeNull();
    expect(resolveLinkUrl('ar://')).toBeNull();
    expect(resolveLinkUrl('ipfs://@evil.example/cat.png')).toBeNull();
    expect(resolveLinkUrl('ipfs://evil.example:443/cat.png')).toBeNull();
    expect(resolveLinkUrl('ar://evil.example/x')).toBeNull();
  });
});
