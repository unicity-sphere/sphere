/** What a block's unicity certificate says about the round that certified it. */
export interface SealInfo {
  /** `UnicitySeal.rootChainRoundNumber`: the root-chain round that sealed this block. */
  readonly rootRound: number;
  /** `UnicitySeal.timestamp`: root-chain clock, unix SECONDS. */
  readonly certifiedAt: number;
  /** Node ids of the roots whose signature is in the seal, sorted. */
  readonly signers: readonly string[];
}

/** One shard block, reduced to what the page shows. */
export interface RoundSummary {
  /** The shard's `/config/shards` prefix, e.g. `"010"`. */
  readonly shardId: string;
  /** The shard's block number. */
  readonly index: number;
  /** The block's `createdAt`: aggregator clock, milliseconds. */
  readonly createdAt: number;
  readonly totalCommitments: number;
  readonly rootHash: string;
  /** `rootHash === previousBlockHash`: the round changed nothing. */
  readonly empty: boolean;
  /** `null` when the certificate could not be read. */
  readonly seal: SealInfo | null;
}

/** Where the page reads from. */
export type FeedSource = 'status-endpoint' | 'polling';
