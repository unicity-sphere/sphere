import { useQuery } from '@tanstack/react-query';
import { isNftDocumentLink, parseNftDocument } from '@unicitylabs/sphere-sdk';
import type { NftContent, NftLink, NftMedia, NftMetadata } from '@unicitylabs/sphere-sdk';
import { SPHERE_KEYS } from '../../queryKeys';
import { MAX_NFT_DOCUMENT_BYTES, resolveLinkUrl } from '../../../components/wallet/shared/nft/media';
import { fetchLinkedFile } from './linkedFile';

export type NftDocumentState = 'none' | 'loading' | 'ready' | 'unsupported' | 'mismatch' | 'invalid' | 'error';

/** What a metadata document holds: one metadata or media item — never a link, so documents do not chain. */
export type NftDocument = NftMetadata | NftMedia;

export interface UseNftDocumentReturn {
  /** The document's item; null in every state but 'ready'. */
  document: NftDocument | null;
  state: NftDocumentState;
}

/**
 * What resolving a document link came to. Every answer from its host is data,
 * cached like a linked file's: `invalid` is a file that matches its fingerprint
 * but is not a document.
 */
type DocumentOutcome =
  | { kind: 'document'; document: NftDocument }
  | { kind: 'mismatch' | 'invalid' | 'unavailable' };

async function fetchDocument(link: NftLink, url: string, signal: AbortSignal): Promise<DocumentOutcome> {
  const file = await fetchLinkedFile(link, url, MAX_NFT_DOCUMENT_BYTES, signal);
  if (!file.verified) return { kind: file.reason };
  // Parsed only once the bytes hash to the link's sha256. parseNftDocument never throws.
  const document = parseNftDocument(file.bytes);
  return document ? { kind: 'document', document } : { kind: 'invalid' };
}

const NONE: UseNftDocumentReturn = { document: null, state: 'none' };

/** The metadata document `content` links to, or null when it is anything else. */
export function nftDocumentLinkOf(content: NftContent | null | undefined): NftLink | null {
  return content?.kind === 'link' && isNftDocumentLink(content) ? content : null;
}

/**
 * The metadata document a document link points at (#785): fetched under the
 * same policy as linked media, but held to MAX_NFT_DOCUMENT_BYTES, and parsed
 * only once its bytes match the link's sha256. Anything that is not a document
 * link is 'none', and never fetched.
 */
export function useNftDocument(link: NftLink | null): UseNftDocumentReturn {
  const documentLink = nftDocumentLinkOf(link);
  const url = documentLink ? resolveLinkUrl(documentLink.uri) : null;

  const resolved = useQuery({
    queryKey: SPHERE_KEYS.nft.document(documentLink?.uri ?? '', documentLink?.sha256 ?? ''),
    queryFn: ({ signal }) => {
      if (!documentLink || !url) throw new Error('No fetchable document link');
      return fetchDocument(documentLink, url, signal);
    },
    enabled: url !== null,
    staleTime: Infinity, // content-addressed: the same uri + sha256 always resolves the same way
    structuralSharing: false, // a media document carries Uint8Array bytes
  });

  if (!documentLink) return NONE;
  if (url === null) return { document: null, state: 'unsupported' };
  const outcome = resolved.data;
  if (outcome?.kind === 'document') return { document: outcome.document, state: 'ready' };
  if (outcome?.kind === 'mismatch' || outcome?.kind === 'invalid') return { document: null, state: outcome.kind };
  if (outcome?.kind === 'unavailable' || resolved.isError) return { document: null, state: 'error' };
  return { document: null, state: 'loading' };
}

export interface ResolvedNftContent {
  /** What to display: the document's item once it resolved, else the content as given. Null without content. */
  readonly content: NftContent | null;
  /** The document link `content` was resolved from; null unless it was. */
  readonly hostedAt: NftLink | null;
  /** Where resolving the document stands; 'none' when the content is not a document link. */
  readonly documentState: NftDocumentState;
}

/**
 * The NFT content display code shows: a token's own content, or — when that is a
 * document link that resolved — the document's item. It takes content, never a
 * reading, so nothing shown from a document can carry a signature status: that
 * always comes from the token.
 */
export function useResolvedNftContent(content: NftContent | null | undefined): ResolvedNftContent {
  const own = content ?? null;
  const link = nftDocumentLinkOf(own);
  const { document, state } = useNftDocument(link);
  return document && link
    ? { content: document, hostedAt: link, documentState: state }
    : { content: own, hostedAt: null, documentState: state };
}
