import { createContext } from 'react';
import type { NftMediaRef } from '@unicitylabs/sphere-sdk';

/** What the browser made of an NFT media element: it displayed the item, or the element failed. */
export type NftMediaDisplayStatus = 'displayed' | 'failed';

export type NftMediaDisplayReporter = (media: NftMediaRef, status: NftMediaDisplayStatus) => void;

/**
 * Where NftMediaView reports what the browser made of each item it renders (#785),
 * keyed by the item itself: bytes can pass every check and still not decode, and
 * only the element knows. Only a view that acts on it provides one — the mint
 * dialog, which offers Mint once the user can see what is minted. Everywhere else it
 * is null, and nothing is reported.
 */
export const NftMediaDisplayContext = createContext<NftMediaDisplayReporter | null>(null);
