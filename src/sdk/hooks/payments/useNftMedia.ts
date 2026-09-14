import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { verifyNftLinkContent } from '@unicitylabs/sphere-sdk';
import type { NftLink, NftMediaRef } from '@unicitylabs/sphere-sdk';
import { SPHERE_KEYS } from '../../queryKeys';
import {
  MAX_LINKED_MEDIA_BYTES,
  mediaKindOf,
  resolveLinkUrl,
} from '../../../components/wallet/shared/nft/media';

export type NftMediaState = 'none' | 'loading' | 'ready' | 'unsupported' | 'mismatch' | 'error';

export interface UseNftMediaReturn {
  /** A `blob:` URL of bytes that are safe to render; null in every state but 'ready'. */
  url: string | null;
  mediaType: string | null;
  state: NftMediaState;
}

/**
 * What fetching a link came to. `unavailable` is every answer that leaves no
 * file to check: an HTTP error, a file over the size cap, a body that broke off.
 */
type LinkedFile =
  | { verified: true; bytes: Uint8Array }
  | { verified: false; reason: 'mismatch' | 'unavailable' };

const UNAVAILABLE: LinkedFile = { verified: false, reason: 'unavailable' };

function tooLarge(): Error {
  return new Error(`Linked file exceeds ${String(MAX_LINKED_MEDIA_BYTES)} bytes`);
}

// Counts bytes as they arrive: a missing or lying content-length must not be
// able to make the wallet buffer an arbitrarily large file.
async function readCapped(res: Response): Promise<Uint8Array> {
  if (!res.body) {
    const whole = new Uint8Array(await res.arrayBuffer());
    if (whole.byteLength > MAX_LINKED_MEDIA_BYTES) throw tooLarge();
    return whole;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_LINKED_MEDIA_BYTES) {
      reader.cancel().catch(() => {});
      throw tooLarge();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function fetchLinkedFile(link: NftLink, url: string, signal: AbortSignal): Promise<LinkedFile> {
  // No cookies and no referrer: the host of an attacker-chosen link learns
  // nothing about which wallet is looking. This throws only when the host never
  // answered — nothing was downloaded, so a later view may ask again.
  const res = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'force-cache', signal });
  // Once the host has answered, its answer is the outcome: returned, not thrown,
  // so it is cached like a match. A thrown refusal would be retried, and fetched
  // again by every remount and every other view of the link — each time costing
  // up to the size cap, from a host the NFT's sender chose.
  try {
    if (!res.ok || Number(res.headers.get('content-length')) > MAX_LINKED_MEDIA_BYTES) {
      res.body?.cancel().catch(() => {});
      return UNAVAILABLE;
    }
    const bytes = await readCapped(res);
    return verifyNftLinkContent(link, bytes) ? { verified: true, bytes } : { verified: false, reason: 'mismatch' };
  } catch (err) {
    // Cancelled because nothing shows the link any more: that says nothing about the file.
    if (signal.aborted) throw err;
    return UNAVAILABLE;
  }
}

/**
 * Renderable bytes for an NFT media reference (#785).
 *
 * Inline media renders when its type is allowlisted. A link is fetched only
 * when its type is allowlisted, and shown only when the bytes hash to the
 * link's sha256 — whatever a gateway serves in their place is never rendered.
 */
export function useNftMedia(ref: NftMediaRef | null): UseNftMediaReturn {
  const mediaType = ref?.media_type ?? null;
  const renderable = mediaType !== null && mediaKindOf(mediaType) !== null;
  const link = ref?.kind === 'link' && renderable ? ref : null;
  const linkUrl = link ? resolveLinkUrl(link.uri) : null;

  const linked = useQuery({
    queryKey: SPHERE_KEYS.nft.link(link?.uri ?? '', link?.sha256 ?? ''),
    queryFn: ({ signal }) => {
      if (!link || !linkUrl) throw new Error('No fetchable link');
      return fetchLinkedFile(link, linkUrl, signal);
    },
    enabled: linkUrl !== null,
    staleTime: Infinity, // content-addressed: the same uri + sha256 always verifies the same way
    structuralSharing: false,
  });

  let bytes: Uint8Array | null = null;
  if (renderable && ref?.kind === 'media') bytes = ref.bytes;
  else if (link && linked.data?.verified) bytes = linked.data.bytes;

  // The URL is paired with the bytes it was made from, so a changed ref never
  // returns the previous — already revoked — URL for the render in between.
  const [objectUrl, setObjectUrl] = useState<{ bytes: Uint8Array; type: string; url: string } | null>(null);
  useEffect(() => {
    if (!bytes || !mediaType) return;
    const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: mediaType }));
    setObjectUrl({ bytes, type: mediaType, url });
    return () => {
      URL.revokeObjectURL(url);
      setObjectUrl((current) => (current?.url === url ? null : current));
    };
  }, [bytes, mediaType]);
  const url = objectUrl && objectUrl.bytes === bytes && objectUrl.type === mediaType ? objectUrl.url : null;

  const refusal = link && linked.data?.verified === false ? linked.data.reason : null;

  let state: NftMediaState;
  if (!ref) state = 'none';
  else if (!renderable || (ref.kind === 'link' && linkUrl === null)) state = 'unsupported';
  else if (url) state = 'ready';
  else if (link && (linked.isError || refusal === 'unavailable')) state = 'error';
  else if (refusal === 'mismatch') state = 'mismatch';
  else state = 'loading';

  return { url, mediaType, state };
}
