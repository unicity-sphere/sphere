import type { CoinlessToken, NftMediaRef, NftView } from '@unicitylabs/sphere-sdk';
import { truncateId } from '../../../../utils/identifiers';

/**
 * The one display name for a coinless holding. The NFT's own metadata wins —
 * it names this instance — then the registry's name for its class, then the
 * class id itself. An unrecognised type still gets a title: the registry
 * supplies a name, never permission to show the token.
 */
export function nftTitle(token: CoinlessToken, nft?: NftView): string {
  if (nft?.content.kind === 'metadata' && nft.content.name) return nft.content.name;
  if (token.name) return token.name;
  return token.tokenType ? `Type ${token.tokenType.slice(0, 8)}…` : 'Unknown type';
}

/** The media a list row previews: metadata's `image`, or a bare media/link NFT itself. */
export function nftThumbnailRef(nft?: NftView): NftMediaRef | null {
  if (!nft) return null;
  const { content } = nft;
  return content.kind === 'metadata' ? content.image : content;
}

/** A creator key (66-hex chain pubkey) shortened for display. */
export function shortPubkey(hex: string): string {
  return truncateId(hex);
}
