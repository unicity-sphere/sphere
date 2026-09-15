import { useQuery } from '@tanstack/react-query';
import type { NftContent, NftLink, NftMediaRef } from '@unicitylabs/sphere-sdk';
import { mediaKindOf, resolveLinkUrl } from '../../../components/wallet/shared/nft/media';
import type { NftMediaDisplayStatus } from '../../../components/wallet/shared/nft/mediaDisplay';
import { nftContentMediaRef } from '../../../components/wallet/shared/nft/nftDisplay';
import { nftDocumentLinkOf, useNftDocument, type NftDocumentState } from './useNftDocument';
import { linkedMediaQuery } from './useNftMedia';

/**
 * How long a mint preview holds Mint back for content not yet on screen: a linked file
 * still being fetched, or any file the browser has not yet displayed. A host can accept
 * the request and never finish it, and an element can neither load nor fail; past this,
 * what is not displayed counts as not shown, so the intent can still be approved — with
 * a warning — or refused.
 */
export const NFT_PREVIEW_WAIT_MS = 15_000;

/** What the browser has reported for each media item the preview rendered, keyed by the item. */
export type NftMediaDisplays = ReadonlyMap<NftMediaRef, NftMediaDisplayStatus>;

/** Where one media slot of a preview stands. */
type MediaPart = 'none' | 'loading' | 'shown' | 'unavailable';

/**
 * The document states in which nothing from the document is shown. A preview fetches
 * without asking, so `ask` never arises in one; were it to, nothing would be shown.
 */
const DOCUMENT_UNSHOWN: ReadonlySet<NftDocumentState> = new Set(['ask', 'unsupported', 'mismatch', 'invalid', 'error']);

export interface NftPreviewState {
  /**
   * Some content is not on screen yet: the metadata document is being fetched, or a
   * media item is being fetched or has not been displayed by its element.
   */
  readonly loading: boolean;
  /**
   * Some content will not be shown: it could not be fetched, failed its fingerprint, is
   * not a document, is of a type this wallet does not display, or its element failed.
   */
  readonly unavailable: boolean;
  /** The content's metadata document link, known before — and whether or not — it resolves. */
  readonly documentLink: NftLink | null;
}

/**
 * One media slot, inline or linked. It is shown only once its element reports the item
 * displayed: bytes can pass every check and still not decode. A link is watched through
 * the same query NftMediaView renders from, so it is fetched once.
 */
function useMediaPart(ref: NftMediaRef | null, displays: NftMediaDisplays): MediaPart {
  const link = ref?.kind === 'link' ? ref : null;
  // Exactly useNftMedia's derivation, so both watch the SAME query.
  const displayable = link !== null && mediaKindOf(link.media_type) !== null ? link : null;
  const url = displayable ? resolveLinkUrl(displayable.uri) : null;
  const query = useQuery(linkedMediaQuery(displayable, url));

  if (!ref) return 'none';
  if (mediaKindOf(ref.media_type) === null) return 'unavailable';
  if (link) {
    if (url === null) return 'unavailable';
    if (query.data === undefined) return query.isError ? 'unavailable' : 'loading';
    if (!query.data.verified) return 'unavailable';
  }
  const display = displays.get(ref);
  if (display === 'failed') return 'unavailable';
  return display === 'displayed' ? 'shown' : 'loading';
}

/**
 * Whether everything an NFT's preview shows is on screen yet (#785), and whether any
 * of it ended up not shown. Watches the metadata document, and the image and animation
 * of whatever the preview shows — the resolved document's item, or the content itself —
 * through the queries the preview renders from, so nothing is fetched a second time,
 * and through `displays`, what each media element reported.
 *
 * Everything is fetched without asking, as the preview itself does (NftLinkFetchContext
 * `automatic`): the content comes from the dApp asking for the mint. The document's
 * policy is passed explicitly because this runs in the dialog that renders that context.
 */
export function useNftPreviewState(content: NftContent | null, displays: NftMediaDisplays): NftPreviewState {
  const documentLink = nftDocumentLinkOf(content);
  const { document, state: documentState } = useNftDocument(documentLink, 'automatic');
  // A document link shows no media of its own: until its document resolves there is nothing more to watch.
  const shown = documentLink ? document : content;
  const image = useMediaPart(shown ? nftContentMediaRef(shown) : null, displays);
  const animation = useMediaPart(shown?.kind === 'metadata' ? shown.animation_url : null, displays);
  const parts = [image, animation];

  return {
    loading: documentState === 'loading' || parts.includes('loading'),
    unavailable: DOCUMENT_UNSHOWN.has(documentState) || parts.includes('unavailable'),
    documentLink,
  };
}
