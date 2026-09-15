import { useQuery } from '@tanstack/react-query';
import type { NftContent, NftLink, NftMediaRef } from '@unicitylabs/sphere-sdk';
import { mediaKindOf, resolveLinkUrl } from '../../../components/wallet/shared/nft/media';
import { nftContentMediaRef } from '../../../components/wallet/shared/nft/nftDisplay';
import { nftDocumentLinkOf, useNftDocument, type NftDocumentState } from './useNftDocument';
import { linkedMediaQuery } from './useNftMedia';

/**
 * How long a mint preview holds Mint back for linked content still loading. A host can
 * accept the request and never finish it; past this, what has not loaded counts as not
 * shown, so the intent can still be approved — with a warning — or refused.
 */
export const NFT_PREVIEW_WAIT_MS = 15_000;

/** Where one linked part of a preview stands. Inline media is 'none': it is in the content, with nothing to wait for. */
type LinkedPart = 'none' | 'loading' | 'shown' | 'unavailable';

/** The document states in which nothing from the document is shown. */
const DOCUMENT_UNSHOWN: ReadonlySet<NftDocumentState> = new Set(['unsupported', 'mismatch', 'invalid', 'error']);

export interface NftPreviewState {
  /** A linked part — the metadata document, or a linked image or animation — is still being fetched. */
  readonly loading: boolean;
  /**
   * A linked part will not be shown: it could not be fetched, failed its fingerprint,
   * is not a document, or is of a type this wallet does not display.
   */
  readonly unavailable: boolean;
  /** The content's metadata document link, known before — and whether or not — it resolves. */
  readonly documentLink: NftLink | null;
}

/** One media slot's link, watched through the same query NftMediaView renders from. */
function useLinkedPart(ref: NftMediaRef | null): LinkedPart {
  const link = ref?.kind === 'link' ? ref : null;
  // Exactly useNftMedia's derivation, so both watch the SAME query and the link is fetched once.
  const displayable = link !== null && mediaKindOf(link.media_type) !== null ? link : null;
  const url = displayable ? resolveLinkUrl(displayable.uri) : null;
  const query = useQuery(linkedMediaQuery(displayable, url));

  if (!link) return 'none';
  if (url === null) return 'unavailable';
  if (query.data?.verified) return 'shown';
  if (query.data !== undefined || query.isError) return 'unavailable';
  return 'loading';
}

/**
 * Whether everything an NFT's content links to has finished loading for its preview
 * (#785), and whether any of it ended up not shown. Watches the metadata document
 * and the linked image and animation of whatever the preview shows — the resolved
 * document's item, or the content itself — through the queries the preview renders
 * from, so nothing is fetched a second time.
 */
export function useNftPreviewState(content: NftContent | null): NftPreviewState {
  const documentLink = nftDocumentLinkOf(content);
  const { document, state: documentState } = useNftDocument(documentLink);
  // A document link shows no media of its own: until its document resolves there is nothing more to watch.
  const shown = documentLink ? document : content;
  const image = useLinkedPart(shown ? nftContentMediaRef(shown) : null);
  const animation = useLinkedPart(shown?.kind === 'metadata' ? shown.animation_url : null);
  const parts = [image, animation];

  return {
    loading: documentState === 'loading' || parts.includes('loading'),
    unavailable: DOCUMENT_UNSHOWN.has(documentState) || parts.includes('unavailable'),
    documentLink,
  };
}
