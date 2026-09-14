import { isHttpsUrl } from '../../../../utils/isHttpsUrl';

/**
 * What an NFT media reference (#785) may render as, and where a linked file is
 * fetched from. NFT metadata is attacker-controlled, so both are allowlists.
 *
 * SVG is excluded on purpose: it is a document rather than a bitmap, and can
 * carry script and external references.
 */
export const IMAGE_TYPES: readonly string[] = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif'];
export const VIDEO_TYPES: readonly string[] = ['video/mp4', 'video/webm'];
export const AUDIO_TYPES: readonly string[] = ['audio/mpeg', 'audio/ogg', 'audio/wav'];

/** A linked file larger than this is refused before it is hashed or shown. */
export const MAX_LINKED_MEDIA_BYTES = 10 * 1024 * 1024;

export type NftMediaKind = 'image' | 'video' | 'audio';

/** The element a media type renders as; null = not rendered at all. Exact match: the format only admits lowercase types. */
export function mediaKindOf(mediaType: string): NftMediaKind | null {
  if (IMAGE_TYPES.includes(mediaType)) return 'image';
  if (VIDEO_TYPES.includes(mediaType)) return 'video';
  if (AUDIO_TYPES.includes(mediaType)) return 'audio';
  return null;
}

const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';
const ARWEAVE_GATEWAY = 'https://arweave.net/';
// The identifier segment: a CID is base58/base32, an Arweave id base64url. Holding
// it to that alphabet keeps anything host-shaped (`@`, `:`) out of the gateway URL.
const IPFS_CID = /^[A-Za-z0-9]+$/;
const ARWEAVE_ID = /^[A-Za-z0-9_-]+$/;

function viaGateway(rest: string, idPattern: RegExp, gateway: string): string | null {
  const slash = rest.indexOf('/');
  const id = slash === -1 ? rest : rest.slice(0, slash);
  if (!idPattern.test(id)) return null;
  const url = gateway + rest;
  return isHttpsUrl(url) ? url : null;
}

/**
 * The https URL a link's file is fetched from, or null when it cannot be fetched.
 * `ipfs://` and `ar://` go through fixed public gateways — the SHA-256 check makes
 * the gateway untrusted, so which one serves the bytes is not a security decision.
 * Every other scheme (http, javascript, data, …) is refused.
 */
export function resolveLinkUrl(uri: string): string | null {
  if (uri.startsWith('https://')) return isHttpsUrl(uri) ? uri : null;
  if (uri.startsWith('ipfs://')) return viaGateway(uri.slice('ipfs://'.length), IPFS_CID, IPFS_GATEWAY);
  if (uri.startsWith('ar://')) return viaGateway(uri.slice('ar://'.length), ARWEAVE_ID, ARWEAVE_GATEWAY);
  return null;
}
