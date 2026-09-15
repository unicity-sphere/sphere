import type { CoinlessToken, NftContent, NftMediaRef } from '@unicitylabs/sphere-sdk';
import { truncateId } from '../../../../utils/identifiers';

/**
 * The one display name for a coinless holding. The NFT's own metadata wins —
 * it names this instance — then the registry's name for its class, then the
 * class id itself. An unrecognised type still gets a title: the registry
 * supplies a name, never permission to show the token.
 *
 * `content` is what the NFT shows: its reading's own, or the item of the
 * metadata document that content links to, once resolved (useResolvedNftContent).
 */
export function nftTitle(token: CoinlessToken, content?: NftContent | null): string {
  if (content?.kind === 'metadata' && content.name) return content.name;
  if (token.name) return token.name;
  return token.tokenType ? `Type ${token.tokenType.slice(0, 8)}…` : 'Unknown type';
}

/** The media an NFT's content shows first: metadata's `image`, or a bare media/link NFT itself. */
export function nftContentMediaRef(content: NftContent): NftMediaRef | null {
  return content.kind === 'metadata' ? content.image : content;
}

/**
 * The media a list row previews: metadata's `image`, or a bare media/link NFT itself.
 * A metadata document link not (yet) resolved is previewed as itself, which shows no
 * file: its media type is on no allowlist.
 */
export function nftThumbnailRef(content?: NftContent | null): NftMediaRef | null {
  return content ? nftContentMediaRef(content) : null;
}

/** A creator key (66-hex chain pubkey) shortened for display. */
export function shortPubkey(hex: string): string {
  return truncateId(hex);
}
