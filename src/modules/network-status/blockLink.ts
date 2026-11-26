import type { NetworkType } from '@unicitylabs/sphere-sdk';

/**
 * The block the inspector shows, as URL state: `?network=testnet2&shard=000&block=8464891`.
 *
 * A block number means nothing without its network and shard, so a link always
 * carries all three, and a link naming a network this deployment does not offer
 * is refused rather than opened on another network, where the same number is a
 * different block.
 */
export interface BlockLink {
  readonly network: NetworkType;
  readonly shardId: string;
  readonly index: number;
}

export type BlockLinkState =
  | { readonly kind: 'none' }
  | { readonly kind: 'open'; readonly link: BlockLink }
  | { readonly kind: 'invalid'; readonly reason: string };

const KNOWN: readonly NetworkType[] = ['testnet2', 'mainnet'];
/** `/config/shards` ids: v2 binary prefixes, or legacy numeric ids. */
const SHARD_ID = /^(?:[01]{1,16}|\d{1,6})$/;
const BLOCK_NUMBER = /^\d{1,16}$/;

/** `testnet` is the legacy spelling of testnet2 (same gateway, same trust base); anything else unknown is `null`. */
export function canonicalNetwork(raw: string | null): NetworkType | null {
  if (raw === 'testnet') return 'testnet2';
  return KNOWN.find((n) => n === raw) ?? null;
}

export function parseBlockLink(params: URLSearchParams, offered: readonly NetworkType[], fallback: NetworkType): BlockLinkState {
  const shard = params.get('shard');
  const block = params.get('block');
  if (shard === null && block === null) return { kind: 'none' };

  const rawNetwork = params.get('network');
  const network = rawNetwork === null ? fallback : canonicalNetwork(rawNetwork);
  if (network === null || !offered.includes(network)) {
    return { kind: 'invalid', reason: `This link is for ${rawNetwork ?? 'an unknown network'}, which this deployment doesn't offer.` };
  }
  if (shard === null || !SHARD_ID.test(shard)) {
    return { kind: 'invalid', reason: 'This link does not name a valid shard.' };
  }
  const index = block !== null && BLOCK_NUMBER.test(block) ? Number(block) : NaN;
  if (!Number.isSafeInteger(index)) {
    return { kind: 'invalid', reason: 'This link does not name a valid block number.' };
  }
  return { kind: 'open', link: { network, shardId: shard, index } };
}

/** A copy of `params` that opens `link`, or closes the inspector when `link` is `null`. */
export function writeBlockLink(params: URLSearchParams, link: BlockLink | null): URLSearchParams {
  const next = new URLSearchParams(params);
  if (link === null) {
    next.delete('shard');
    next.delete('block');
    return next;
  }
  next.set('network', link.network);
  next.set('shard', link.shardId);
  next.set('block', String(link.index));
  return next;
}

/**
 * A copy of `params` showing `network`. The open block, if any, is closed: its
 * number belongs to the network being left. The app's own network is the
 * default, so it is not written.
 */
export function withNetwork(params: URLSearchParams, network: NetworkType, appNetwork: NetworkType): URLSearchParams {
  const next = writeBlockLink(params, null);
  if (network === appNetwork) next.delete('network');
  else next.set('network', network);
  return next;
}
