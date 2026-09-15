import { useEffect, useState } from 'react';
import { queryOptions, useQuery } from '@tanstack/react-query';
import type { NftLink, NftMediaRef } from '@unicitylabs/sphere-sdk';
import { SPHERE_KEYS } from '../../queryKeys';
import {
  MAX_LINKED_MEDIA_BYTES,
  mediaKindOf,
  resolveLinkUrl,
} from '../../../components/wallet/shared/nft/media';
import { fetchLinkedFile } from './linkedFile';

export type NftMediaState = 'none' | 'loading' | 'ready' | 'unsupported' | 'mismatch' | 'error';

export interface UseNftMediaReturn {
  /** A `blob:` URL of bytes that are safe to render; null in every state but 'ready'. */
  url: string | null;
  mediaType: string | null;
  state: NftMediaState;
}

/**
 * The query for a linked media file: shared by everything that watches the same
 * link, so a link is fetched once however many views wait on it. `link` is null,
 * and nothing is fetched, unless its type is allowlisted; `url` is its
 * resolveLinkUrl, null when it cannot be fetched.
 */
export function linkedMediaQuery(link: NftLink | null, url: string | null) {
  return queryOptions({
    queryKey: SPHERE_KEYS.nft.link(link?.uri ?? '', link?.sha256 ?? ''),
    queryFn: ({ signal }) => {
      if (!link || !url) throw new Error('No fetchable link');
      return fetchLinkedFile(link, url, MAX_LINKED_MEDIA_BYTES, signal);
    },
    enabled: url !== null,
    staleTime: Infinity, // content-addressed: the same uri + sha256 always verifies the same way
    structuralSharing: false,
  });
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

  const linked = useQuery(linkedMediaQuery(link, linkUrl));

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
