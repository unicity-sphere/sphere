/**
 * Plain reports of what the block inspector checked. The UI renders these and
 * never touches SDK types.
 *
 * Every report is exactly one of three outcomes:
 * - `verified`: every check ran and passed.
 * - `failed`: a check ran and found a definite mismatch.
 * - `unchecked`: nothing could be concluded (an error, an epoch this page has no
 *   keys for, an answer from a root older than the block).
 *
 * Nothing is reported `verified` unless it was actually checked.
 */
export type Outcome = 'verified' | 'failed' | 'unchecked';

export interface Check {
  readonly label: string;
  readonly result: 'pass' | 'fail' | 'skipped';
  readonly detail?: string;
}

/** What a unicity certificate says, decoded for display. */
export interface CertificateSummary {
  readonly networkId: number;
  /** `UnicitySeal.rootChainRoundNumber` */
  readonly rootRound: number;
  /** The validator epoch whose roots signed the seal. */
  readonly epoch: number;
  /** The shard the certificate is for, as a `/config/shards` binary prefix. */
  readonly shardId: string;
  /** `InputRecord.roundNumber`: the shard's block number. */
  readonly shardRound: number;
  /** `InputRecord.hash`: the shard root the certificate certifies, hex. */
  readonly inputRecordHash: string;
  readonly previousHash: string | null;
  readonly sealHash: string;
  /** `UnicitySeal.timestamp`: root-chain clock, whole unix SECONDS. */
  readonly sealedAt: number;
  /** Node ids of the roots whose signature is in the seal, sorted. */
  readonly signers: readonly string[];
}

export interface CertificateReport {
  readonly outcome: Outcome;
  /** Why it failed or could not be checked; `null` when verified. */
  readonly reason: string | null;
  readonly checks: readonly Check[];
  /** `null` when the certificate could not be decoded at all. */
  readonly summary: CertificateSummary | null;
}

/** An inclusion certificate's path: one sibling hash per depth where the tree branched. */
export interface PathView {
  readonly depths: readonly number[];
  readonly siblings: readonly string[];
}

export interface ProofReport {
  readonly outcome: Outcome;
  readonly reason: string | null;
  readonly checks: readonly Check[];
  /** `null` when the answer could not be decoded. */
  readonly kind: 'inclusion' | 'non-inclusion' | null;
  /** The block whose root the gateway answered against: the latest one, not the record's. */
  readonly answeredAtBlock: number | null;
  /** The certificate that signs that root. */
  readonly certificate: CertificateReport | null;
  readonly path: PathView | null;
}

/** The trust base this page verifies with. */
export interface TrustBaseInfo {
  readonly networkId: number;
  readonly epoch: number;
  readonly nodeIds: readonly string[];
  readonly quorum: number;
}
