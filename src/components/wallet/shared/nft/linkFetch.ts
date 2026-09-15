import { createContext } from 'react';

/**
 * When a view fetches an NFT link whose host the minter chose (#785).
 *
 * - `on-request`: only once the user asks. The request shows that host the viewer's
 *   IP address and when they looked, and a sender can give every token it sends a
 *   link of its own, so opening the wallet must not answer for the user.
 * - `automatic`: as soon as the link is shown. Only the mint dialog uses it: its
 *   content comes from the dApp asking for the mint, which already has the user's IP
 *   address, and Mint waits for the preview.
 *
 * A link through this wallet's own gateways (`ipfs://`, `ar://`) is fetched as soon
 * as it is shown under either.
 */
export type NftLinkFetchPolicy = 'on-request' | 'automatic';

export const NftLinkFetchContext = createContext<NftLinkFetchPolicy>('on-request');
