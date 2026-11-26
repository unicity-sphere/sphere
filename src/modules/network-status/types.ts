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

/** A block as the inspector shows it: everything `get_block` returns that the page reads. */
export interface BlockDetail {
  /** The shard that was queried. v2 gateways answer `shardId: 0` on every block, so the answer's own field is useless. */
  readonly shardId: string;
  readonly index: number;
  /** Aggregator clock, milliseconds. */
  readonly createdAt: number;
  readonly rootHash: string;
  readonly previousBlockHash: string;
  /** Requests certified in this block, aggregated ones included: can exceed the number of records. */
  readonly totalCommitments: number;
  /** `rootHash === previousBlockHash`: the round changed nothing, so it has no records. */
  readonly empty: boolean;
  /** The block's unicity certificate, hex CBOR; `null` when the answer carries none. */
  readonly certificateHex: string | null;
}

/** `certificationData.ownerPredicate` of a record: the lock the state was certified under. */
export interface OwnerPredicate {
  readonly engine: number;
  /** base64 */
  readonly code: string;
  /** base64 */
  readonly params: string;
}

/** One leaf a block inserted (`get_block_records`), as the block reports it. */
export interface AggregatorRecord {
  readonly stateId: string;
  readonly transactionHash: string;
  readonly sourceStateHash: string;
  readonly ownerPredicate: OwnerPredicate;
  /** hex */
  readonly witness: string;
  /** Request deadline, unix seconds; `null` when the request set none. */
  readonly expiresAt: number | null;
  /** Reference time of the round the leaf was created in, unix seconds. */
  readonly referenceTime: number;
  readonly aggregateRequestCount: number;
  readonly leafIndex: number;
  /** milliseconds */
  readonly createdAt: number;
  readonly blockNumber: number;
}
