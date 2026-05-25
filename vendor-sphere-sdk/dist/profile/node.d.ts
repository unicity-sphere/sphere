import { SigningService } from '@unicitylabs/state-transition-sdk/lib/sign/SigningService.js';
import { AggregatorClient } from '@unicitylabs/state-transition-sdk/lib/api/AggregatorClient.js';
import { RootTrustBase } from '@unicitylabs/state-transition-sdk/lib/bft/RootTrustBase.js';

/**
 * Outbox entry for pending transfers
 */
interface OutboxEntry {
    id: string;
    status: 'pending' | 'submitted' | 'confirmed' | 'delivered' | 'failed';
    sourceTokenId: string;
    salt: string;
    commitmentJson: string;
    recipientPubkey: string;
    recipientNametag?: string;
    amount: string;
    createdAt: number;
    updatedAt: number;
    error?: string;
    retryCount?: number;
}

/**
 * Oracle Provider Interface
 * Platform-independent Unicity oracle abstraction
 *
 * The oracle is a trusted third-party service that provides verifiable truth
 * about the state of tokens in the Unicity network. It aggregates state
 * transitions into rounds and provides inclusion proofs that cryptographically
 * verify token ownership and transfers.
 */

/**
 * Unicity state transition oracle provider
 *
 * The oracle serves as the source of truth for:
 * - Token state validation (spent/unspent)
 * - State transition inclusion proofs
 * - Round-based commitment aggregation
 */
interface OracleProvider extends BaseProvider {
    /**
     * Initialize with trust base
     */
    initialize(trustBase?: unknown): Promise<void>;
    /**
     * Submit transfer commitment
     */
    submitCommitment(commitment: TransferCommitment): Promise<SubmitResult>;
    /**
     * Get inclusion proof for a request
     */
    getProof(requestId: string): Promise<InclusionProof | null>;
    /**
     * Wait for inclusion proof with polling
     */
    waitForProof(requestId: string, options?: WaitOptions): Promise<InclusionProof>;
    /**
     * Validate token against aggregator
     */
    validateToken(tokenData: unknown): Promise<ValidationResult>;
    /**
     * Check if a state has been spent by the owner identified by `publicKey`.
     *
     * Implemented via `get_inclusion_proof(requestId)` where
     * `requestId = RequestId.create(publicKey, stateHash)`. The aggregator
     * indexes commitments by requestId (= hash of pubkey+stateHash), so we
     * cannot ask "has anyone spent this state" without knowing whose
     * predicate guards it — for normal flows this is the wallet's own
     * `chainPubkey` because the wallet owns the state it's probing.
     *
     * Spent iff the returned inclusion proof carries a non-null
     * `transactionHash` (path-included). A path-non-inclusion proof
     * (`transactionHash: null`) means no commitment exists → unspent.
     *
     * **Issue #243 — historical broken contract**: the prior implementation
     * called a non-existent `isSpent` JSON-RPC method with a single
     * `stateHash` parameter. The canonical aggregator (`aggregator-go`)
     * never exposed that method; it returns HTTP 400 ("requests must
     * include either requestId or shardId") at the validation layer.
     * Callers (the spent-state rescan worker, orphan recovery) saw a
     * cascade of failures, bumped their per-token backoff counters, and
     * the noise blocked `manual-test-full-recovery.sh` at §C.2. The fix
     * threads `publicKey` through and uses the canonical inclusion-proof
     * RPC.
     *
     * **Throws on RPC failure** — implementations MUST NOT fail-open
     * (returning `false` on a network/transport error opens a double-
     * spend window). On any RPC / network failure the call MUST throw
     * (typically a `SphereError` with code `'AGGREGATOR_ERROR'`). The
     * boolean return value carries cryptographically-verified state
     * only:
     *   - `true`  — aggregator returned a path-inclusion proof.
     *   - `false` — aggregator returned a path-non-inclusion proof.
     *
     * Callers (notably the disposition-engine `[E]` hook) treat a
     * throw as STRUCTURAL_INVALID per §5.3 [A] and re-evaluate when a
     * later bundle arrives.
     *
     * @param publicKey Hex-encoded compressed secp256k1 owner pubkey
     *                  (66 chars, "02"/"03" prefix). For wallet-local
     *                  scans this is `Identity.chainPubkey`.
     * @param stateHash Hex-encoded state hash imprint (typically 68 chars
     *                  including the algorithm prefix; the SDK accepts the
     *                  canonical imprint form).
     */
    isSpent(publicKey: string, stateHash: string): Promise<boolean>;
    /**
     * Get token state
     */
    getTokenState(tokenId: string): Promise<TokenState | null>;
    /**
     * Get current round number
     */
    getCurrentRound(): Promise<number>;
    /**
     * Mint new tokens (for faucet/testing)
     */
    mint?(params: MintParams): Promise<MintResult>;
    /**
     * Get underlying StateTransitionClient (if available)
     * Used for advanced SDK operations like commitment creation
     */
    getStateTransitionClient?(): unknown;
    /**
     * Get underlying AggregatorClient (if available)
     * Used for direct aggregator API access
     */
    getAggregatorClient?(): unknown;
    /**
     * Get the bundled RootTrustBase (if available).
     *
     * Pointer-layer (H6, SPEC §8.4.2) requires the shared trust base consumed
     * by L4/PaymentsModule to be reused rather than a parallel trust-base
     * provider — see PROFILE-AGGREGATOR-POINTER-SPEC.md §8.4.
     */
    getRootTrustBase?(): unknown;
    /**
     * Wait for inclusion proof using SDK commitment (if available)
     * Used for transfer flows with SDK TransferCommitment
     */
    waitForProofSdk?(commitment: unknown, signal?: AbortSignal): Promise<unknown>;
    /**
     * Wave G.3: cryptographic verification of an inclusion proof.
     *
     * Used by `uxf/token-join.ts` Rule 4 enrichment to gate the
     * `tryEnrichLongestWithProofs` path: an attacker-supplied proof
     * element that's structurally well-formed but cryptographically
     * invalid (forged authenticator signature, unknown SMT root)
     * would otherwise be lifted into a synthetic token-root and
     * propagated as if it were genuine. The gate calls this method
     * once per candidate proof in the merge pool and only adopts a
     * proof element whose `(authenticator, smtPath, transactionHash,
     * unicityCertificate)` tuple verifies against the bundled
     * `RootTrustBase`.
     *
     * Implementations construct the SDK `InclusionProof` from the
     * supplied JSON shape via `InclusionProof.fromJSON()`, then call
     * `proof.verify(trustBase, requestId)`. Returns true iff the
     * status is `OK`. Returns false on PATH_NOT_INCLUDED, PATH_INVALID,
     * NOT_AUTHENTICATED, or any thrown error during reconstruction —
     * fail-closed so a buggy proof can never be accepted.
     *
     * `requestId` is the SHA-256(signingPubKey || stateHashImprint)
     * tuple expected by the aggregator; for proof elements where the
     * caller cannot reconstruct it (because state-hash isn't carried
     * in the proof element itself), pass `null` and the implementation
     * falls back to deriving it from the proof's authenticator if
     * possible — or returns false if it can't be safely derived.
     */
    verifyInclusionProof?(input: {
        /**
         * The SDK-shaped JSON for the inclusion proof. Built via
         * `assembleInclusionProof()` from the UXF pool, so the shape is
         * already what `InclusionProof.fromJSON()` accepts.
         */
        proofJson: unknown;
        /**
         * Wave I.6: the SDK-encoded DataHash IMPRINT hex (68 chars =
         * 2-byte algorithm prefix + 32-byte digest, as emitted by
         * `DataHash.toJSON()` and stored verbatim in the UXF pool's
         * `inclusion-proof.content.transactionHash`). NOT the bare 64-
         * char content-hash digest. Implementations compare this byte-
         * exactly against the inclusion-proof's own internal
         * `transactionHash.imprint`; mismatch returns false (replay-
         * grafting defense). Length must equal 68; values of other
         * lengths are rejected as malformed input.
         */
        transactionHash: string;
        /**
         * Wave I.7: optional canonical proof identifier — typically the
         * UXF pool ContentHash of the inclusion-proof element (64-char
         * hex). When supplied, the implementation MAY include this in
         * its result-cache key alongside `transactionHash` so two
         * different proofs that happen to attest the same tx hash do
         * not collide in the cache (forged-then-genuine denial-of-
         * verification scenario). When omitted, callers accept the
         * coarser cache keying.
         */
        proofHash?: string;
    }): Promise<boolean>;
}
interface TransferCommitment {
    /** Source token (SDK format) */
    sourceToken: unknown;
    /** Recipient address/predicate */
    recipient: string;
    /** Random salt (non-reproducible) */
    salt: Uint8Array;
    /** Optional additional data */
    data?: unknown;
}
interface SubmitResult {
    success: boolean;
    requestId?: string;
    error?: string;
    timestamp: number;
}
interface InclusionProof {
    requestId: string;
    roundNumber: number;
    proof: unknown;
    timestamp: number;
}
interface WaitOptions {
    /** Timeout in ms (default: 30000) */
    timeout?: number;
    /** Poll interval in ms (default: 1000) */
    pollInterval?: number;
    /** Callback on each poll attempt */
    onPoll?: (attempt: number) => void;
}
interface ValidationResult {
    valid: boolean;
    spent: boolean;
    error?: string;
    stateHash?: string;
}
interface TokenState {
    tokenId: string;
    stateHash: string;
    spent: boolean;
    roundNumber?: number;
    lastUpdated: number;
}
interface MintParams {
    coinId: string;
    amount: string;
    recipientAddress: string;
    recipientPubkey?: string;
}
interface MintResult {
    success: boolean;
    requestId?: string;
    tokenId?: string;
    error?: string;
}

/**
 * 32-byte SHA-256 content hash, hex-encoded (64 lowercase characters).
 * This is the universal address for any element in the pool.
 */
type ContentHash = string & {
    readonly __brand: 'ContentHash';
};

/**
 * Token Manifest Derivation
 *
 * Derives the **wallet-level token manifest** from a joined UxfPackage.
 *
 * Per PROFILE-ARCHITECTURE.md §10.2.2, two kinds of "manifest" exist:
 *
 *  - **Bundle manifest** (package-level, STORED in CAR) — a flat
 *    `tokenId → rootHash` map that describes the DAG shape of a single
 *    bundle. Defined in UXF SPECIFICATION.md §5.4 and lives as
 *    `UxfManifest` in `uxf/types.ts`.
 *
 *  - **Token manifest** (wallet-level, DERIVED, never stored) — carries
 *    the same mapping but augmented with per-token **status** derived
 *    from chain validation, conflict detection, and (eventually) oracle
 *    spent-checks. This module produces that artifact.
 *
 * This initial implementation provides the structural subset of the
 * algorithm in §10.6: chain integrity + conflict detection + pending
 * detection. Oracle-based status (`spent`, `double-spend`, etc.) is a
 * future enhancement that layers on top by post-processing these
 * entries against the aggregator.
 *
 * The separation matters: the structural pass is synchronous and pure;
 * the oracle pass is async and network-dependent. Callers that need
 * only the structural view (e.g. UI that doesn't want to wait for
 * oracle latency) can use this directly.
 *
 * @module profile/token-manifest
 */

/**
 * Token status categories.
 *
 * - `valid`        — single chain, every transaction has an inclusion proof.
 * - `pending`      — single chain, last transaction has no proof yet.
 * - `conflicting`  — two or more divergent instance chains exist for this
 *                    token (sibling heads in the instance-chain index).
 *                    Oracle resolution is required to determine the winner.
 * - `invalid`      — chain is structurally broken (not yet detected in
 *                    this implementation; reserved for future use).
 * - `pending-conflicting` (Wave 3 steelman) — a conflicting head arrived
 *                    while the existing entry was already in `pending`
 *                    state with an in-flight finalization worker tracking
 *                    its queue entries. The fresh CONFLICTING write
 *                    cannot blindly clobber the pending state because
 *                    the worker would continue finalizing the previous
 *                    chain (rootHash X) while the manifest now declares
 *                    a different head (rootHash Y) authoritative — when
 *                    the worker's proofs land, it would write against
 *                    a stale view. `pending-conflicting` defers the
 *                    full conflict-merge until the worker drains its
 *                    queue (or its caller invalidates the entries
 *                    explicitly); downstream conflict-merger code
 *                    treats `pending-conflicting` like `conflicting`
 *                    for read purposes (both heads are surfaced) but
 *                    the manifest writer / worker reconciliation path
 *                    can recognize the in-flight finalization and avoid
 *                    the data race.
 */
type TokenManifestStatus = 'valid' | 'pending' | 'conflicting' | 'pending-conflicting' | 'invalid';
interface TokenManifestEntry {
    /**
     * Bundle-manifest root hash for this token (the genesis / token-root
     * content hash from the UXF manifest). Used for DAG traversal.
     */
    readonly rootHash: ContentHash;
    /** Status derived from chain integrity and conflict analysis. */
    readonly status: TokenManifestStatus;
    /**
     * When `status === 'conflicting'`, the set of distinct chain-head
     * hashes found in the instance-chain index for this token. Length
     * is always ≥ 2 when populated. Ordering is sorted ascending for
     * determinism across platforms.
     *
     * Without oracle data we cannot distinguish winner from loser, so
     * all heads are listed symmetrically. The oracle-integration layer
     * will downgrade this field to the "losers" once the authoritative
     * winner is known.
     */
    readonly conflictingHeads?: readonly ContentHash[];
    /**
     * Optional human-readable reason when `status === 'invalid'`.
     * Reserved for future use by the oracle-integration layer. PA §10.11
     * narrows this to a `DispositionReason` from `types/disposition.ts`
     * — typed as `string` here to avoid a circular module dependency.
     */
    readonly invalidReason?: string;
    /**
     * Coin-split parent reference for §6.1.1 cascade detection. Set by the
     * sender-side splitter when a coin token is minted as the change /
     * recipient output of a `TokenSplitBuilder` operation. Absent on
     * non-split tokens and on every NFT (NFTs are not splittable).
     */
    readonly splitParent?: string;
    /**
     * Set-OR back-reference to the `_audit` collection record(s) this
     * manifest entry was promoted from. Each element is an audit record
     * key of the form `${addr}.audit.${tokenId}.${observedTokenContentHash}`.
     *
     * **Array form** (per §5.4 normative array-merge rule, round-9 user
     * clarification): widening from `string | undefined` to
     * `readonly string[] | undefined` allows multiple audit records to
     * promote to the same canonical manifest entry — divergent audit
     * histories across replicas legitimately produce a multi-entry array
     * and ALL entries are preserved on merge for forensic traceability.
     * Single-element arrays are used when there is only one promotion.
     */
    readonly audit_promoted_from?: readonly string[];
    /**
     * Lamport logical clock (§7.1 invariants). Incremented on every local
     * write per `Lamport.bumpFor`. On §5.3 [D] merge, the post-merge
     * Lamport is `max(left.lamport, right.lamport)` (`Lamport.merge`).
     * Optional for migration safety — entries written before T.3.C did
     * not carry a Lamport; readers treat absent as 0.
     */
    readonly lamport?: number;
    /**
     * Wall-clock millisecond timestamp of the most-recent inclusion-proof
     * refresh that touched this entry (per §6.3 most-recent-proof rule).
     * Used by the §5.3 [D] grafting path to prefer the side with the
     * fresher proof material when both sides are otherwise identical.
     */
    readonly lastProofRefreshAt?: number;
    /**
     * CIDv1 (base32) of the bundle whose §5.3 walk produced this manifest
     * entry. Stored for forensic provenance and as the lex-min tie-break
     * input to `compareCidV1Binary` (per §5.3 [D-conflict]).
     */
    readonly bundleCid?: string;
    /**
     * Sender's transport pubkey (64-hex secp256k1 x-coordinate from the
     * Nostr signing key) of the bundle that produced this entry. Forensic
     * peer attribution; mirrors the `_invalid` / `_audit` records.
     */
    readonly senderTransportPubkey?: string;
    /**
     * `true` iff this entry has been re-validated via an operator
     * `importInclusionProof({ allowInvalidOverride: true })` call. Sticky:
     * once set on any replica, the merged entry retains it (set-OR per §7.1).
     */
    readonly overrideApplied?: boolean;
    /**
     * Wall-clock millisecond timestamp of the most-recent override write
     * (`Date.now()` at the call site). When two replicas independently apply
     * the override, the merged entry takes the later timestamp (max-merge —
     * mirrors the `lastProofRefreshAt` rule).
     */
    readonly overrideAppliedAt?: number;
    /**
     * Operator pubkey (hex; the wallet's chain pubkey at override time) that
     * authored the override. When two replicas independently apply the
     * override, the merged entry preserves the lex-min pubkey (deterministic
     * across replicas without requiring a coordinator). Optional — callers
     * that do not pass an operator pubkey leave the field absent.
     */
    readonly overrideAppliedBy?: string;
}
/**
 * A wallet-level token manifest: `tokenId → TokenManifestEntry`.
 */
type TokenManifest = Map<string, TokenManifestEntry>;

/**
 * Lamport logical clock — UXF Transfer Protocol §7.1 invariants.
 *
 * Used by the outbox CRDT (`UxfTransferOutboxEntry.lamport`) and the
 * manifest writers to obtain deterministic merge tie-breaks across
 * eventually-consistent OrbitDB replicas (e.g. desktop wallet vs.
 * browser wallet for the same identity).
 *
 * **Invariants (normative)** — see `docs/uxf/UXF-TRANSFER-PROTOCOL.md` §7.1:
 * - On every local write to an entry, the writer reads the current
 *   `lamport` value AND the maximum `lamport` of any concurrently-observed
 *   remote replica's view of the same entry, then writes
 *   `lamport := max(local, observedRemotes) + 1`.
 * - On merge, `lamport := max(replicaA.lamport, replicaB.lamport)`.
 *
 * **Bounds defense (W39)**: a malicious or buggy replica could publish a
 * Lamport like `2^53` to force every honest replica past the JS
 * safe-integer range, breaking comparisons. We reject any observed remote
 * Lamport `> 2 × max(localKnownLamports, 1)` with `LAMPORT_BOUND_VIOLATION`.
 * The factor-of-two slack accommodates legitimate divergence (e.g. one
 * replica that has been offline writing locally for some time) while
 * ruling out runaway values. The `Math.max(_, 1)` floor lets boot accept
 * a reasonable first-remote Lamport (e.g. observing remote=1 from
 * local=0 is fine).
 *
 * **Per-instance scoping**: this class holds NO module-level state. Each
 * `Sphere` instance constructs its own `Lamport` so that destroy-recreate
 * cycles do not bleed Lamport state across wallet incarnations.
 */
/**
 * Per-replica Lamport clock. Single-threaded (JS event-loop) usage only;
 * the current value is mutated synchronously inside `bumpFor`.
 */
declare class Lamport {
    /** The most-recently written Lamport value for the entry this clock
     *  tracks. Mutated by `bumpFor`; readable via `getCurrent`. */
    private current;
    /**
     * @param initial Starting Lamport value. Default `0`. Pass the value
     *   read from storage when re-hydrating a clock for an existing entry.
     */
    constructor(initial?: number);
    /**
     * CRDT merge rule: `max(a, b)`. Pure / static.
     */
    static merge(a: number, b: number): number;
    /**
     * Compute the Lamport value for the next local write, given the set of
     * remote Lamport values currently observed for the same entry. Updates
     * this clock's internal `current` state and returns the new value.
     *
     * Behaviour:
     * - `result = max(this.current, max(observedRemotes, 0)) + 1`
     * - Empty `observedRemotes` is allowed (`getCurrent() + 1`).
     * - Throws `LAMPORT_BOUND_VIOLATION` if any observed value is
     *   `> 2 × max(this.current, 1)` — the W39 bounds defense.
     */
    bumpFor(observedRemotes: ReadonlyArray<number>): number;
    /**
     * Returns the current Lamport value without mutating it. Useful for
     * passing to merge / serialization paths.
     */
    getCurrent(): number;
    /**
     * Rehydrate the clock from a set of TRUSTED local-store observations
     * (e.g. values read from our own previously-persisted entries on cold
     * restart). Sets `this.current = max(this.current, ...observed)`.
     *
     * **Distinction from {@link bumpFor}:** `bumpFor` treats inputs as
     * concurrent remote replicas subject to the W39 bounds defense
     * (`> 2 × max(this.current, 1)` rejects). That defense applies when
     * an OrbitDB replication channel could deliver values from untrusted
     * peers. It does NOT apply when a writer reads its OWN prior local
     * writes from durable storage on restart — those values are trusted
     * (they had to pass `bumpFor` when written) and may legitimately
     * exceed `2 × current=0`.
     *
     * **Why this method exists:** writers (e.g. {@link OutboxWriter},
     * {@link SentLedgerWriter}) prefix-scan their keyspace at write
     * time and feed every observed entry's `lamport` to `bumpFor`. On
     * cold restart with N≥3 prior writes the clock's `current` resets
     * to 0; the bounds defense then rejects every observation `> 2`.
     * Call `rehydrate(observed)` BEFORE the first `bumpFor` of each
     * write so the clock absorbs the prior state without bounds-checking
     * it.
     *
     * **Trust requirement:** caller MUST be passing values from a
     * locally-controlled store (the same OrbitDB the writer owns, AFTER
     * tombstone filtering / discriminator filtering). Do NOT call this
     * with values from a foreign-replica gossip channel — that's
     * `bumpFor`'s job.
     *
     * No-op when `observed` is empty.
     */
    rehydrate(observed: ReadonlyArray<number>): void;
}

/**
 * UXF Inter-Wallet Transfer — DispositionWriter (T.3.C)
 *
 * Given a {@link DispositionRecord} produced by the §5.3 decision-matrix
 * walker (T.3.B.2) and an address, route the record to the appropriate
 * OrbitDB collection per §5.4:
 *
 *  - `VALID`       → `${addr}.manifest.${tokenId}` (active pool)
 *  - `PENDING`     → `${addr}.manifest.${tokenId}` (active pool, status='pending')
 *  - `CONFLICTING` → `${addr}.manifest.${tokenId}` (active pool, status='conflicting')
 *  - `INVALID`     → `${addr}.invalid.${tokenId}.${observedTokenContentHash}`
 *  - `AUDIT`       → `${addr}.audit.${tokenId}.${observedTokenContentHash}`
 *
 * **Why per-entry-key for `_invalid` / `_audit`** (per §5.4): the same
 * `tokenId` MAY appear in multiple bundles concurrently, each producing
 * a forensically-distinct record. The composite key
 * `(tokenId, observedTokenContentHash)` is the multi-rep disambiguator
 * mandated by §5.4 — two distinct bundle copies of the same `tokenId`
 * produce two distinct keys; identical bundle copies produce the same
 * key (idempotent re-write).
 *
 * **Why manifest goes through {@link ManifestStore}** (per §5.5 step 9):
 * the active-pool writer needs CAS semantics so concurrent §5.3 [D]
 * resolves don't clobber each other. The store handles the read-merge-
 * CAS-retry loop and the §5.4 metadata-preservation rules (`set-OR /
 * max-merge` of `audit_promoted_from`, `splitParent`, `conflictingHeads`,
 * `lamport`, `lastProofRefreshAt`).
 *
 * **C13: client-error reason path** (§6.1 `REQUEST_ID_MISMATCH`): the
 * writer routes to `_invalid` like any other hard-failure reason BUT
 * also emits a `transfer:operator-alert` SphereEvent so the wallet UI
 * / operator console can surface the alert prominently — this reason
 * indicates a CLIENT BUG (the SDK computed an inconsistent
 * `(requestId, sourceState, transactionHash)` tuple), not a sender
 * misbehavior.
 *
 * **Promotion flow** (per §5.4):
 *  - {@link DispositionWriter.promoteAuditEntry} sets
 *    `auditStatus: 'audit-promoted'` + `promotedToManifestRef` on the
 *    audit record (does NOT delete it — forensic retention).
 *  - The same call sets `audit_promoted_from: [auditKey, ...]` on the
 *    manifest entry (set-OR via {@link ManifestStore.addAuditPromotedFrom}).
 *
 * @module profile/disposition-writer
 *
 * @see UXF-TRANSFER-PROTOCOL §5.3 (decision matrix dispositions)
 * @see UXF-TRANSFER-PROTOCOL §5.4 (storage outcomes / multi-rep keys)
 * @see UXF-TRANSFER-PROTOCOL §6.1 (DispositionReason mapping)
 * @see PROFILE-ARCHITECTURE §10.11 (manifest entry shape)
 */

/**
 * Minimal abstraction over the per-entry-key writer/reader required by
 * {@link DispositionWriter} for `_invalid` and `_audit` records.
 *
 * Production implementations live in
 * `profile/disposition-storage-adapters.ts`:
 *   - `OrbitDbDispositionStorageAdapter` wraps a `ProfileDatabase`
 *     (the same OrbitDB key-value store the rest of the profile system
 *     uses) and reuses the encryption helpers from
 *     `profile/encryption.ts`.
 *   - `InMemoryDispositionStorageAdapter` provides a pure-memory
 *     implementation suitable for tests, CLI dev tools, and dev-mode
 *     wallets that don't need OrbitDB persistence.
 *
 * Tests inject an in-memory implementation that bypasses encryption.
 */
interface DispositionPerEntryStorage {
    /** Read a single record at the supplied key. Returns `undefined` if
     *  absent or if the value is a tombstone marker. */
    readRecord<T>(key: string): Promise<T | undefined>;
    /** Write a single record at the supplied key. Idempotent: writing the
     *  same value twice is a no-op apart from any per-write side effects
     *  in the storage backend (e.g. OpLog growth). */
    writeRecord<T>(key: string, value: T): Promise<void>;
    /**
     * Enumerate every key whose stored prefix begins with `keyPrefix`.
     *
     * Implementations MUST return a snapshot (changes after the call
     * began MAY or MAY NOT appear). Order is implementation-defined; the
     * caller sorts when determinism is required. Tombstoned keys MUST be
     * filtered out by the implementation so the importer / promoter sees
     * only live records.
     *
     * **maxResults cap.** Callers SHOULD pass `opts.maxResults` to bound
     * the enumeration. Implementations MUST honour the cap and stop
     * scanning once `maxResults` keys have been collected. The cap
     * defends against DoS scenarios where a hostile peer plants
     * millions of crafted prefix matches — without the cap a single
     * `_findInvalidEntry` call degrades into N sequential `readRecord`
     * round-trips. When `maxResults` is omitted, implementations
     * SHOULD impose a sane internal default (e.g. 1024) rather than
     * scanning unbounded.
     *
     * Used by the §6.3 stuck-PENDING importer to recover the
     * `_invalid` / `_audit` records keyed under
     * `${addr}.invalid.${tokenId}.${observedTokenContentHash}` /
     * `${addr}.audit.${tokenId}.${observedTokenContentHash}` when the
     * importer arrives without the observedTokenContentHash
     * disambiguator (the manifest entry was deleted on routing to
     * `_invalid`, so the importer cannot recover it from the manifest
     * cross-reference).
     */
    listKeysWithPrefix(keyPrefix: string, opts?: {
        readonly maxResults?: number;
    }): Promise<ReadonlyArray<string>>;
}

/**
 * Minimal per-entry-key storage contract. Production wires this to
 * `ProfileTokenStorageProvider`'s underlying OrbitDB adapter; tests
 * inject in-memory maps.
 *
 * The contract is intentionally narrow (read / write / list-by-prefix /
 * delete) — the wrapper does NOT need transactional semantics; replay
 * idempotency is delivered by the per-entry-key layout itself (writing
 * the same entry twice is a no-op at the storage layer).
 */
interface FinalizationQueueStorage {
    /**
     * Read the JSON-encoded value at `key`. Returns `null` if the key
     * is absent. Implementations MAY return either a parsed object or
     * the raw JSON string at the implementation's discretion — the
     * wrapper handles both via {@link parseQueueValue}.
     */
    readKey(key: string): Promise<string | null>;
    /**
     * Idempotent write. Overwrites any previous value (entry or
     * tombstone) at the same key.
     */
    writeKey(key: string, value: string): Promise<void>;
    /**
     * List every key starting with `prefix`. The returned map's keys
     * are the FULL keys (prefix + entryId); the values are the entryIds.
     * Implementations MUST observe the latest committed state — no
     * caching layered above the underlying CRDT view.
     *
     * Throws on listing failure — callers (the worker) treat a thrown
     * listing as fatal (matches the W15 / PA §10 behavior of the
     * provider's `listExistingPerEntryKeys`).
     */
    listByPrefix(prefix: string): Promise<Map<string, string>>;
    /**
     * Physically delete the key. Used ONLY by the GC sweep — the
     * worker's "remove queue entry" path goes through {@link writeKey}
     * with a tombstone marker, NOT through `deleteKey`.
     */
    deleteKey(key: string): Promise<void>;
}

/**
 * One per-entry snapshot record. `key` is the full OrbitDB key (typically
 * `${addressId}.{writerType}.{entryId}`). `encryptedValue` is the raw
 * bytes as stored — either AES-256-GCM ciphertext (when the writer was
 * constructed with an encryption key) or plaintext JSON (when not).
 *
 * The JOIN layer writes these bytes VERBATIM into the local OrbitDB when
 * the merge table says "remote wins" — it does not re-encrypt. This is
 * safe because:
 *   - sender + receiver share the same mnemonic, hence the same
 *     AES-256-GCM key, hence the receiver can decrypt the sender's
 *     ciphertext;
 *   - re-encrypting would change the ciphertext (fresh IV) and force
 *     subsequent snapshots to diverge byte-wise from this peer's
 *     persisted state — losing the determinism the lean-snapshot
 *     builder relies on.
 */
interface SnapshotEntry {
    readonly key: string;
    readonly encryptedValue: Uint8Array;
}
/**
 * Per-JOIN counters. Surfaced to the caller for logging + tests.
 */
interface JoinResult {
    /** Number of remote entries inspected (including malformed). */
    readonly entriesEvaluated: number;
    /** Number of remote live entries that landed locally. */
    readonly liveLanded: number;
    /** Number of remote tombstones that landed locally. */
    readonly tombstonesLanded: number;
    /** Number of remote entries where local won (no-op). */
    readonly localWon: number;
    /**
     * Number of remote entries the JOIN refused to apply — either:
     *   - `classifyRemote` returned `null` (decrypt/parse failed,
     *     out-of-bounds Lamport, unknown shape);
     *   - `writeRemote` threw (storage error during apply).
     *
     * These leave the local slot untouched. The next JOIN pass retries
     * naturally if the remote re-publishes a well-formed entry.
     */
    readonly remoteRejectedMalformed: number;
}
/**
 * Per-writer surface for full-profile-snapshot sync (Item #15).
 *
 * `snapshot()` returns every entry under the writer's prefix as raw
 * encrypted bytes — the lean-snapshot builder concatenates per-writer
 * snapshots into the published CAR.
 *
 * `joinSnapshot(remote)` applies the snapshot table against the writer's
 * local state. Implementations typically delegate to
 * {@link runJoinSnapshot} with a per-writer classifier and writer.
 */
interface ProfileSyncWriter {
    snapshot(): Promise<ReadonlyArray<SnapshotEntry>>;
    joinSnapshot(remote: ReadonlyArray<SnapshotEntry>): Promise<JoinResult>;
}

/**
 * UXF Inter-Wallet Transfer — Profile-backed adapters for the recipient-side
 * cross-restart safety net (G3 + G7 — no-token-loss).
 *
 * Two production-ready adapters live here:
 *
 *  1. {@link OrbitDbFinalizationQueueStorageAdapter} —
 *     {@link FinalizationQueueStorage} backed by a {@link ProfileDatabase}.
 *     Records are encrypted with the profile encryption key and stamped
 *     with `_schemaVersion: 'uxf-1'` so the legacy
 *     `ProfileTokenStorageProvider.applyPerEntryDiff` path does NOT
 *     tombstone them on every save() flush (G2/G3 same-prefix-coexistence
 *     contract). Tombstones written by `FinalizationQueue.remove()` carry
 *     the canonical `{tombstoned: true, deletedAt}` shape that the
 *     wrapper already understands.
 *
 *     Closes G3: pre-fix the recipient FinalizationQueue was a
 *     `Map<string,string>` shim instantiated by
 *     `buildDefaultFinalizationWorkerRecipient`; nothing persisted across
 *     `Sphere.destroy()` / restart. The §5.5 step 6 hard polling
 *     deadline anchored at `pollStartedAt` was therefore reset on every
 *     boot — the W26 cross-restart safety net was effectively inert.
 *
 *  2. {@link OrbitDbRecipientContextStorageAdapter} — typed CRUD over the
 *     two in-memory Maps `_recipientRequestContextMap` and
 *     `_recipientFinalizationContext` on `PaymentsModule`. The record
 *     shapes are the same `RequestContext` and
 *     `RecipientFinalizationContext` PaymentsModule already constructs;
 *     this adapter owns serialization + encryption + per-tokenId /
 *     per-requestId key composition.
 *
 *     Closes G7: pre-fix these two Maps were populated when an instant-
 *     mode token arrived but never persisted, so a Sphere that crashed
 *     between enqueue and finalization could not rebuild the context
 *     the dispositionWriter VALID branch needs to flip the local Token
 *     to `'confirmed'`.
 *
 * Key shapes (all under the per-address namespace):
 *   - finalization queue:      `${addr}.finalizationQueue.${entryId}`
 *   - request context:         `${addr}.recipientContext.request.${requestId}`
 *   - finalization context:    `${addr}.recipientContext.finalization.${tokenId}`
 *
 * Tombstones use the canonical `{tombstoned: true, deletedAt}` marker
 * so the same `applyPerEntryDiff` GC path that handles outbox
 * tombstones also reaps stale recipient-context tombstones once the
 * 30-day retention window elapses.
 *
 * @module profile/finalization-queue-storage-adapter
 */

/**
 * Construction options for {@link OrbitDbFinalizationQueueStorageAdapter}.
 */
interface OrbitDbFinalizationQueueStorageAdapterOptions {
    /** OrbitDB-backed profile database (same instance the rest of the profile uses). */
    readonly db: ProfileDatabase;
    /** AES-256 key derived from the wallet master key (see {@link deriveProfileEncryptionKey}). */
    readonly encryptionKey: Uint8Array;
    /**
     * Item #15 Phase C — fired after every successful local mutation
     * (writeKey / deleteKey). Also propagates to the {@link PrefixSyncWriter}
     * returned from {@link OrbitDbFinalizationQueueStorageAdapter.syncWriterFor}
     * so JOIN-applied remote changes signal dirty too. See
     * {@link OutboxWriter} for the broader semantics.
     */
    readonly notifyProfileDirty?: () => void;
}
/**
 * Profile-backed implementation of {@link FinalizationQueueStorage}.
 *
 * The wrapper writes JSON-encoded values; this adapter:
 *   1. Parses the value, stamps `_schemaVersion: 'uxf-1'` on live
 *      entries (tombstones are passed through unchanged so the
 *      `applyPerEntryDiff` GC path can reap them on the standard
 *      30-day retention window), re-serializes.
 *   2. Encrypts with the profile encryption key.
 *   3. Writes via `db.put`.
 *
 * Read path mirrors the write path: decrypt → parse → return the JSON
 * string (the wrapper's `parseQueueValue` is the consumer; it tolerates
 * the `_schemaVersion` field as an extra key on the parsed object).
 */
declare class OrbitDbFinalizationQueueStorageAdapter implements FinalizationQueueStorage {
    private readonly db;
    private readonly encryptionKey;
    private readonly notifyProfileDirty;
    constructor(opts: OrbitDbFinalizationQueueStorageAdapterOptions);
    /**
     * Item #15 Phase C — guarded invocation of the host's dirty signal.
     * Errors are swallowed silently so a misbehaving notifier cannot
     * propagate into the writer's error path.
     */
    private emitProfileDirty;
    readKey(key: string): Promise<string | null>;
    writeKey(key: string, value: string): Promise<void>;
    listByPrefix(prefix: string): Promise<Map<string, string>>;
    deleteKey(key: string): Promise<void>;
    /**
     * Return a {@link ProfileSyncWriter} scoped to
     * `${addressId}.finalizationQueue.*`. Each finalization-queue entry
     * is content-immutable per key (the `entryId` disambiguator ensures
     * two replicas writing the same entry produce equivalent content);
     * the merge therefore uses constant-Lamport semantics via
     * {@link PrefixSyncWriter}.
     *
     * Sticky-tombstone semantics: once a queue entry is removed on
     * either replica, the JOIN preserves the tombstone across both
     * sides. Mirrors {@link FinalizationQueue.remove}'s intent.
     */
    syncWriterFor(addressId: string): ProfileSyncWriter;
}
/**
 * Persisted shape of a `RequestContext` record. PaymentsModule keeps an
 * in-memory `Map<string, RequestContext>` keyed on the aggregator
 * commitment-request-id. The `nextEntryRest` field is a structural
 * subset of the payload `dispositionWriter` consumes; we serialize it
 * verbatim. Forward-compatible with future extensions: unknown JSON-safe
 * fields round-trip without loss.
 */
interface PersistedRequestContext {
    readonly transactionHash: string;
    readonly authenticator: string;
    readonly nextEntryRest: Record<string, unknown>;
}
/**
 * Persisted shape of a `RecipientFinalizationContext` record.
 *
 * Shape mirrors the in-memory definition on `PaymentsModule`. The
 * `sourceTokenJson` and `lastTxJson` fields are JSON-safe values from
 * the SDK so they round-trip through `JSON.stringify` cleanly; the
 * adapter does NOT inspect their structure.
 */
interface PersistedFinalizationContext {
    readonly localTokenId: string;
    readonly sourceTokenJson: unknown;
    readonly lastTxJson: Record<string, unknown>;
    readonly requestIdHex: string;
}
/**
 * Construction options for {@link OrbitDbRecipientContextStorageAdapter}.
 */
interface OrbitDbRecipientContextStorageAdapterOptions {
    readonly db: ProfileDatabase;
    readonly encryptionKey: Uint8Array;
    /**
     * Item #15 Phase C — fired after every successful mutation on either
     * the request-context or finalization-context sub-prefix. Also threaded
     * into the two {@link PrefixSyncWriter}s returned by
     * {@link OrbitDbRecipientContextStorageAdapter.syncWritersFor} so
     * JOIN-applied remote changes mark the profile dirty as well.
     */
    readonly notifyProfileDirty?: () => void;
}
/**
 * Profile-backed CRUD layer over the two in-memory Maps PaymentsModule
 * uses for the recipient finalization worker:
 *
 *  - `_recipientRequestContextMap` (key: requestId)
 *  - `_recipientFinalizationContext` (key: tokenId)
 *
 * Records are encrypted, stamped with `_schemaVersion: 'uxf-1'` so the
 * legacy save() diff path leaves them alone, and listed via prefix
 * scans on PaymentsModule restart so the in-memory Maps re-hydrate
 * before the recipient worker resumes.
 */
declare class OrbitDbRecipientContextStorageAdapter {
    private readonly db;
    private readonly encryptionKey;
    private readonly notifyProfileDirty;
    constructor(opts: OrbitDbRecipientContextStorageAdapterOptions);
    /**
     * Item #15 Phase C — guarded invocation of the host's dirty signal.
     */
    private emitProfileDirty;
    writeRequestContext(addr: string, requestId: string, record: PersistedRequestContext): Promise<void>;
    readRequestContext(addr: string, requestId: string): Promise<PersistedRequestContext | undefined>;
    deleteRequestContext(addr: string, requestId: string): Promise<void>;
    writeFinalizationContext(addr: string, tokenId: string, record: PersistedFinalizationContext): Promise<void>;
    readFinalizationContext(addr: string, tokenId: string): Promise<PersistedFinalizationContext | undefined>;
    deleteFinalizationContext(addr: string, tokenId: string): Promise<void>;
    /**
     * Enumerate every `RecipientFinalizationContext` record under `addr`.
     * Used by `PaymentsModule.initialize()` to re-hydrate the in-memory
     * `_recipientFinalizationContext` Map on restart.
     */
    listAllFinalizationContexts(addr: string): Promise<Map<string, PersistedFinalizationContext>>;
    /**
     * Enumerate every `RequestContext` record under `addr`. Used by
     * `PaymentsModule.initialize()` to re-hydrate the in-memory
     * `_recipientRequestContextMap` on restart.
     */
    listAllRequestContexts(addr: string): Promise<Map<string, PersistedRequestContext>>;
    private tryDecode;
    /**
     * Return the two {@link ProfileSyncWriter}s scoped to this address's
     * recipient-context state: one for `recipientContext.request.*` (keyed
     * by requestId) and one for `recipientContext.finalization.*` (keyed
     * by tokenId).
     *
     * Both surfaces are content-immutable per key (PaymentsModule writes
     * each requestId / tokenId exactly once during the in-flight transfer
     * lifecycle); the merge uses constant-Lamport semantics via
     * {@link PrefixSyncWriter}.
     *
     * The two sync writers are returned together because they cover the
     * same logical "recipient-context" namespace under different
     * sub-prefixes — the Phase D dispatcher invokes both per JOIN cycle.
     */
    syncWritersFor(addressId: string): {
        readonly requestContext: ProfileSyncWriter;
        readonly finalizationContext: ProfileSyncWriter;
    };
}

/**
 * UXF Inter-Wallet Transfer — UxfTransferOutboxEntry schema (T.6.A)
 *
 * Bundle-grained outbox entry per `docs/uxf/UXF-TRANSFER-PROTOCOL.md` §7.
 * Replaces the per-token legacy `OutboxEntry` (`types/txf.ts:150`) for UXF
 * transfer modes. Legacy per-token entries continue to be supported via the
 * migration path described in §7.2; readers MUST recognize both shapes during
 * the migration window.
 *
 * **Schema discriminator**. New entries carry `_schemaVersion: 'uxf-1'`;
 * legacy entries lack the field. Sniffers route on this to dispatch to the
 * correct decoder. See {@link isUxfTransferOutboxEntry} and
 * {@link isLegacyOutboxEntry}.
 *
 * **State partition** (per §7.1 — used by the CRDT merger T.6.B):
 *   - active           — worker still progressing
 *   - soft-terminal    — no progress, but could resume (loses to active)
 *   - hard-terminal    — no further worker progress without operator action
 *
 * **Lamport clock**. Every local mutation MUST follow §7.1:
 *   `lamport := max(local, observedRemotes) + 1`
 * The {@link Lamport} clock in `profile/lamport.ts` enforces this rule;
 * `OutboxWriter` in `profile/outbox-writer.ts` is the production wrapper.
 *
 * **Override stickiness**. `overrideApplied: true` is set by
 * `payments.importInclusionProof()` (§6.3). The flag is sticky across merges
 * (set-OR semantics) so a wallet that has performed an operator override
 * keeps the override even if a remote replica's Lamport runs ahead for
 * unrelated reasons.
 *
 * Spec references:
 *  - `docs/uxf/UXF-TRANSFER-PROTOCOL.md` §7    — outbox schema (canonical)
 *  - `docs/uxf/UXF-TRANSFER-PROTOCOL.md` §7.0  — state-transition table
 *  - `docs/uxf/UXF-TRANSFER-PROTOCOL.md` §7.1  — CRDT invariants + override
 *  - `docs/uxf/UXF-TRANSFER-PROTOCOL.md` §7.2  — legacy migration
 *  - `docs/uxf/PROFILE-ARCHITECTURE.md`  §10.12 — storage location (per-entry key)
 *
 * @module types/uxf-outbox
 */

/**
 * Lifecycle status of a {@link UxfTransferOutboxEntry}.
 *
 * The exact 11 strings are stable on-disk; see {@link UXF_OUTBOX_STATUSES}
 * for runtime iteration and the snapshot test for the stability contract.
 *
 * - `packaging`          — building UXF bundle (UXF modes only).
 * - `pinned`             — CAR pinned to IPFS (CID-mode only).
 * - `sending`            — Nostr publish in progress.
 * - `delivered`          — Nostr publish acked (conservative + TXF terminal).
 * - `delivered-instant`  — Nostr publish acked; instant mode awaits finalization.
 * - `finalizing`         — finalization worker running.
 * - `finalized`          — proof attached locally; instant mode terminal.
 * - `failed-transient`   — delivery or finalization failed; retry pending.
 * - `failed-permanent`   — unrecoverable (oracle rejection, race-lost, etc.).
 * - `failed-conflict`    — multi-device double-spend (OUTBOX-SEND-FOLLOWUPS
 *                          Item #14 Phase 1): the aggregator rejected our
 *                          commit because the source state was already
 *                          spent by ANOTHER device's commit. Terminal
 *                          except via the operator-override escape hatch
 *                          (same semantics as `failed-permanent`).
 * - `expired`            — retention window elapsed; entry GC'd.
 */
type UxfOutboxStatus = 'packaging' | 'pinned' | 'sending' | 'delivered' | 'delivered-instant' | 'finalizing' | 'finalized' | 'failed-transient' | 'failed-permanent' | 'failed-conflict' | 'expired';
/**
 * Bundle-grained outbox entry persisted under `${addr}.outbox.${id}` keys
 * by the per-entry-key writer (PROFILE-ARCHITECTURE §10.12 / Wave G.7).
 *
 * @see UXF-TRANSFER-PROTOCOL §7 for the canonical field-by-field
 *      specification.
 */
interface UxfTransferOutboxEntry {
    /**
     * Schema discriminator. Always the literal `'uxf-1'` for entries
     * produced by `OutboxWriter`. Legacy `OutboxEntry` records lack this
     * field — readers sniff on its presence to dispatch to the correct
     * decoder.
     */
    readonly _schemaVersion: 'uxf-1';
    /** UUID for this transfer attempt (primary key under `${addr}.outbox.${id}`). */
    readonly id: string;
    /** Which UXF bundle (CAR root CID). For TXF/legacy migration, may be a
     *  synthetic id of the form `'txf-' + tokenId` or
     *  `'legacy-' + recipientPubkey + '-' + createdAt`. See §7.2. */
    readonly bundleCid: string;
    /** Tokens shipped in this bundle (genesis token ids). Empty array
     *  permitted only for the migration synthetic case. */
    readonly tokenIds: ReadonlyArray<string>;
    /** How the bundle was sent. */
    readonly deliveryMethod: 'car-over-nostr' | 'cid-over-nostr' | 'txf-legacy';
    /** Recipient identifier (@nametag, DIRECT://..., chain pubkey, alpha1...). */
    readonly recipient: string;
    /** Recipient's resolved transport pubkey (used by transport.sendTokenTransfer). */
    readonly recipientTransportPubkey: string;
    /** Recipient's nametag (without `@`) at send time, if known. Preserved
     *  through legacy migration (§7.2 step 4). UI display only — not
     *  authenticated on the wire. */
    readonly recipientNametag?: string;
    /** Transfer mode. */
    readonly mode: 'conservative' | 'instant' | 'txf';
    /** Lifecycle status — see {@link UxfOutboxStatus}. */
    readonly status: UxfOutboxStatus;
    /**
     * Instant-mode commitment requestIds, partitioned into outstanding
     * (still being polled / submitted) and completed (proof attached or
     * hard-failed). Two-set form is required for CRDT merge semantics
     * per §7.1 — set-union on a single merged list would re-add finalized
     * requestIds to the outstanding pool and trigger re-submission.
     *
     * Carried as readonly tuples (not mutable arrays) to preserve set
     * semantics through the writer. Union/exclusion is performed by the
     * merger (T.6.B) over the canonical view; here we just persist them.
     */
    readonly outstandingRequestIds?: ReadonlyArray<string>;
    readonly completedRequestIds?: ReadonlyArray<string>;
    /** Optional sender memo. UNAUTHENTICATED on the wire. */
    readonly memo?: string;
    /** Wall-clock millisecond timestamp when the entry was first created. */
    readonly createdAt: number;
    /** Wall-clock millisecond timestamp of the most recent local mutation. */
    readonly updatedAt: number;
    /**
     * Lamport logical clock for CRDT tie-breaking. MUST follow §7.1 rule:
     *   on local write: lamport = max(local, observedRemotes) + 1
     *   on merge:       lamport = max(replicaA.lamport, replicaB.lamport)
     *
     * The {@link OutboxWriter} in `profile/outbox-writer.ts` enforces the
     * write rule via the {@link Lamport} clock in `profile/lamport.ts`.
     */
    readonly lamport: number;
    /**
     * Operator-override stickiness flag (§7.1). Set to `true` when
     * `payments.importInclusionProof()` transitions
     * `failed-permanent → finalizing`. The flag is sticky across merges
     * (set-OR semantics) — any replica having `overrideApplied === true`
     * causes the merged entry to have it. When `true`, active `finalizing`
     * wins against any replica's `failed-permanent` regardless of Lamport.
     *
     * Optional with `false` semantics on `undefined` to keep existing
     * pre-override entries small and to make the discriminator
     * unambiguous.
     */
    readonly overrideApplied?: boolean;
    /**
     * Sticky "ever observed `finalizing` status" flag (§7.1, steelman crit
     * #12). Set-OR semantics across merges — `true` on any replica whose
     * lifecycle has at one point passed through the `finalizing` status, OR
     * on any replica whose merger absorbed an entry that carried this flag,
     * OR on any merger output whose inputs carried `status === 'finalizing'`.
     *
     * **Why this exists.** Without the flag, `mergeStatus` is non-associative
     * for the multiset {`finalizing` (no override), `failed-permanent` (no
     * override), `failed-permanent` (overrideApplied: true)}: the inner fold
     * may erase `finalizing` (hard-terminal beats active per Rule 1) so the
     * Rule 2 override arc cannot revive it in the outer merge. With this
     * flag, the override arc can fire whenever ANY replica has ever observed
     * `finalizing`, even after it has been hidden by an intermediate
     * hard-terminal fold — restoring associativity for the gossip-fold model.
     *
     * **Sticky CRDT-stable boolean.** Once `true` on any replica, every
     * future merge output is `true`. Persisted on writes (the writer never
     * clears it). Optional with `false` semantics on `undefined`.
     */
    readonly everFinalizing?: boolean;
    /** Last error message, if any. */
    readonly error?: string;
    /**
     * Submit retry counter — G-counter shape (CRDT max-merge per §7.1).
     * Monotonic non-decreasing.
     */
    readonly submitRetryCount: number;
    /**
     * Proof error counter — G-counter shape (CRDT max-merge per §7.1).
     * Monotonic non-decreasing.
     */
    readonly proofErrorCount: number;
    /** Soft deadline (wall-clock ms) for transient retry abandonment. After
     *  this time, the worker stops retrying and transitions the entry to
     *  `failed-permanent`. */
    readonly retryDeadline?: number;
    /** Polling deadline (wall-clock ms) for instant-mode finalization. After
     *  this time, sustained PATH_NOT_INCLUDED transitions the entry to
     *  `failed-permanent` with reason='oracle-rejected'. */
    readonly pollingDeadline?: number;
    /**
     * Wall-clock millisecond timestamp of the FIRST poll-loop entry
     * for this outbox entry. Anchors the {@link isPollingTimedOut}
     * deadline (§5.5 step 6) and the W26 hard safety net
     * (`2 × POLLING_WINDOW_MS` from this stamp).
     *
     * **Steelman post-cutover invariant (W26 cross-restart persistence)**:
     * the finalization worker MUST persist this on first poll iteration
     * and MUST use the persisted value (NOT `now()`) on every subsequent
     * pass — including after crash/restart. Recapturing `now()` per
     * `runRequestPipeline` invocation voids the §5.5 step 6 termination
     * guarantee: a token stuck PENDING across many restarts would poll
     * indefinitely with a fresh 60-min window each time.
     *
     * Optional with `undefined` semantics on the first observation; the
     * worker stamps it via `outbox.update()` BEFORE the first poll.
     * Once set, the field is monotonic — never overwritten on retry.
     * Mirror of {@link FinalizationQueueEntry.submittedAt} on the
     * recipient side.
     */
    readonly pollStartedAt?: number;
    /**
     * Issue #166 P2 #3 — Nostr event id returned by the relay's OK ack
     * after `transport.sendTokenTransfer()` succeeds. Captured at the
     * `sending → delivered{,-instant}` arc and propagated to the SENT
     * ledger via {@link writeSentEntryFromOutbox}.
     *
     * Powers the {@link NostrPersistenceVerifier} worker (default OFF
     * via `features.nostrPersistenceVerifier`), which periodically
     * re-queries the relay by event id to detect retention drops —
     * closing the "relay ack ≠ persistence" gap left by the
     * round-2 steelman fix (PR #97 / `fcf1d53`).
     *
     * Backward-compat: optional; entries written before P2 #3 wiring
     * lacked this field and continue to validate via the type guard
     * (which accepts missing OR non-empty string).
     */
    readonly nostrEventId?: string;
}
/**
 * Legacy per-token outbox entry shape produced by pre-T.6.A code paths.
 *
 * Re-exported under the {@link LegacyOutboxEntry} alias so call sites can
 * read both shapes during the §7.2 migration window. The canonical source
 * remains `types/txf.ts:OutboxEntry`.
 *
 * @see types/txf.ts
 */
type LegacyOutboxEntry = OutboxEntry;

/**
 * UXF Inter-Wallet Transfer — OutboxWriter (T.6.A)
 *
 * Per-entry-key writer / reader for {@link UxfTransferOutboxEntry}.
 * Operates directly on the {@link ProfileDatabase} (OrbitDB key-value store)
 * under keys of the form `${addr}.outbox.${id}` per
 * `docs/uxf/PROFILE-ARCHITECTURE.md` §10.12 / Wave G.7.
 *
 * **Scope** — write/read only. The CRDT merger (T.6.B) and PaymentsModule
 * integration (T.2.D.2 / T.5.C) live elsewhere and consume this writer's
 * primitives.
 *
 * **Lamport invariant** (per UXF-TRANSFER-PROTOCOL §7.1). On every local
 * write to an entry, the writer:
 *   1. Reads the current `lamport` value AND every Lamport observed across
 *      all concurrently-known outbox entries for the address.
 *   2. Calls {@link Lamport.bumpFor} which yields
 *      `next = max(local, observedRemotes) + 1`.
 *   3. Stamps `next` onto the entry being written.
 *
 * **Schema discriminator**. Every entry written by this class carries
 * `_schemaVersion: 'uxf-1'`. Legacy entries (pre-T.6.A) lack the field;
 * `readAll` classifies each entry on read so callers can dispatch.
 *
 * **Per-entry-key isolation**. Writing entry `a` does NOT touch entries
 * `b` or `c`. Deleting entry `b` does NOT touch entries `a` or `c`. This
 * is the canonical CRDT-friendly layout per §7.1: two devices adding
 * different entries never conflict at the OrbitDB layer.
 *
 * **Tombstones**. `delete()` writes a tombstone marker
 * (`{ tombstoned: true, deletedAt: number }`) at the entry's key rather
 * than hard-deleting, matching the existing per-entry-key pattern in
 * `profile-token-storage-provider.ts` (Wave G.7). Tombstones are skipped
 * by `readAll`. Tombstone retention / GC is handled by the provider's
 * existing flush path; this writer only writes the tombstone marker.
 *
 * **Encryption**. If an `encryptionKey` is supplied at construction, all
 * values are encrypted via {@link encryptProfileValue} (AES-256-GCM)
 * before writing. The provider's main writer uses the same encryption
 * scheme — no AAD, matching `profile-token-storage-provider.ts`'s
 * `writeProfileKey` / `readProfileKey`.
 *
 * @module profile/outbox-writer
 *
 * @see docs/uxf/UXF-TRANSFER-PROTOCOL.md   §7, §7.0, §7.1, §7.2
 * @see docs/uxf/PROFILE-ARCHITECTURE.md     §10.12
 * @see profile/profile-token-storage-provider.ts (canonical per-entry-key writer)
 * @see profile/lamport.ts                   (Lamport clock — §7.1 invariants)
 */

/**
 * Construction-time options for {@link OutboxWriter}.
 */
interface OutboxWriterOptions {
    /** OrbitDB key-value adapter — same instance the provider uses. */
    readonly db: ProfileDatabase;
    /** AES-256 key for encrypting on-disk values. Pass `null` to disable
     *  encryption (parity with `ProfileTokenStorageProvider` when no key
     *  was injected at construction). */
    readonly encryptionKey: Uint8Array | null;
    /** Address id — the `${addr}` prefix in `${addr}.outbox.${id}`. */
    readonly addressId: string;
    /** Lamport clock instance. The writer mutates it on every write per
     *  §7.1. Per-instance scoped — supply a fresh clock per Sphere instance
     *  to avoid bleed across destroy-recreate cycles. */
    readonly lamport: Lamport;
    /**
     * Item #15 Phase C — fired after any local mutation completes
     * successfully (live write, tombstone delete, JOIN-applied remote
     * change, GC-purged tombstone). Signals the host's flush scheduler
     * that the profile has dirty state that should be included in the
     * next lean-snapshot publish.
     *
     * Optional: writers function identically when omitted (the host has
     * not yet wired full-profile-snapshot sync, or the test is exercising
     * a pre-#15 path). Errors thrown by the callback are caught and
     * logged silently so a misbehaving notifier cannot break write paths.
     */
    readonly notifyProfileDirty?: () => void;
}
/**
 * One entry returned by {@link OutboxWriter.readAll}. Each variant carries
 * the parsed payload alongside the on-disk shape classification so callers
 * can route at the call site without re-sniffing.
 */
type ClassifiedOutboxEntry = {
    readonly shape: 'uxf-1';
    readonly entry: UxfTransferOutboxEntry;
} | {
    readonly shape: 'legacy';
    readonly entry: LegacyOutboxEntry;
};
/**
 * Input shape for {@link OutboxWriter.write}. The writer stamps
 * `_schemaVersion`, `lamport`, and (optionally) `updatedAt` itself.
 */
type OutboxWriteInput = Omit<UxfTransferOutboxEntry, '_schemaVersion' | 'lamport'> & {
    /** Optional: explicit timestamp for the write. Defaults to `Date.now()`. */
    readonly updatedAt?: number;
};
/**
 * Optional second argument to {@link OutboxWriter.write}. Issue #166
 * P1 #2 adds the {@link WriteOptions.allowResurrection} escape hatch.
 */
interface WriteOptions {
    /**
     * Issue #166 P1 #2 — by default, calling `write()` on an id whose
     * slot is currently a tombstone is REFUSED with
     * `OUTBOX_ENTRY_TOMBSTONED`. The tombstone represents a completed
     * delivery (the matching SENT entry is the durable record); writing
     * a new entry over it would silently resurrect a key that should
     * stay dead, defeating the whole point of the OUTBOX drain.
     *
     * Pass `true` ONLY for legitimate escape-hatch resurrections —
     * operator triage of a poisoned key, test fixtures, or explicit
     * spec-defined "rewind" operations. The writer emits no log on
     * `true` so the caller takes responsibility for the audit trail.
     */
    readonly allowResurrection?: boolean;
}
/**
 * Per-entry-key writer/reader for {@link UxfTransferOutboxEntry}.
 *
 * @remarks
 * Holds NO module-level state. All state lives on the instance (the
 * {@link Lamport} clock, the address binding). Constructing two writers
 * for the same address is harmless — they each serialize their own
 * Lamport, and OrbitDB's key-value semantics absorb the writes.
 */
declare class OutboxWriter implements ProfileSyncWriter {
    private readonly db;
    private readonly encryptionKey;
    private readonly addressId;
    private readonly lamport;
    private readonly keyPrefix;
    private readonly notifyProfileDirty;
    constructor(options: OutboxWriterOptions);
    /**
     * Item #15 Phase C — invoke the host's `notifyProfileDirty` callback
     * (if wired). Guarded so a misbehaving notifier cannot break a mutation
     * path; errors are swallowed silently (the dirty signal is best-effort
     * — the next flush will pick up the state regardless).
     */
    private emitProfileDirty;
    /**
     * Compose the on-disk key for an entry id.
     * Exposed for callers that need to read raw values directly (tests).
     */
    keyFor(id: string): string;
    /**
     * Write a new entry — or replace an existing one — at
     * `${addr}.outbox.${entry.id}`. Stamps `_schemaVersion: 'uxf-1'`,
     * `updatedAt`, and a Lamport bumped per §7.1 invariants.
     *
     * The Lamport bump observes:
     *   - the current local clock value
     *   - every concurrently-stored entry's `lamport` field (read via
     *     prefix-scan)
     * and writes `next = max(local, observedRemotes) + 1`.
     *
     * Idempotent on the input shape: writing the same `entry` twice
     * produces two distinct Lamport stamps but the same `id` slot is
     * overwritten — second write wins.
     */
    write(input: OutboxWriteInput, options?: WriteOptions): Promise<UxfTransferOutboxEntry>;
    /**
     * Apply `mutator` to an existing entry, then write the result with a
     * bumped Lamport. Throws `OUTBOX_ENTRY_NOT_FOUND` if no live entry
     * exists at the key (the prior value was a tombstone or missing).
     *
     * The mutator runs on the immutable input; it MAY return a new object
     * or a structural copy. The writer does NOT enforce immutability of
     * unrelated fields — callers are responsible for honoring the spec's
     * monotonic invariants (e.g., G-counter shape on `submitRetryCount`).
     */
    update(id: string, mutator: (prev: UxfTransferOutboxEntry) => UxfTransferOutboxEntry): Promise<UxfTransferOutboxEntry>;
    /**
     * Tombstone the entry at `${addr}.outbox.${id}`. Subsequent
     * {@link readAll}/{@link readOne} calls return null for this id.
     *
     * Idempotent: tombstoning an already-tombstoned key (or a missing key)
     * is a no-op apart from refreshing `deletedAt`.
     *
     * Per-entry-key isolation: deleting `b` does NOT modify entries `a`
     * or `c`. The on-disk tombstone remains until the provider's flush
     * path GCs it after the retention window (§ Wave G.7 retention rule).
     */
    delete(id: string): Promise<void>;
    /**
     * OUTBOX-SEND-FOLLOWUPS item #4 — reclaim storage occupied by
     * tombstones older than `opts.retentionMs`.
     *
     * Tombstone semantics. `delete(id)` writes a tombstone marker
     * (`{ tombstoned: true, deletedAt, lamport }`) at the entry's key
     * rather than calling `db.del()`. This is load-bearing for the
     * Issue #166 P1 #2 refuse-write guard — without the durable
     * tombstone marker, a concurrent replica's pre-sync state could
     * resurrect a completed delivery. But tombstones never go away,
     * so the OrbitDB log grows monotonically.
     *
     * After enough time has passed that no replica can still hold a
     * pre-sync state for the slot, the marker can be safely replaced
     * with an actual `db.del()` to reclaim space. 30 days is the
     * conservative default the doc prescribes; callers tune via
     * `retentionMs`.
     *
     * **What this method does:**
     *  1. Prefix-scans all keys under the writer's address.
     *  2. For each key, classifies the slot shape (`value` /
     *     `tombstone`).
     *  3. For tombstones where `(now - deletedAt) > retentionMs`,
     *     calls `db.del(key)`.
     *  4. Returns counts for diagnostics.
     *
     * **Idempotent.** Re-running after a successful sweep is a no-op
     * (the tombstones are gone). The Lamport monotonicity invariant
     * is preserved — once the actual key is `del()`'d, future writes
     * to the same id rehydrate the clock from observed live entries
     * only, and a fresh slot is born with a Lamport ≥ max(observed) + 1.
     *
     * **Safety contract.** Sweeping a tombstone that is still within
     * any concurrent replica's pre-sync horizon can resurrect the
     * slot. Callers MUST ensure `retentionMs` exceeds the longest
     * realistic replica re-sync window. The 30-day default is large
     * enough that even fortnight-long offline replicas converge before
     * sweep.
     */
    gcExpiredTombstones(opts: {
        readonly retentionMs: number;
        readonly now?: number;
    }): Promise<TombstoneGcResult>;
    /**
     * Return every entry under `${addr}.outbox.*` as raw encrypted bytes
     * for the lean-snapshot builder (Item #15 Phase B). Includes BOTH
     * live entries AND tombstones — receivers need the tombstone bytes
     * to converge on deletes.
     *
     * The bytes are returned exactly as `db.get(key)` produced them (AES-
     * 256-GCM ciphertext when constructed with an encryptionKey, or
     * plaintext JSON when not). The receiving peer's `joinSnapshot()`
     * decrypts with the same wallet key and applies the merge table.
     *
     * Stable order: ascending lexicographic key.
     */
    snapshot(): Promise<ReadonlyArray<SnapshotEntry>>;
    /**
     * Apply a remote peer's outbox snapshot against this writer's local
     * OrbitDB state (Item #15 Phase B). For each remote entry, the merge
     * table decides whether to keep local or persist the remote's bytes
     * verbatim.
     *
     * **Tombstone resurrection invariant** carries over: a tombstone on
     * either side at lamport ≥ the live counterpart wins, mirroring the
     * Issue #166 P1 #2 refuse-write guard at JOIN time.
     *
     * **Lamport bumping is intentionally bypassed.** Remote bytes already
     * carry a Lamport stamp from the remote's bump. Re-bumping at JOIN
     * would inflate this peer's clock past the remote's intent and break
     * convergence (the next snapshot would forever look "newer" than the
     * remote's). The local clock observes the freshly-landed Lamports on
     * the next live write via `collectObservedLamports` + `rehydrate`,
     * which IS the correct entry point for absorbing remote state into
     * the clock.
     *
     * **Legacy entries** (pre-§7.0, no `_schemaVersion`):
     *   - Remote legacy → rejected as malformed. Legacy entries do not
     *     propagate via the lean-snapshot path; the §7.2 migration window
     *     handles their forward conversion.
     *   - Local legacy → treated as `live` with `lamport=0`. Any uxf-1
     *     remote (which always has `lamport ≥ 1`) therefore overwrites
     *     it, completing the migration as a side effect of sync.
     *
     * **Out-of-bounds Lamports** in remote entries are rejected per
     * `MAX_SAFE_LAMPORT` — the JOIN-time counterpart of the W39 bounds
     * defence on Lamport.bumpFor.
     */
    joinSnapshot(remote: ReadonlyArray<SnapshotEntry>): Promise<JoinResult>;
    /**
     * Map our private `readSlotShape` discriminated union into the
     * `ClassifiedSlot` shape consumed by the shared merge primitive.
     *
     * @param shape  The output of `readSlotShape` / `classifyRawBytes`.
     * @param remote `true` for remote bytes (stricter — legacy entries
     *               are rejected so they cannot propagate); `false` for
     *               local bytes (legacy is mapped to `live lamport=0`
     *               so any uxf-1 remote can overwrite it on sync).
     */
    private classifyToMergeSlot;
    /**
     * Decrypt + parse a raw byte buffer using the writer's standard
     * pipeline (size cap → decrypt → JSON parse → tombstone sniff).
     * Used by `joinSnapshot` to classify remote bytes without going
     * through `db.get`. Returns the same discriminated union as
     * `readSlotShape`.
     */
    private classifyRawBytes;
    /**
     * Read a single entry at `${addr}.outbox.${id}`. Returns `null` if
     * the key is absent OR carries a tombstone marker. Returns a
     * classified union otherwise so callers can route by shape.
     */
    readOne(id: string): Promise<ClassifiedOutboxEntry | null>;
    /**
     * Prefix-scan all entries under `${addr}.outbox.*`. Skips tombstoned
     * keys and entries that fail to classify (corrupt JSON, partial
     * shapes). Stable order: ascending lexicographic key.
     */
    readAll(): Promise<ReadonlyArray<ClassifiedOutboxEntry>>;
    /**
     * Convenience: only the new-shape entries from {@link readAll}.
     */
    readAllNew(): Promise<ReadonlyArray<UxfTransferOutboxEntry>>;
    /**
     * Convenience: only the legacy-shape entries from {@link readAll}.
     * Useful for the §7.2 migration window — callers can fold these into
     * synthetic UXF entries.
     */
    readAllLegacy(): Promise<ReadonlyArray<LegacyOutboxEntry>>;
    /**
     * Collect every observed Lamport across all currently-stored UXF
     * outbox entries for the address. Used by the §7.1 bump rule.
     *
     * Legacy entries (no `lamport` field) contribute nothing — they are
     * outside the new CRDT regime and are migrated forward on first write
     * by T.6.B.
     */
    private collectObservedLamports;
    /**
     * Issue #166 P1 #2 — check whether the slot at `id` is currently a
     * tombstone, and if so return its Lamport + deletedAt for the
     * refuse-write guard. Returns `null` for absent slots, live values,
     * and any decode/decrypt failures.
     *
     * Legacy tombstones (pre-#166, no `lamport` field) report
     * `lamport: 0` so the refusal still fires. The lamport field is
     * forensic for the error message; the refusal itself is unconditional
     * on the presence of the tombstone marker.
     */
    private readTombstoneAt;
    /**
     * Issue #166 P1 #2 — read raw bytes at `key`, decrypt + parse, and
     * classify the slot. Returns a discriminated union so callers can
     * distinguish absent / tombstone / live value without re-decoding.
     *
     * `readDecoded()` remains the backward-compat surface (returns
     * `null` for absent + tombstone, the parsed value otherwise) — most
     * consumers want that semantics.
     */
    private readSlotShape;
    /**
     * Encrypt and write a JSON-encoded value at `${prefix}${id}`.
     */
    private writeRaw;
    /**
     * Read raw bytes at `key`, decrypt if a key is configured, decode JSON.
     * Returns `null` for missing key, decryption failure, parse failure,
     * or tombstone marker.
     */
    private readDecoded;
    /**
     * Classify a parsed value as one of the three on-disk shapes (`uxf-1`,
     * `legacy`, `unknown`). Returns `null` for `unknown` so callers can
     * skip silently.
     */
    private classify;
}

/**
 * UXF Inter-Wallet Transfer — SENT ledger type (Issue #97)
 *
 * Profile-resident, IPFS-synced record of successfully-delivered token
 * bundles. Written by the sender after the outbox entry transitions to
 * a terminal-success status (`'delivered'` for conservative mode,
 * `'delivered-instant'` for instant mode). Lives under per-entry-key
 * `${addr}.sent.${id}` in the profile's OrbitDB key-value store.
 *
 * **Why a separate ledger from the outbox?**
 * - The outbox is an OPERATIONAL queue — entries are GC'd after they
 *   reach a terminal status (tombstoned). The SENT ledger is a
 *   PERMANENT record: once a token is delivered we never want to
 *   redeliver it, even after the outbox entry has been wiped.
 * - The crash-recovery sweeper (Issue #97 step 6) uses SENT membership
 *   to distinguish:
 *     - "token has a spending tx AND is in SENT" → no action needed
 *     - "token has a spending tx AND is NOT in OUTBOX or SENT" → crash
 *       happened between step 1 (append spending tx) and step 2
 *       (persist outbox entry); re-queue to OUTBOX.
 * - The duplicate-bundle guard (Issue #97 step 7) checks SENT before
 *   adding a token to a new bundle. Same token MAY be re-sent
 *   intentionally (idempotent unicity proofs) but the guard requires
 *   an explicit acknowledgment to avoid accidental double-spends.
 *
 * **Schema discriminator.** Every entry carries `_schemaVersion:
 * 'uxf-1'` so the legacy PaymentsModule.save() flush path skips them
 * (it filters by absence of `_schemaVersion`).
 *
 * @see UXF-TRANSFER-PROTOCOL §7 (companion to `UxfTransferOutboxEntry`)
 * @see profile/sent-ledger-writer.ts
 */
/**
 * Bundle-grained SENT ledger entry persisted under `${addr}.sent.${id}`
 * keys by the per-entry-key writer (PROFILE-ARCHITECTURE §10.12 / Wave
 * G.7).
 *
 * Fields mirror a subset of `UxfTransferOutboxEntry` — only the
 * load-bearing identifiers and the delivery method. We do NOT carry the
 * lifecycle status, retry counters, or error fields: SENT is by
 * definition terminal-success.
 */
interface UxfSentLedgerEntry {
    /**
     * Schema discriminator. Always the literal `'uxf-1'`. Legacy
     * sphere-storage records lack this field — readers MUST check before
     * trusting the shape.
     */
    readonly _schemaVersion: 'uxf-1';
    /**
     * Stable id for this delivery (the outbox transferId at the time of
     * delivery). Primary key under `${addr}.sent.${id}`. Reusing the
     * outbox id makes correlation trivial: a successful send leaves
     * matching `${addr}.outbox.${id}` (tombstoned) and `${addr}.sent.${id}`
     * (live) records.
     */
    readonly id: string;
    /**
     * Tokens shipped in this bundle (genesis token ids). The sweeper uses
     * this list to determine SENT membership: "is tokenX in any SENT
     * entry?" → prefix-scan + scan tokenIds arrays. Empty array permitted
     * only for the txf-legacy migration synthetic case.
     */
    readonly tokenIds: ReadonlyArray<string>;
    /** CAR root CID of the UXF bundle that was delivered. */
    readonly bundleCid: string;
    /** Recipient's resolved transport pubkey (the published-to pubkey). */
    readonly recipientTransportPubkey: string;
    /** Optional recipient identifier (@nametag, DIRECT://..., etc.) for
     *  UI display only — unauthenticated on the wire. */
    readonly recipient?: string;
    /** Optional recipient nametag (without `@`) at send time. */
    readonly recipientNametag?: string;
    /** How the bundle was delivered to the relay. */
    readonly deliveryMethod: 'car-over-nostr' | 'cid-over-nostr' | 'txf-legacy';
    /** Transfer mode at the time of delivery. */
    readonly mode: 'conservative' | 'instant' | 'txf';
    /** Wall-clock millisecond timestamp when the SENT entry was recorded
     *  (= the moment after the outbox transitioned to its terminal-success
     *  status). */
    readonly sentAt: number;
    /**
     * Lamport logical clock for CRDT tie-breaking — same rule as
     * `UxfTransferOutboxEntry.lamport`. The SentLedgerWriter bumps via
     * a DISTINCT address-scoped Lamport instance — intentionally NOT
     * shared with the OutboxWriter's Lamport (see
     * `profile/sent-ledger-writer.ts` module docs for the rationale:
     * SENT forms its own CRDT namespace; sharing a clock would over-
     * bump on unrelated outbox writes).
     */
    readonly lamport: number;
    /**
     * Optional Nostr event id returned by the relay's OK ack. Future
     * tooling can re-query the relay to verify the event is still
     * persisted (closing the "relay ack ≠ persistence" gap). Today the
     * field is for forensics only — no read path consumes it yet.
     */
    readonly nostrEventId?: string;
    /**
     * Optional millisecond timestamp marking when the unicity proof was
     * attached for this delivery's commitment(s). Instant mode only;
     * conservative mode awaits proofs BEFORE delivery so this field
     * coincides with `sentAt` and is omitted. Filled by the
     * FinalizationWorkerSender when it observes a proof for a requestId
     * still tracked by an outbox entry that has already moved to SENT.
     */
    readonly proofAttachedAt?: number;
}

/**
 * UXF Inter-Wallet Transfer — SentLedgerWriter (Issue #97)
 *
 * Per-entry-key writer / reader for {@link UxfSentLedgerEntry}. The
 * SENT ledger is a permanent record of delivered bundles, persisted
 * under keys of the form `${addr}.sent.${id}` per
 * PROFILE-ARCHITECTURE §10.12. Companion to {@link OutboxWriter} — the
 * outbox queues in-flight transfers, the SENT ledger records what got
 * out the door.
 *
 * **Scope** — write/read only. The crash-recovery sweeper (Issue #97
 * step 6) and PaymentsModule integration (Issue #97 step 4) live
 * elsewhere and consume this writer's primitives.
 *
 * **Lamport invariant** — same §7.1 rule as OutboxWriter. On every
 * local write, the writer:
 *   1. Reads the current Lamport value AND every Lamport observed
 *      across all concurrently-stored SENT entries for the address.
 *   2. Calls {@link Lamport.bumpFor} which yields
 *      `next = max(local, observedRemotes) + 1`.
 *   3. Stamps `next` onto the entry being written.
 *
 * The Lamport instance is intentionally separate from the outbox's
 * Lamport: SENT entries form their own CRDT namespace. Sharing a clock
 * across distinct entry families would over-bump unrelated writes and
 * could produce false-ordering between independent activities (e.g.
 * a high-volume outbox storm would inflate the SENT clock without any
 * SENT writes).
 *
 * **Per-entry-key isolation** — writing entry `a` does not touch
 * entries `b` or `c`. Tombstones use the same marker shape as
 * OutboxWriter (`{ tombstoned: true, deletedAt: number }`).
 *
 * **Encryption** — values are encrypted with the same AES-256-GCM
 * scheme as the outbox writer.
 *
 * @module profile/sent-ledger-writer
 *
 * @see types/uxf-sent.ts          (entry shape)
 * @see profile/outbox-writer.ts   (analogous structure)
 * @see profile/lamport.ts         (§7.1 Lamport rule)
 */

/**
 * Construction-time options for {@link SentLedgerWriter}.
 */
interface SentLedgerWriterOptions {
    /** OrbitDB key-value adapter — same instance the provider uses. */
    readonly db: ProfileDatabase;
    /** AES-256 key for encrypting on-disk values. Pass `null` to disable
     *  encryption (parity with `OutboxWriter`). */
    readonly encryptionKey: Uint8Array | null;
    /** Address id — the `${addr}` prefix in `${addr}.sent.${id}`. */
    readonly addressId: string;
    /** Lamport clock instance. The writer mutates it on every write per
     *  §7.1. Use a fresh instance per Sphere instantiation; do NOT share
     *  with the OutboxWriter (see module-level rationale). */
    readonly lamport: Lamport;
    /**
     * Item #15 Phase C — fired after any local mutation completes
     * successfully (live write, tombstone delete, JOIN-applied remote
     * change, GC-purged tombstone). Signals the host's flush scheduler
     * that the profile has dirty state that should be included in the
     * next lean-snapshot publish. See {@link OutboxWriter} for the
     * full semantics.
     */
    readonly notifyProfileDirty?: () => void;
}
/**
 * Input shape for {@link SentLedgerWriter.write}. The writer stamps
 * `_schemaVersion` and `lamport` itself.
 */
type SentLedgerWriteInput = Omit<UxfSentLedgerEntry, '_schemaVersion' | 'lamport'>;
/**
 * Optional second argument to {@link SentLedgerWriter.write}. Mirrors
 * the OutboxWriter shape — see {@link OutboxWriter.WriteOptions}.
 * Issue #166 P1 #2.
 */
interface SentWriteOptions {
    /**
     * By default, calling `write()` on an id whose slot is currently a
     * tombstone is REFUSED with `OUTBOX_ENTRY_TOMBSTONED`. Pass `true`
     * ONLY for operator escape-hatch resurrections / test fixtures.
     */
    readonly allowResurrection?: boolean;
}
/**
 * Per-entry-key writer/reader for {@link UxfSentLedgerEntry}.
 */
declare class SentLedgerWriter implements ProfileSyncWriter {
    private readonly db;
    private readonly encryptionKey;
    private readonly addressId;
    private readonly lamport;
    private readonly keyPrefix;
    private readonly notifyProfileDirty;
    /**
     * OUTBOX-SEND-FOLLOWUPS item #3 — lazy in-memory `tokenId → entryId`
     * index. Populated on the first {@link contains} or
     * {@link findByTokenId} call via {@link ensureIndex}; maintained
     * incrementally by {@link write} and {@link delete}. NOT persisted —
     * each `SentLedgerWriter` instance re-derives the index from
     * {@link readAll} on first lookup after construction.
     *
     * `null` means "not yet built". The companion {@link entryTokenIds}
     * map is initialised in lockstep so an entry's prior tokenIds can be
     * looked up at maintenance time without re-reading the entry.
     */
    private tokenIndex;
    private entryTokenIds;
    constructor(options: SentLedgerWriterOptions);
    /**
     * Item #15 Phase C — invoke the host's `notifyProfileDirty` callback
     * (if wired). Guarded so a misbehaving notifier cannot break a mutation
     * path; errors are swallowed silently (the dirty signal is best-effort
     * — the next flush will pick up the state regardless).
     */
    private emitProfileDirty;
    /**
     * Compose the on-disk key for an entry id. Exposed for callers that
     * need to read raw values directly (tests).
     */
    keyFor(id: string): string;
    /**
     * Write a new SENT entry at `${addr}.sent.${entry.id}`. Stamps
     * `_schemaVersion: 'uxf-1'` and a Lamport bumped per §7.1.
     *
     * Idempotent on input: writing the same `entry` twice produces two
     * distinct Lamport stamps but the same `id` slot is overwritten —
     * second write wins. Callers typically only write each SENT entry
     * once (on `delivered` / `delivered-instant` transition), but the
     * second-write-wins behaviour gives the recovery sweeper room to
     * safely re-stamp without checking existence first.
     */
    write(input: SentLedgerWriteInput, options?: SentWriteOptions): Promise<UxfSentLedgerEntry>;
    /**
     * Tombstone the SENT entry at `${addr}.sent.${id}`. Subsequent
     * {@link readAll}/{@link readOne}/{@link contains} calls treat the
     * id as absent.
     *
     * In normal operation, SENT entries are NEVER deleted — the ledger
     * is a permanent record. This API exists for operator escape-hatch
     * scenarios (e.g. recovery from a poisoned ledger) and tests.
     */
    delete(id: string): Promise<void>;
    /**
     * OUTBOX-SEND-FOLLOWUPS item #4 — reclaim storage occupied by SENT-
     * ledger tombstones older than `opts.retentionMs`.
     *
     * SENT-ledger tombstones are rare (the ledger is permanent in
     * normal operation; tombstones only appear on operator escape-
     * hatch or test fixture paths), so this sweep is largely a
     * defensive surface — but the same monotonic-growth concern that
     * motivates the OUTBOX sweep applies here. See
     * {@link OutboxWriter.gcExpiredTombstones} for the full safety
     * contract; the implementation is structurally identical.
     */
    gcExpiredTombstones(opts: {
        readonly retentionMs: number;
        readonly now?: number;
    }): Promise<TombstoneGcResult>;
    /**
     * Return every entry under `${addr}.sent.*` as raw encrypted bytes
     * for the lean-snapshot builder (Item #15 Phase B). Includes BOTH
     * live entries AND tombstones — the latter are rare (the SENT ledger
     * is permanent in normal operation) but propagate via the same
     * channel for completeness.
     *
     * Stable order: ascending lexicographic key. Mirrors
     * {@link OutboxWriter.snapshot}.
     */
    snapshot(): Promise<ReadonlyArray<SnapshotEntry>>;
    /**
     * Apply a remote peer's SENT-ledger snapshot against this writer's
     * local OrbitDB state. For each remote entry, the merge table decides
     * whether to keep local or persist remote's bytes verbatim.
     *
     * **In-memory tokenId index invalidation.** This writer maintains a
     * lazy `tokenId → entryId` index (OUTBOX-SEND-FOLLOWUPS item #3) that
     * is kept in sync by `write()` and `delete()`. The JOIN path bypasses
     * those hooks (it goes directly to `db.put`), so any landed remote
     * change can render the index stale. We invalidate at the end of the
     * JOIN if any write occurred — the next `contains()` / `findByTokenId`
     * call rebuilds from the current durable state.
     *
     * Same Lamport / legacy-entry / out-of-bounds semantics as
     * {@link OutboxWriter.joinSnapshot}; see that method for the rationale.
     */
    joinSnapshot(remote: ReadonlyArray<SnapshotEntry>): Promise<JoinResult>;
    /**
     * Map our private `readSlotShape` discriminated union into the
     * `ClassifiedSlot` shape consumed by the shared merge primitive.
     *
     * SENT entries have no legacy variant (the ledger is post-Issue #97);
     * any non-uxf-1 live value at our prefix is treated as malformed.
     *
     * @param shape  The output of `readSlotShape` / `classifyRawBytes`.
     * @param remote `true` for remote bytes (stricter — malformed
     *               rejected outright); `false` for local (malformed
     *               mapped to absent so well-formed remote can land).
     */
    private classifyToMergeSlot;
    /**
     * Decrypt + parse a raw byte buffer using the writer's standard
     * pipeline (size cap → decrypt → JSON parse → tombstone sniff).
     * Used by `joinSnapshot` to classify remote bytes without going
     * through `db.get`.
     */
    private classifyRawBytes;
    /**
     * Read a single entry at `${addr}.sent.${id}`. Returns `null` if the
     * key is absent OR carries a tombstone marker OR fails to classify.
     */
    readOne(id: string): Promise<UxfSentLedgerEntry | null>;
    /**
     * Prefix-scan all SENT entries under `${addr}.sent.*`. Skips
     * tombstones and entries that fail the schema guard. Stable order:
     * ascending lexicographic key.
     */
    readAll(): Promise<ReadonlyArray<UxfSentLedgerEntry>>;
    /**
     * Check whether `tokenId` appears in ANY live SENT entry. Used by
     * the crash-recovery sweeper (Issue #97 step 6) and the duplicate-
     * bundle guard (Issue #97 step 7).
     *
     * **Cost contract.** Backed by a lazy in-memory index (OUTBOX-SEND-
     * FOLLOWUPS item #3). The first call after construction is O(n × m)
     * — it iterates `readAll()` to build the index. Subsequent calls:
     *
     *  - **Miss path** (tokenId not in any bucket): O(1) — single
     *    `Map.has` returns false, no storage I/O. This is the common
     *    case for the duplicate-bundle guard (most candidate tokens are
     *    fresh).
     *  - **Hit path**: O(b) where `b` is the bucket size (typically 1).
     *    Each hit reads one entry from storage to verify the index is
     *    not stale against cross-replica tombstones — see
     *    "Cross-replica staleness" below.
     *
     * **Index maintenance.** `write()` and `delete()` keep the index
     * consistent with the on-disk state in O(m) per call (the entry's
     * tokenIds count). The index is purely in-memory; each `SentLedgerWriter`
     * instance re-derives it on first lookup, so a process restart
     * naturally rebuilds.
     *
     * **Cross-replica staleness.** If a remote peer tombstones an entry
     * via a synchronised `ProfileDatabase`, the local in-memory index
     * does not see the eviction (the local `delete()` was never called).
     * The verify-on-hit step catches this: when the bucket is non-empty
     * but every referenced entry returns `null` from `readOne()`, the
     * stale ids are evicted from the index and the call returns `false`.
     * Subsequent calls for the same tokenId are O(1) misses.
     *
     * **Storage scale.** Typical wallets carry <1k SENT entries; m ~ 1-4.
     * The duplicate-bundle guard (which calls `contains()` per-token
     * per-send) is the load-bearing consumer.
     */
    contains(tokenId: string): Promise<boolean>;
    /**
     * Convenience: return all SENT entries that include `tokenId` in
     * their `tokenIds`. Used by tooling and tests that need the full
     * delivery history of a single token (a token MAY appear in multiple
     * SENT entries when it was re-sent intentionally).
     *
     * **Cost contract.** Same lazy-index backing as {@link contains}. The
     * first call is O(n × m); subsequent calls are O(k) where k is the
     * number of entries containing `tokenId` (typically 1).
     */
    findByTokenId(tokenId: string): Promise<ReadonlyArray<UxfSentLedgerEntry>>;
    /**
     * OUTBOX-SEND-FOLLOWUPS item #3 — lazy-build the in-memory
     * `tokenId → entryId` index from the durable SENT-ledger state.
     *
     * Cheap re-entry: if the index is already built (`tokenIndex !== null`),
     * this is a no-op. If a prior maintenance step invalidated the index
     * by setting it back to `null` (defensive on unexpected throws), the
     * next lookup rebuilds.
     *
     * Cost: O(n) decrypts (mirrors `readAll()`), once per index lifetime.
     */
    private ensureIndex;
    /**
     * OUTBOX-SEND-FOLLOWUPS item #3 — incremental index maintenance after
     * a successful {@link write}. No-op when the index hasn't been built
     * yet ({@link ensureIndex} will catch up on first lookup).
     *
     * Handles the second-write-wins case: if a prior entry existed at the
     * same id with a different tokenIds set, the old tokenIds are
     * removed from the index before the new ones are added.
     */
    private updateIndexAfterWrite;
    /**
     * OUTBOX-SEND-FOLLOWUPS item #3 — incremental index maintenance after
     * a successful {@link delete}. Removes the entry's contribution from
     * every tokenId bucket and drops it from the reverse map. No-op when
     * the index hasn't been built yet OR when the id is unknown to the
     * index (idempotent delete-of-absent).
     */
    private removeFromIndexAfterDelete;
    /**
     * Drop entries from the index that {@link contains} discovered to
     * be stale (tombstoned remotely or otherwise unreadable). Mirrors
     * {@link removeFromIndexAfterDelete} but acts on multiple ids in
     * one pass. Safe to call even when the index hasn't been built
     * (no-op).
     */
    private evictStaleEntries;
    private collectObservedLamports;
    /**
     * Issue #166 P1 #2 — check whether the slot at `id` is currently a
     * tombstone. Returns the tombstone metadata (lamport, deletedAt) or
     * null. Mirrors OutboxWriter.readTombstoneAt.
     */
    private readTombstoneAt;
    /**
     * Issue #166 P1 #2 — discriminated-union slot reader. Mirrors
     * OutboxWriter.readSlotShape.
     */
    private readSlotShape;
    private writeRaw;
    private readDecoded;
}

type ProviderStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
interface ProviderMetadata {
    readonly id: string;
    readonly name: string;
    readonly type: 'local' | 'cloud' | 'p2p' | 'network';
    readonly description?: string;
}
interface BaseProvider extends ProviderMetadata {
    connect(config?: unknown): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getStatus(): ProviderStatus;
}
interface Identity {
    /** 33-byte compressed secp256k1 public key (for L3 chain) */
    readonly chainPubkey: string;
    /** L1 address (alpha1...) */
    readonly l1Address: string;
    /** L3 DIRECT address (DIRECT://...) */
    readonly directAddress?: string;
    readonly ipnsName?: string;
    readonly nametag?: string;
}
interface FullIdentity extends Identity {
    readonly privateKey: string;
}
/**
 * Minimal data stored in persistent storage for a tracked address.
 * Only contains user state — derived fields are computed on load.
 */
interface TrackedAddressEntry {
    /** HD derivation index (0, 1, 2, ...) */
    readonly index: number;
    /** Whether this address is hidden from UI display */
    hidden: boolean;
    /** Timestamp (ms) when this address was first activated */
    readonly createdAt: number;
    /** Timestamp (ms) of last modification */
    updatedAt: number;
}

/**
 * Storage Provider Interface
 * Platform-independent storage abstraction
 */

/**
 * Basic key-value storage provider
 * All operations are async for platform flexibility
 */
interface StorageProvider extends BaseProvider {
    /**
     * Set identity for scoped storage
     */
    setIdentity(identity: FullIdentity): void;
    /**
     * Get value by key
     */
    get(key: string): Promise<string | null>;
    /**
     * Set value by key
     */
    set(key: string, value: string): Promise<void>;
    /**
     * Optional: set value with an explicit OpLog entry type for W11
     * originated-tag discipline. Callers that know the semantic
     * classification of the write (e.g. `'token_send'` on a transfer,
     * `'cache_index'` on a dedup table write) SHOULD use this to
     * stamp the storage-level envelope so peers replicating the
     * entry see the correct classification after the receiver-
     * authority downgrade.
     *
     * Providers that do not implement an OpLog-envelope storage layer
     * (plain IndexedDB / file KV) omit this method entirely; callers
     * fall back to `set()` and lose the stamp but the operation
     * otherwise behaves identically. See profile/aggregator-pointer/
     * originated-tag.ts for the `OpLogEntryType` union.
     *
     * Only declared here as a loose `string` type to avoid a circular
     * dependency into profile/aggregator-pointer. Implementations
     * validate via `assertOriginTagLocal`.
     */
    setEntry?(key: string, value: string, entryType: string): Promise<void>;
    /**
     * Wave G.6: optional atomic multi-key write.
     *
     * Implementations that support cross-key transactions (IndexedDB,
     * proper-lockfile-guarded file storage) commit all entries
     * atomically — either every key is written or none are. Callers
     * use this for invariants that span multiple keys (e.g. wallet
     * metadata: encrypted mnemonic + base path + derivation mode +
     * source — all four must land together so a partial-write doesn't
     * derive the wrong identity from defaults).
     *
     * If the provider does not implement this, callers fall back to
     * sequential `set()` calls with best-effort rollback on partial
     * failure (see core/Sphere.ts storeMnemonic for the pattern).
     */
    setMany?(entries: ReadonlyArray<readonly [key: string, value: string]>): Promise<void>;
    /**
     * Remove key
     */
    remove(key: string): Promise<void>;
    /**
     * Check if key exists
     */
    has(key: string): Promise<boolean>;
    /**
     * Get all keys with optional prefix filter
     */
    keys(prefix?: string): Promise<string[]>;
    /**
     * Clear all keys with optional prefix filter
     */
    clear(prefix?: string): Promise<void>;
    /**
     * Save tracked addresses (only user state: index, hidden, timestamps)
     */
    saveTrackedAddresses(entries: TrackedAddressEntry[]): Promise<void>;
    /**
     * Load tracked addresses
     */
    loadTrackedAddresses(): Promise<TrackedAddressEntry[]>;
}
interface HistoryRecord {
    /** Composite dedup key (primary key) — e.g. "RECEIVED_v5split_abc123" */
    dedupKey: string;
    /** UUID for public API consumption */
    id: string;
    type: 'SENT' | 'RECEIVED' | 'SPLIT' | 'MINT';
    amount: string;
    coinId: string;
    symbol: string;
    timestamp: number;
    transferId?: string;
    /** Genesis tokenId this entry relates to (used for dedup) */
    tokenId?: string;
    senderPubkey?: string;
    senderAddress?: string;
    senderNametag?: string;
    recipientPubkey?: string;
    recipientAddress?: string;
    recipientNametag?: string;
    /** Optional memo/message attached to the transfer */
    memo?: string;
    /** All token IDs in a combined transfer (V6 bundle breakdown) */
    tokenIds?: Array<{
        id: string;
        amount: string;
        source: 'split' | 'direct';
    }>;
}
/**
 * Storage result types
 */
interface SaveResult {
    success: boolean;
    cid?: string;
    error?: string;
    timestamp: number;
}
interface LoadResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    source: 'local' | 'remote' | 'cache';
    timestamp: number;
}
interface SyncResult<T = unknown> {
    success: boolean;
    merged?: T;
    added: number;
    removed: number;
    conflicts: number;
    error?: string;
}
/**
 * Token-specific storage provider
 * Handles token persistence with sync capabilities
 */
interface TokenStorageProvider<TData = unknown> extends BaseProvider {
    /**
     * Set identity for storage scope
     */
    setIdentity(identity: FullIdentity): void;
    /**
     * Initialize provider (called once after identity is set)
     */
    initialize(): Promise<boolean>;
    /**
     * Shutdown provider.
     *
     * Issue #239 — `options.force` selects between the normal-mode
     * shutdown contract (must verify remote durability before returning;
     * see {@link ShutdownOptions}) and the fast-exit contract for tests /
     * ungraceful-crash simulation. Providers without a remote-durability
     * boundary (file/IndexedDB) silently ignore the options.
     */
    shutdown(options?: ShutdownOptions): Promise<void>;
    /**
     * Save token data
     */
    save(data: TData): Promise<SaveResult>;
    /**
     * Load token data
     */
    load(identifier?: string): Promise<LoadResult<TData>>;
    /**
     * Sync local data with remote
     */
    sync(localData: TData): Promise<SyncResult<TData>>;
    /**
     * Force any pending/debounced flush to complete and await durability.
     *
     * Optional — providers without write-behind buffers (filesystem,
     * synchronous IndexedDB) can omit it; callers MUST treat absence as
     * "already durable on save() return" (i.e., no-op).
     *
     * Used to enforce the at-least-once invariant for inbound Nostr-
     * delivered tokens: `payments.handleIncomingTransfer` calls this on
     * every provider after `save()` so the Nostr `since` filter is only
     * advanced when the token has been persisted to a durable store. If
     * the provider's flush fails (rejects), the caller treats the inbound
     * event as NOT durable and does NOT advance the `since` filter, so
     * the event is re-replayed on next reconnect (idempotent because
     * `addToken` already dedupes by `(tokenId, stateHash)`).
     *
     * Implementations MUST:
     *  - Cancel any armed debounce timer (do not wait its full window).
     *  - If a flush is already in-flight, await it.
     *  - If `pendingData` is non-null after that, fire a fresh flush and
     *    await it. Loop until `pendingData` is null OR timeout elapses.
     *  - Throw a `SphereError('TIMEOUT')` if `timeoutMs` elapses with
     *    pendingData still non-null.
     *  - Surface any flush failure (POINTER_MONOTONICITY_VIOLATION etc.)
     *    by rejecting — caller decides whether to retry or skip ack.
     *
     * @param timeoutMs Max wall-clock time before rejecting. Default 30s.
     */
    awaitNextFlush?(timeoutMs?: number): Promise<void>;
    /**
     * Check if data exists
     */
    exists?(identifier?: string): Promise<boolean>;
    /**
     * Clear all data
     */
    clear?(): Promise<boolean>;
    /**
     * Create a new independent instance of this provider for a different address.
     * Used by per-address module architecture — each address gets its own
     * TokenStorageProvider instance to avoid cross-address data contamination.
     * If not implemented, the provider cannot be used in multi-address mode.
     */
    createForAddress?(): TokenStorageProvider<TData>;
    /**
     * Subscribe to storage events
     */
    onEvent?(callback: StorageEventCallback): () => void;
    /** Store a history entry (upsert by dedupKey) */
    addHistoryEntry?(entry: HistoryRecord): Promise<void>;
    /** Get all history entries sorted by timestamp descending */
    getHistoryEntries?(): Promise<HistoryRecord[]>;
    /** Check if a history entry exists by dedupKey */
    hasHistoryEntry?(dedupKey: string): Promise<boolean>;
    /** Clear all history entries */
    clearHistory?(): Promise<void>;
    /** Bulk import history entries (skip existing dedupKeys). Returns count of newly imported. */
    importHistoryEntries?(entries: HistoryRecord[]): Promise<number>;
}
type StorageEventType = 'storage:saving' | 'storage:saved' | 'storage:loading' | 'storage:loaded' | 'storage:error' | 'storage:remote-updated' | 'sync:started' | 'sync:completed' | 'sync:conflict' | 'sync:error'
/**
 * Issue #239 — emitted by `LifecycleManager.shutdown` when the
 * remote-durability verification gate exhausts its deadline on at
 * least one leg. `data` carries `{ leg, cidsInQuestion, lastError?,
 * reason? }` so operators see which path stalled (`pin-verify` /
 * `pointer-read-back` / `pending-publish-retry`) and which CIDs are
 * affected. Shutdown continues to tear down regardless; the event is
 * informational so operators can investigate cross-process recovery
 * gaps. Skipped when `Sphere.destroy({ force: true })` is used.
 */
 | 'shutdown:verification-timeout'
/**
 * Issue #241 — emitted when the aggregator pointer publish path
 * returns a TRANSIENT failure for a just-flushed bundle. The flush
 * itself succeeded (CAR pinned + bundle ref written + pin verified
 * fetchable), but the aggregator publish stamped `pendingPublishCid`
 * for retry. `data` carries `{ cid, code? }` — `cid` is the bundle
 * CID and `code` is the pointer-layer error code when classifiable
 * (e.g., `AGGREGATOR_POINTER_WALKBACK_FLOOR`, `NETWORK_ERROR`).
 *
 * Distinct from `storage:error` (which is a fatal-class signal). A
 * pending-publish event tells the operator that the local state is
 * durable AND cross-device readers via OrbitDB sync will see the new
 * state, but COLD-IMPORT discovery (a fresh device with only the
 * master key) will read the previous pointer version until the
 * retry succeeds. The retry happens automatically on the next flush
 * or pointer poll.
 */
 | 'storage:pending-publish'
/**
 * Issue #241 — emitted when discovery / publish observes the
 * aggregator's read replica lagging behind a version the wallet has
 * already locally confirmed. Concretely: Phase 3 walkback returns
 * `AGGREGATOR_POINTER_WALKBACK_FLOOR` after the
 * `WALKBACK_FLOOR_RETRY_BUDGET` exponential-backoff window
 * (~15s) without the replica catching up. `data` carries
 * `{ localVersion, cid? }` so operators can correlate with
 * aggregator-side replication metrics.
 *
 * Informational only — the publish path's `pendingPublishCid`
 * marker is already stamped (treated as transient), and the
 * next flush / pointer poll continues to retry. This event lets
 * operators distinguish "publish stuck on replica lag" from
 * other transient classes (network errors, etc.).
 */
 | 'storage:replica-lag'
/**
 * Issue #247 — emitted when the WALKBACK_FLOOR catch arm
 * successfully reconciled the wallet's local pointer version
 * DOWNWARD to match the aggregator's currently-visible (same-
 * author) version. Indicates a same-identity cross-device race
 * was resolved: two devices sharing one wallet identity each
 * published pointers ahead of one another, and this device
 * adopted the lower visible value (authored by this wallet's
 * own signing key per the W7 author check) as its baseline so
 * the next publish operates from a non-conflicting floor.
 *
 * `data` carries `{ cid, fromVersion, toVersion }`:
 *   - `cid`         the bundle CID the publish was attempting
 *   - `fromVersion` the wallet's local version before reconcile
 *   - `toVersion`   the version the wallet adopted (lower; same
 *                   author per XOR-decode authentication)
 *
 * Informational only — the publish path's `pendingPublishCid`
 * marker remains stamped so the next flush / pointer poll
 * re-attempts the publish from the reconciled baseline. The
 * 60s WALKBACK_FLOOR throttle is INTENTIONALLY NOT armed in
 * this case (reconciliation removed the floor; the retry has
 * a fresh chance to land).
 */
 | 'storage:replica-lag-reconciled'
/**
 * RFC-251 Approach D / issue #255 Problem B — emitted by the
 * lifecycle manager IMMEDIATELY after a pointer commit succeeds at
 * the aggregator. The wiring layer (typically `Sphere`) subscribes
 * to this event and emits an authenticated `pointer-win` broadcast
 * over Nostr so sibling same-identity devices can adopt V=N without
 * waiting for the aggregator's 30-60 s read-replica lag.
 *
 * `data` carries `{ cid, version, attemptsUsed }`. The subscriber
 * MUST build the signed payload via
 * `signWinBroadcastPayload(pointer.getSignerForWinBroadcast().signer, ...)`
 * and publish via the wallet's transport with the
 * `pointer-win:<signingPubKeyHex>` tag.
 *
 * Informational only. No-op when the wiring layer doesn't
 * subscribe — pointer publishes still succeed and siblings still
 * converge via the existing WALKBACK_FLOOR + reconcile path
 * (just slower, ~60-90 s vs ~1 s).
 */
 | 'storage:pointer-published';
interface StorageEvent {
    type: StorageEventType;
    timestamp: number;
    data?: unknown;
    error?: string;
    /**
     * Steelman³⁸ warning: typed error code preserved across the layer
     * boundary so consumers can route on it (e.g., `CID_REF_CORRUPT`,
     * `AGGREGATOR_POINTER_TRUST_BASE_STALE`). Without this, the typed
     * pointer-layer / profile-layer error taxonomy was flattened to a
     * `error: string` at this boundary.
     */
    code?: string;
    /** The original error object for cause-chain debugging. */
    cause?: unknown;
}
type StorageEventCallback = (event: StorageEvent) => void;
/**
 * Issue #239 — options for `TokenStorageProvider.shutdown` and
 * `Sphere.destroy`. Providers with a remote-durability boundary
 * (Profile/OrbitDB+IPFS) interpret these to gate exit on cross-process
 * recoverability; simpler providers (file/IndexedDB) ignore them.
 */
interface ShutdownOptions {
    /**
     * Skip the remote-durability verification gate and tear down
     * immediately. The provider stamps a `pendingPublishCid` marker for
     * any unconfirmed publish so the next process boot retries via the
     * cold-start recovery path. Used by E2E tests to simulate ungraceful
     * crash and by operators who need a fast forced exit. Default `false`
     * — production callers MUST omit this so the normal-mode contract
     * applies.
     */
    readonly force?: boolean;
    /**
     * Optional free-form reason recorded in `shutdown:verification-timeout`
     * payloads. Useful for operator triage when the wallet is being
     * destroyed in response to a specific event (sign-out, error, etc.).
     */
    readonly reason?: string;
    /**
     * Override the total verification deadline in ms. Default 30 000.
     * Applies only when `force !== true`.
     */
    readonly verificationDeadlineMs?: number;
}
interface TxfStorageDataBase {
    _meta: TxfMeta;
    _tombstones?: TxfTombstone[];
    _outbox?: TxfOutboxEntry[];
    _sent?: TxfSentEntry[];
    _invalid?: TxfInvalidEntry[];
    _history?: HistoryRecord[];
    /**
     * Audit collection for structurally-valid-but-unspendable tokens
     * (NOT_OUR_CURRENT_STATE / UNSPENDABLE_BY_US dispositions). Each
     * entry is persisted to its own OrbitDB key under the prefix
     * `${addr}.audit.` per PROFILE-ARCHITECTURE.md §10.10. The
     * per-entry-key writer treats `id` as opaque, so T.1.E can widen
     * it to a composite `${tokenId}.${observedTokenContentHash}`
     * without further plumbing.
     */
    _audit?: TxfAuditEntry[];
    /**
     * Finalization queue for pending chain-mode transactions, keyed by
     * `id`. Persisted per UXF-TRANSFER-PROTOCOL §5.5 so a process
     * restart preserves in-flight finalizations.
     */
    _finalizationQueue?: TxfFinalizationQueueEntry[];
    [key: `_${string}`]: unknown;
}
interface TxfMeta {
    version: number;
    address: string;
    ipnsName?: string;
    formatVersion: string;
    updatedAt: number;
}
interface TxfTombstone {
    tokenId: string;
    stateHash: string;
    timestamp: number;
}
interface TxfOutboxEntry {
    id: string;
    status: string;
    tokenId: string;
    recipient: string;
    createdAt: number;
    data: unknown;
}
interface TxfSentEntry {
    tokenId: string;
    recipient: string;
    txHash: string;
    sentAt: number;
}
interface TxfInvalidEntry {
    tokenId: string;
    reason: string;
    detectedAt: number;
}
/**
 * Audit collection entry — a structurally valid token that the local
 * wallet cannot currently spend (NOT_OUR_CURRENT_STATE /
 * UNSPENDABLE_BY_US dispositions). Persisted under
 * `${addr}.audit.${id}` keys via the per-entry-key writer.
 *
 * `id` is the primary key for the per-entry-key layout. It MUST be
 * unique within the collection. T.1.E will populate it with the
 * composite `${tokenId}.${observedTokenContentHash}` shape declared
 * in PROFILE-ARCHITECTURE.md §10.10; this base interface keeps the
 * field opaque so writers/readers do not need to be updated when the
 * composite form lands.
 */
interface TxfAuditEntry {
    /** Opaque primary key. T.1.E uses `${tokenId}.${observedTokenContentHash}`. */
    id: string;
    tokenId: string;
    /** Disposition tag — e.g. 'NOT_OUR_CURRENT_STATE', 'UNSPENDABLE_BY_US'. */
    disposition: string;
    detectedAt: number;
    /** Optional content hash recorded at detection time. */
    observedTokenContentHash?: string;
    /** Optional human-readable note from the validator. */
    note?: string;
}
/**
 * Finalization queue entry — a pending chain-mode finalization that
 * survives process restarts per UXF-TRANSFER-PROTOCOL §5.5.
 * Persisted under `${addr}.finalizationQueue.${id}` keys.
 *
 * `id` is the request id (e.g. transfer/request id) and is the
 * primary key for the per-entry-key layout.
 */
interface TxfFinalizationQueueEntry {
    /** Opaque request id. */
    id: string;
    /** Lifecycle status of the finalization request. */
    status: string;
    enqueuedAt: number;
    /** Caller-supplied payload — kept opaque at the storage layer. */
    payload?: unknown;
}

/**
 * Originated-tag discipline (T-B6, SPEC §10.2.3, §10.2.3.1).
 *
 * Every OpLog write MUST carry an `originated` tag indicating who initiated
 * the write.  Two separate validators enforce context-specific rules:
 *
 *   assertOriginTagLocal       — local writes only ('user' or 'system', NOT 'replicated')
 *   assertOriginTagReplicated  — replicated writes only (MUST be 'replicated')
 *
 * Fail-closed: missing or unrecognised tags are rejected with
 * SECURITY_ORIGIN_MISMATCH.  `assertOriginTag` (the original single-function
 * variant) has been removed — it accepted 'replicated' for all entry types,
 * which created a forgery bypass if callers forgot to call downgradeForReplication.
 */
declare const USER_ACTION_TYPES: readonly ["token_send", "token_receive", "nametag_register", "dm_send", "dm_receive", "invoice_mint", "invoice_pay", "invoice_close", "invoice_cancel", "swap_propose", "swap_accept", "swap_deposit"];
type UserActionType = (typeof USER_ACTION_TYPES)[number];
declare const SYSTEM_ACTION_TYPES: readonly ["session_receipt", "cache_index", "last_opened_ts"];
type SystemActionType = (typeof SYSTEM_ACTION_TYPES)[number];
type OpLogEntryType = UserActionType | SystemActionType;

/**
 * Operational state extracted from `TxfStorageDataBase`. Mirrored from
 * the facade's private alias so sub-modules can speak in the same
 * vocabulary without a circular import on the facade's class file.
 */
interface OperationalState {
    tombstones: TxfTombstone[];
    outbox: TxfOutboxEntry[];
    sent: TxfSentEntry[];
    invalid: TxfInvalidEntry[];
    history: HistoryRecord[];
    mintOutbox: unknown[];
    invalidatedNametags: unknown[];
    audit: TxfAuditEntry[];
    finalizationQueue: TxfFinalizationQueueEntry[];
}
/**
 * Cross-seam shared-state contract exposed by the facade to its
 * sub-modules. All getters/setters mutate state on the facade itself —
 * the sub-modules are stateless logic bags.
 */
interface ProfileTokenStorageHost {
    readonly db: ProfileDatabase;
    readonly ipfsGateways: string[];
    readonly options: ProfileTokenStorageProviderOptions | undefined;
    readonly localCache: StorageProvider | null;
    readonly flushDebounceMs: number;
    readonly eventCallbacks: Set<StorageEventCallback>;
    /**
     * Issue #236 — accessor for the local Helia node so the flush and load
     * paths can use the local on-disk blockstore as the primary CAR store.
     *
     * Resolved lazily on each call so a `connect()` that lands after the
     * host is wired (or a `close()` that nulls it out before shutdown) is
     * observed by the next pin/fetch operation. Returns `null` when the
     * underlying `ProfileDatabase` is disconnected, when the adapter
     * predates issue #236 (no `getHelia` method), or when the adapter does
     * not run a local Helia (test stubs).
     *
     * Callers cast the returned value to a structural `{ blockstore: ... }`
     * shape and treat `null` as "no local fast-path; HTTP gateways only".
     */
    getHelia(): unknown | null;
    getStatus(): ProviderStatus;
    setStatus(s: ProviderStatus): void;
    getInitialized(): boolean;
    setInitialized(b: boolean): void;
    getIsShuttingDown(): boolean;
    setIsShuttingDown(b: boolean): void;
    getIdentity(): FullIdentity | null;
    setIdentityState(id: FullIdentity | null): void;
    getEncryptionKey(): Uint8Array | null;
    setEncryptionKey(k: Uint8Array | null): void;
    getComputedAddressId(): string | null;
    setComputedAddressId(id: string | null): void;
    getReplicationUnsub(): (() => void) | null;
    setReplicationUnsub(fn: (() => void) | null): void;
    getPendingData(): TxfStorageDataBase | null;
    setPendingData(d: TxfStorageDataBase | null): void;
    getFlushTimer(): ReturnType<typeof setTimeout> | null;
    setFlushTimer(t: ReturnType<typeof setTimeout> | null): void;
    getFlushPromise(): Promise<void> | null;
    setFlushPromise(p: Promise<void> | null): void;
    getLastPinnedCid(): string | null;
    setLastPinnedCid(c: string | null): void;
    /**
     * The most recent UXF bundle CID this provider successfully pinned
     * to IPFS and wrote to the OrbitDB bundle index. Distinct from
     * `lastPinnedCid` (a retry cache cleared after the post-pin OrbitDB
     * write succeeds) — this field survives across flushes for the life
     * of the provider so `LifecycleManager.shutdown()` can HEAD-verify
     * the bundle CAR is actually served by ≥1 IPFS gateway before
     * returning. See issue #239.
     *
     * Null when no successful flush has run yet (cold-start before any
     * save), in which case shutdown skips the bundle-leg verification.
     */
    getLastPinnedBundleCid(): string | null;
    setLastPinnedBundleCid(c: string | null): void;
    /**
     * Issue #239 — most-recent CID pair that successfully passed the
     * per-flush remote-durability gate ({@link verifyFlushDurability}).
     * The shutdown gate ({@link awaitRemoteDurability}) consults these
     * to short-circuit its own verification: if the pin / pointer
     * watermark already matches what shutdown would verify, the gate
     * runs as a fast no-op (saves 15-30s of redundant HEAD + aggregator
     * round-trips per destroy()).
     *
     * Null until the first successful per-flush verification. Cleared
     * implicitly by a fresh flush on different CIDs (the next per-flush
     * gate either succeeds and updates them, or fails and leaves them
     * pointing at the previous verified state — shutdown still runs the
     * legs on the newer CIDs).
     */
    getLastVerifiedBundleCid(): string | null;
    setLastVerifiedBundleCid(c: string | null): void;
    getLastVerifiedSnapshotCid(): string | null;
    setLastVerifiedSnapshotCid(c: string | null): void;
    /**
     * The most recent CID observed via the aggregator pointer layer
     * (cold-start `recoverLatest()` or the periodic poll). Tracked so
     * `flushToIpfs()` can short-circuit a no-data republish when the
     * about-to-publish CAR already matches the authoritative pointer
     * (i.e., another device already anchored the same merged state).
     */
    getLastDiscoveredPointerCid(): string | null;
    setLastDiscoveredPointerCid(c: string | null): void;
    /**
     * A CID whose CAR is pinned to IPFS and whose OrbitDB bundle ref is
     * written, but whose pointer publish (aggregator anchor) is still
     * outstanding due to a transient failure. The next flush AND the
     * periodic pointer-poll re-attempt the publish at start; on success
     * the field is cleared.
     *
     * Issue #241: while non-null, the at-least-once Nostr gate
     * (`PaymentsModule.handleIncomingTransfer`) is NO LONGER held
     * closed — pin durability is the cross-device recoverability
     * invariant; the aggregator publish is a liveness optimization
     * for cold-import discovery and is retried in background.
     * Operators see the outstanding state via `storage:pending-publish`
     * (and `storage:replica-lag` for the WALKBACK_FLOOR case).
     *
     * Persisted to `localCache` under the key
     * `STORAGE_KEYS_GLOBAL.PROFILE_PENDING_PUBLISH_CID_PREFIX + addressId`
     * for crash-safety so a process restart resumes the retry rather
     * than abandoning the publish silently.
     */
    getPendingPublishCid(): string | null;
    setPendingPublishCid(c: string | null): void;
    getKnownBundleCids(): Set<string>;
    setKnownBundleCids(s: Set<string>): void;
    getLastLoadedData(): TxfStorageDataBase | null;
    setLastLoadedData(d: TxfStorageDataBase | null): void;
    /**
     * Set of bundle CIDs that load() merged into the most recent
     * `lastLoadedData`. Read by FlushScheduler's runtime monotonicity
     * assertion to detect a stale baseline (OrbitDB has bundles not
     * represented in lastLoadedData → flush would silently drop tokens
     * from the published pointer V_n's CAR).
     *
     * Null when no successful load() has run yet (assertion has nothing
     * to compare against and skips).
     */
    getLastLoadedFromBundleCids(): Set<string> | null;
    setLastLoadedFromBundleCids(s: Set<string> | null): void;
    getLastTokenManifest(): TokenManifest | null;
    setLastTokenManifest(m: TokenManifest | null): void;
    getAddressId(): string;
    log(message: string): void;
    emitEvent(event: StorageEvent): void;
    buildErrorEvent(type: 'storage:error' | 'sync:error', err: unknown, overrideCode?: string): StorageEvent;
    writeProfileKey(key: string, value: string): Promise<void>;
    readProfileKey(key: string): Promise<string | null>;
    readProfileKeyJson<T>(key: string): Promise<T | null>;
    /** Snapshot pendingData and run a single IPFS pin + OrbitDB write. */
    flushToIpfs(): Promise<void>;
    /**
     * Refresh `lastLoadedFromBundleCids` (and `lastLoadedData`) by
     * running a fresh `load()` against the current OrbitDB bundle
     * index. Called by FlushScheduler on a `POINTER_MONOTONICITY_VIOLATION`
     * to repair a stale baseline before the next flush attempt.
     *
     * MUST be a no-op when a flush is already in flight (load() awaits
     * `flushPromise`, so calling from inside flushToIpfs would deadlock).
     * The facade implementation handles this by skipping the refresh
     * when invoked synchronously from within the current flush body.
     *
     * Returns true on successful refresh; false on internal load failure
     * (caller proceeds to the next strategy — typically throw the
     * original violation so the at-least-once gate refuses the ack).
     */
    refreshBaselineForMonotonicity(): Promise<boolean>;
    extractTokensFromTxfData(data: TxfStorageDataBase): Map<string, unknown>;
    extractOperationalState(data: TxfStorageDataBase): OperationalState;
    writeOrbitOperationalState(opState: OperationalState): Promise<void>;
    writeLocalDerivedCache(opState: {
        tombstones: TxfTombstone[];
        sent: TxfSentEntry[];
        history: HistoryRecord[];
    }): Promise<boolean>;
    /**
     * Item #15 Phase C — signal the host that some local profile state
     * has changed and should be included in the next lean-snapshot
     * publish. Called by per-writer mutations (OutboxWriter,
     * SentLedgerWriter, BundleIndex, etc.) and by JOIN-applied remote
     * changes. The host's implementation debounces these signals via the
     * FlushScheduler (Phase C.2/D wires the actual snapshot build).
     *
     * MUST be non-throwing — writers invoke this inside guarded
     * try/catch so a misbehaving host cannot break a mutation path.
     */
    notifyProfileDirty(): void;
    /**
     * Item #15 Phase D.1b — synchronously invoke the wired
     * `onProfileDirtyFlush` callback (lean-snapshot build + pin +
     * publish) coordinated with the dispatch debounce so we don't
     * double-publish. Used by `FlushScheduler.flushToIpfs()` to publish
     * a SNAPSHOT CID via the aggregator pointer layer instead of the
     * legacy BUNDLE CID.
     *
     * Semantics:
     *   - Returns `null` when no `onProfileDirtyFlush` callback is wired
     *     (legacy tests / providers without the Phase C.3 closure).
     *     Caller falls back to the legacy bundle-CID publish.
     *   - Coordinates with the dirty-flush debouncer: cancels any armed
     *     timer, awaits any in-flight dispatch, clears the pending latch
     *     before running so a follow-up `notifyProfileDirty()` re-arms
     *     for the next signal.
     *   - On success, returns the publisher's structured result.
     *   - On an unexpected throw from the callback (programmer error or
     *     transient publish failure surfaced as `runProfileDirtyFlush`'s
     *     internal throw), emits `storage:error`
     *     (`PROFILE_DIRTY_FLUSH_FAILED`) and re-throws so the caller
     *     can decide ack semantics (e.g. flush-scheduler propagates to
     *     `forceFlushSerialized`'s rejection arm to hold the at-least-
     *     once gate closed).
     *
     * Distinct from `notifyProfileDirty()` (which schedules a debounced
     * fire) — this entry point fires NOW and returns the result.
     */
    publishSnapshotIfWired(): Promise<ProfileSnapshotPublishResult | null>;
    /**
     * Issue #239 — per-flush remote-durability verification.
     *
     * Delegates to `LifecycleManager.verifyFlushDurability` so the
     * FlushScheduler can run the same HEAD-verify + aggregator read-back
     * legs that the shutdown gate uses, but on the CIDs from the
     * just-completed flush. Throws on verification failure so the at-
     * least-once gate (`awaitNextFlush` → caller refuses the Nostr ack)
     * propagates the failure across the pipeline.
     *
     * Called by `FlushScheduler.flushToIpfs` AFTER pin + publish succeed.
     * Returns void on success; throws an error with `code:
     * 'FLUSH_DURABILITY_TIMEOUT'` on any leg exhausting the deadline.
     *
     * @param bundleCid    UXF bundle CID just pinned via flushToIpfs.
     * @param snapshotCid  Snapshot CID just published (null if no
     *                      pointer layer is wired).
     * @param deadlineMs   Wall-clock budget for verification. Tracked
     *                      independently of any caller deadline; the
     *                      flush body picks it up from
     *                      `options.flushVerificationDeadlineMs`.
     */
    verifyFlushDurability(bundleCid: string, snapshotCid: string | null, deadlineMs: number): Promise<void>;
    /**
     * Item #15 Phase E follow-up — pull-side symmetric counterpart to
     * {@link publishSnapshotIfWired}. Fetches the snapshot CAR for the
     * given CID, parses it as a {@link LeanProfileSnapshot}, and
     * dispatches per-writer JOIN through the factory-wired snapshot
     * applier. Used by `LifecycleManager.runPointerPollOnce` and
     * `recoverFromAggregatorPointerBestEffort` so the periodic-poll and
     * cold-start recovery paths consume the pointer's CID as a snapshot
     * (Item #15) rather than as a UXF bundle CID (the pre-Item-#15
     * legacy that wrote the snapshot bytes into the bundle index and
     * blew up on the next load()).
     *
     * Semantics:
     *   - Returns `null` when no `onApplySnapshot` callback is wired
     *     (legacy tests / providers without the factory closure). Caller
     *     logs and skips — no legacy bundle-CID fallback per Phase E.
     *   - On success: returns the dispatcher's
     *     {@link ApplySnapshotResult} (counters, joinedAny, etc.).
     *   - On hard failure (CAR fetch, parse, or dispatcher throw):
     *     re-throws so the caller's outer try/catch can log + skip the
     *     re-arm round. The pointer cursor is NOT advanced by this path
     *     (cursor advancement only happens through `fetchAndJoin` on the
     *     reconcile-loop path); a transient failure on the periodic
     *     poll is best-effort.
     *
     * IMPORTANT: this method does NOT touch the pointer's local-version
     * cursor — both the poll and recovery paths originate outside the
     * cursor-advancement protocol (they consume `recoverLatest()` which
     * the pointer layer already classified). The cursor advance is owned
     * by the reconcile loop's `fetchAndJoin` callback exclusively.
     */
    applySnapshotIfWired(cidString: string): Promise<ApplySnapshotResult | null>;
}

/**
 * BundleIndex
 *
 * Owns the OrbitDB-side bundle reference catalogue that
 * `ProfileTokenStorageProvider` uses to enumerate UXF bundles attached
 * to the wallet identity. Bundle refs live under the `tokens.bundle.*`
 * prefix, are individually encrypted with the per-wallet key, and are
 * wrapped in a system-stamped envelope (T-D11) so peers replicating the
 * ref see it as a system event rather than a forged user action.
 *
 * Cross-seam reads:
 *   - `FlushScheduler.flushToIpfs()` → `addBundle()` after pinning a
 *     fresh CAR; `listActiveBundles()` to validate a cached pinned CID
 *     and to drive consolidation; `shouldConsolidate()` to gate the
 *     consolidation pass.
 *   - The facade's `load()` / `sync()` → `listActiveBundles()` to
 *     enumerate bundles for the JOIN pass.
 *   - The facade's `clear()` → wipes all `tokens.bundle.*` keys plus
 *     `knownBundleCids`.
 *   - The replication handler → `refreshKnownBundles()` to detect newly
 *     replicated bundles.
 *
 * Cross-seam mutations: `knownBundleCids` (a `Set<string>`) is owned by
 * this module but stored on the facade (via host getters/setters) so
 * `clear()` and shutdown observers can read the same source of truth.
 *
 * @module profile/profile-token-storage/bundle-index
 */

declare class BundleIndex implements ProfileSyncWriter {
    private readonly host;
    constructor(host: ProfileTokenStorageHost);
    /**
     * List all bundle refs from OrbitDB, filtered to active status.
     */
    listActiveBundles(): Promise<Map<string, UxfBundleRef>>;
    /**
     * List all bundle refs from OrbitDB (all statuses).
     *
     * Bundle refs are written as system-stamped envelopes by
     * `addBundle` (T-D11). Legacy wallets may have raw-bytes entries
     * (pre-envelope writes) — we detect those by attempting the
     * structured decode first, falling back to treating the stored
     * bytes as the encrypted payload directly. On the fallback path
     * the entry acts as a `v=0` legacy entry under the oplog-schema
     * contract (synthetic `originated='system'` at read time via the
     * adapter's legacy-wrapping).
     */
    listBundles(): Promise<Map<string, UxfBundleRef>>;
    /**
     * Write a bundle ref to OrbitDB under a system-stamped envelope
     * (T-D11 W11). Bundle events are system-generated cache-index
     * writes; they are NOT user-actions (they reflect a token-pool
     * flush produced by the wallet itself, not a user intent to
     * commit tokens). Stamping `originated='system'` means peers
     * replicating the ref see it as a replicated system event after
     * the orbitdb-adapter's read-time downgrade, not a forged user
     * action.
     *
     * If the underlying adapter lacks `putEntry` (very old code paths
     * or test stubs), fall back to `db.put` of raw encrypted bytes —
     * readers auto-wrap raw writes as legacy entries (`v=0`, synthetic
     * `type='cache_index'`, `originated='system'`), so the semantic
     * outcome is identical and replication remains safe.
     */
    addBundle(cid: string, ref: UxfBundleRef): Promise<void>;
    /**
     * Check if the number of active bundles exceeds the consolidation
     * threshold.
     */
    shouldConsolidate(): Promise<boolean>;
    /**
     * Refresh the local set of known bundle CIDs from OrbitDB.
     */
    refreshKnownBundles(): Promise<void>;
    /**
     * Return every `tokens.bundle.*` entry as raw on-disk bytes for the
     * lean-snapshot builder. Bytes are returned verbatim — the envelope
     * wrapper, encrypted payload, and JSON-encoded UxfBundleRef stay
     * intact so the receiving peer can persist them with a single
     * `db.put` and let its own `listBundles()` decode them transparently.
     *
     * **No tombstones to surface.** Bundle refs do not get tombstoned in
     * the current architecture — superseded refs transition via the
     * `status: 'superseded'` field on a fresh `addBundle()` write, not via
     * a tombstone marker. Phase B's tombstone-sticky rules therefore
     * never fire here; the merge degenerates to "absent → write, live +
     * live → no-op (first wins at Lamport=0)".
     *
     * Stable order: ascending lexicographic key.
     */
    snapshot(): Promise<ReadonlyArray<SnapshotEntry>>;
    /**
     * Apply a remote peer's bundle-index snapshot. Each remote entry
     * carries an envelope-wrapped, encrypted UxfBundleRef; the classifier
     * decodes + decrypts + parses + validates before the merge primitive
     * picks a winner.
     *
     * **Constant-Lamport semantics.** UxfBundleRef does not carry a
     * Lamport field, so `live + live` ties always favour local (the
     * first-wins behaviour matches Issue #166's refuse-write guard
     * semantics extended to this surface). If two replicas independently
     * transition the same CID from `active` to `superseded` after a
     * consolidation, both writes are observationally idempotent (the
     * resulting state is the same — superseded with the same
     * `supersededBy`).
     *
     * **Side-effect: known-CID refresh.** After a successful JOIN that
     * lands new bundles, this writer updates `knownBundleCids` so the
     * consolidation gate and replication handler observe the freshly-
     * landed refs.
     */
    joinSnapshot(remote: ReadonlyArray<SnapshotEntry>): Promise<JoinResult>;
    /**
     * Decode an envelope (if present), decrypt the inner payload, parse
     * as JSON, and validate the shape is a `UxfBundleRef`. Returns a
     * {@link ClassifiedSlot} on success or `null` on the remote path
     * for any failure (the JOIN counts as `remoteRejectedMalformed`).
     * On the local path, failure maps to `absent` so a well-formed
     * remote can land.
     *
     * UxfBundleRef shape (per `profile/types.ts`):
     *   - required: cid:string, status: 'active'|'superseded'|'unverified', createdAt:number
     *   - optional: device, supersededBy, removeFromProfileAfter, tokenCount
     */
    private classifyBundleBytes;
}

declare class ProfileTokenStorageProvider implements TokenStorageProvider<TxfStorageDataBase> {
    private readonly db;
    private readonly options?;
    readonly id = "profile-token";
    readonly name = "Profile Token Storage";
    readonly type: "p2p";
    private status;
    private identity;
    private encryptionKey;
    private initialized;
    private isShuttingDown;
    private pendingData;
    private flushTimer;
    private flushPromise;
    private readonly flushDebounceMs;
    /**
     * Debounce timer armed by `notifyProfileDirty()`. Separate from
     * `flushTimer` because the lean-snapshot publish path is independent
     * of the token-bundle pin path (each can fire without the other).
     * Phase E will collapse the two when the bundle-only publish is
     * removed.
     */
    private dirtyFlushTimer;
    /**
     * In-flight dirty-flush promise. Held to serialize concurrent
     * dispatches (a second notifyProfileDirty() that arrives mid-flush
     * gets coalesced into the next debounce window).
     */
    private dirtyFlushPromise;
    /**
     * Latch — set when `notifyProfileDirty()` is called during an
     * in-flight flush. Re-arms the debounce after the current flush
     * settles so we don't lose the signal.
     */
    private dirtyFlushPending;
    /**
     * Sticky latch — true once {@link shutdown} has completed at least
     * once. Distinct from `isShuttingDown` (which is reset to `false`
     * at the end of shutdown so re-arming-shutdown-on-restart works)
     * and from `status === 'disconnected'` (which is also the
     * pre-connect default). Used by `notifyProfileDirty` to ignore
     * late-arriving signals from writers that outlive the provider.
     */
    private hasShutdown;
    private readonly dirtyFlushDebounceMs;
    private coldStartSyncPromise;
    private readonly eventCallbacks;
    private knownBundleCids;
    private replicationUnsub;
    private lastLoadedData;
    private lastTokenManifest;
    private addressId;
    private lastPinnedCid;
    /**
     * Issue #239 — most-recent UXF bundle CID successfully pinned + written
     * to OrbitDB. Survives across flushes (unlike `lastPinnedCid`, the
     * pin-retry cache) so `LifecycleManager.shutdown()` can HEAD-verify
     * the bundle CAR is served by ≥1 IPFS gateway before exiting.
     * Null until the first successful flush.
     */
    private lastPinnedBundleCid;
    /**
     * Issue #239 — verified-watermark CIDs. Set by
     * `verifyFlushDurability` after each successful per-flush
     * verification. Shutdown gate consults these to skip its own
     * verification when the just-flushed CIDs are already verified
     * (eliminates ~15-30s of redundant HEAD + aggregator round-trips
     * per destroy() in the common case where every save was per-flush
     * verified). Null until the first successful verification.
     */
    private lastVerifiedBundleCid;
    private lastVerifiedSnapshotCid;
    private lastDiscoveredPointerCid;
    /**
     * CID whose CAR is durably pinned + OrbitDB bundle ref written but
     * whose aggregator pointer publish is outstanding due to a transient
     * failure. The next `flushToIpfs` and the periodic pointer poll
     * retry the publish at start.
     *
     * Issue #241: while non-null, `awaitNextFlush` (and therefore the
     * at-least-once Nostr gate) NO LONGER rejects on transient publish
     * failure — pin durability is the cross-device recoverability
     * invariant, and the aggregator publish is a liveness optimization
     * for cold-import discovery. A `storage:pending-publish` event is
     * emitted so operators can monitor the outstanding state without
     * conflating it with the terminal `storage:error` class.
     *
     * Persisted to `localCache` under
     * `<STORAGE_KEYS_GLOBAL.PROFILE_PENDING_PUBLISH_CID>_<addressId>`
     * so a process restart resumes the retry. Loaded lazily on
     * `initialize()`; written via `setPendingPublishCidPersisted`.
     */
    private pendingPublishCid;
    private lastLoadedFromBundleCids;
    private readonly _db;
    private readonly _encryptionKeyRaw;
    private readonly _ipfsGateways;
    private readonly _options;
    private readonly localCache;
    private rebuildPromise;
    private legacyKeysCleaned;
    private readonly bundleIndex;
    private readonly historyStore;
    private readonly lifecycleManager;
    private readonly flushScheduler;
    constructor(db: ProfileDatabase, encryptionKey: Uint8Array | null, ipfsGateways: string[], options?: ProfileTokenStorageProviderOptions | undefined, localCache?: StorageProvider | null);
    private makeHost;
    /**
     * Item #15 Phase C — central handler for "some profile state changed"
     * signals from per-writer mutations and JOIN-applied remote changes.
     *
     * Arms (or re-arms) a debounce timer. When the timer fires, the
     * host-injected `onProfileDirtyFlush` callback runs. Sphere wires
     * that callback to build a lean profile snapshot, pin it to IPFS,
     * and publish the CID via the aggregator pointer layer.
     *
     * Coalescing semantics:
     *   - Multiple notifyProfileDirty() calls within `dirtyFlushDebounceMs`
     *     coalesce into a single fire (last-one-wins on the timer reset).
     *   - A signal that arrives DURING an in-flight flush sets
     *     `dirtyFlushPending = true`. When the flush settles, the next
     *     debounce window is armed automatically so we don't lose the
     *     signal.
     *   - When `onProfileDirtyFlush` is absent (default during Phase C
     *     rollout), the timer still arms but the fire body is a no-op
     *     beyond the latch handling. This lets tests assert the wiring
     *     end-to-end without needing the full Sphere closure.
     *
     * Cancelled on shutdown — see {@link cancelDirtyFlushTimer} (invoked
     * by the lifecycle manager's shutdown path).
     *
     * Wired into:
     *   - BundleIndex.addBundle / joinSnapshot (this provider's bundle ref)
     *   - OutboxWriter / SentLedgerWriter / PrefixSyncWriter (via their own
     *     notifyProfileDirty callbacks plumbed by ProfileStorageProvider)
     *   - OrbitDb{Finalization,RecipientContext}StorageAdapter writeKey /
     *     deleteKey paths
     *
     * Public so the factory's bridge from
     * `ProfileStorageProvider.setProfileDirtyNotifier` can delegate
     * here. The host's `notifyProfileDirty` (used by internal sub-modules
     * like BundleIndex) routes through the same body via the host
     * interface.
     */
    notifyProfileDirty(): void;
    /**
     * Item #15 Phase C.2 — invoke the host-injected
     * `onProfileDirtyFlush` callback (if wired). Errors are caught and
     * surfaced via `storage:error` with a typed code; they never
     * propagate into the caller's path because the dirty signal is
     * best-effort by design.
     *
     * If another `notifyProfileDirty()` arrived while this flush was
     * running, re-arm the debounce so the next signal isn't lost.
     */
    private dispatchDirtyFlush;
    /**
     * Item #15 Phase C.2 — if a notifyProfileDirty() call arrived
     * during the just-completed flush, re-arm the debounce so we don't
     * lose the signal. Called from the dispatch path's `.finally`.
     */
    private consumePendingDirtyFlag;
    /**
     * Cancel any armed dirty-flush debounce timer. Called by the
     * lifecycle manager during shutdown to prevent late-firing
     * callbacks after the provider has been torn down.
     *
     * Does NOT abort an in-flight `dirtyFlushPromise` — the lifecycle
     * manager awaits that separately via the host.
     */
    cancelDirtyFlushTimer(): void;
    /**
     * Item #15 Phase C.2 — await the most recent dirty-flush dispatch
     * if one is in flight. Returns immediately when no flush is active.
     * Used by `shutdown()` and tests.
     */
    awaitDirtyFlushSettled(): Promise<void>;
    /**
     * Item #15 Phase D.1b — synchronously invoke the wired
     * `onProfileDirtyFlush` callback (lean-snapshot build + pin +
     * publish) for the FlushScheduler. Replaces the legacy bundle-CID
     * publish at the end of `flushToIpfs()` when a snapshot publisher
     * is wired.
     *
     * Semantics:
     *   - Returns `null` when no `onProfileDirtyFlush` callback is
     *     configured (legacy tests / providers without the Phase C.3
     *     closure). Caller (FlushScheduler) falls back to legacy
     *     bundle-CID publish via `LifecycleManager.publishAggregator
     *     PointerBestEffort()`.
     *   - Cancels any armed dirty-flush debounce timer so the
     *     debouncer doesn't separately fire a redundant publish for
     *     the same writer-side mutations that triggered this flush.
     *   - Awaits any in-flight `dirtyFlushPromise` so concurrent
     *     dispatches serialize. The `dirtyFlushPending` latch is
     *     cleared after our run so a follow-up `notifyProfileDirty()`
     *     (arriving during this synchronous fire) re-arms cleanly.
     *   - Tracks our own run as `dirtyFlushPromise` so a concurrent
     *     `notifyProfileDirty()` observes us as in-flight and latches
     *     `dirtyFlushPending` instead of starting a parallel fire.
     *   - On success: returns the publisher's structured
     *     `ProfileSnapshotPublishResult`. A `void` return from the
     *     callback (legacy `() => Promise<void>` shape) is normalised
     *     to `{ ok: true, transient: false }`.
     *   - On throw (programmer error, snapshot-build failure, etc.):
     *     emits `storage:error` with code `PROFILE_DIRTY_FLUSH_FAILED`
     *     (matching the debouncer's surfacing contract) and re-throws
     *     so FlushScheduler can propagate to `forceFlushSerialized`'s
     *     rejection arm. Issue #241: transient publish failures
     *     (e.g., aggregator replica lag) are NOT surfaced as throws —
     *     `publishAggregatorPointerBestEffort` returns a structured
     *     `{ ok: false, transient: true }` result. FlushScheduler emits
     *     `storage:pending-publish` and lets the flush succeed. Only
     *     non-publish exceptions (e.g., snapshot construction errors)
     *     reach this catch arm.
     *
     * The shutdown gate (`isShuttingDown` / `hasShutdown`) returns
     * `null` so a flush mid-shutdown skips the snapshot publish
     * entirely (the lifecycle's shutdown sequence drains the existing
     * dirty-flush promise separately).
     */
    publishSnapshotIfWired(): Promise<ProfileSnapshotPublishResult | null>;
    /**
     * Item #15 Phase E follow-up — late-bound pull-side snapshot applier.
     * Falls back to `options.onApplySnapshot` (construction-time) if
     * never set; otherwise the most recent registration wins. Set by
     * the factory after `tokenStorage` has been constructed so the
     * closure can reference `tokenStorage.getBundleIndex()` (which would
     * otherwise be a forward reference at construction time).
     */
    private applySnapshotCallback;
    /**
     * Item #15 Phase E follow-up — install / replace the pull-side
     * snapshot applier. Idempotent: callers MAY re-register; pass `null`
     * to disable.
     *
     * Used by `profile/factory.ts:createProfileProviders` to install the
     * closure that backs `applySnapshotIfWired()` — the closure
     * references `tokenStorage.getBundleIndex()` so it must be set AFTER
     * the provider is constructed (forward-reference at construction
     * time).
     */
    setApplySnapshotCallback(callback: ((cidString: string) => Promise<ApplySnapshotResult>) | null): void;
    /**
     * Item #15 Phase E follow-up — pull-side counterpart to
     * {@link publishSnapshotIfWired}. Invokes the host-injected applier
     * (if wired) for the given snapshot CID.
     *
     * Returns `null` when no factory closure is wired (legacy tests /
     * providers without the Phase E follow-up factory closure). On a
     * wired path the callback fetches the CAR, parses it as a lean
     * snapshot, and dispatches per-writer JOIN through the same
     * `runProfileSnapshotApply` closure that backs the pointer-wiring
     * layer's reconcile path. Errors propagate to the caller so the
     * periodic-poll / recovery wrapper can log + skip the re-arm.
     *
     * The shutdown gate returns `null` so a poll iteration mid-shutdown
     * skips the apply entirely. The lifecycle's shutdown sequence runs
     * its own teardown ordering; this method only declines to do new
     * work after the gate has closed.
     */
    applySnapshotIfWired(cidString: string): Promise<ApplySnapshotResult | null>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getStatus(): ProviderStatus;
    setIdentity(identity: FullIdentity): void;
    /**
     * Item #15 Phase C.3 — public read accessor for the bound identity.
     * Returns `null` until {@link setIdentity} has been called.
     *
     * Exposed for host wiring (factory's `onProfileDirtyFlush` closure)
     * that needs the wallet's `chainPubkey` to build a lean profile
     * snapshot. The closure must tolerate `null` (snapshot build is
     * skipped pre-identity).
     */
    getIdentity(): FullIdentity | null;
    /**
     * Item #15 Phase D.1a — public delegate for publishing a lean
     * snapshot CID via the aggregator pointer layer. Routes through
     * `LifecycleManager.publishAggregatorPointerBestEffort` so the
     * publish picks up:
     *   - pending-publish-marker persistence on transient failure;
     *   - permanent-vs-transient error classification;
     *   - `storage:error` emission on permanent failure;
     *   - automatic retry on the next `flushToIpfs` / pointer-poll cycle.
     *
     * Exposed for the factory's `onProfileDirtyFlush` closure (Phase D.1a)
     * and the flush-scheduler's snapshot-publish call site (Phase D.1b).
     * Direct callers should treat the result as authoritative — the
     * publish has either landed, deferred for retry, or surfaced an
     * operator alert. The `ProfileSnapshotPublishResult` shape matches
     * the underlying lifecycle method 1:1.
     */
    publishLeanSnapshotCid(cidString: string): Promise<ProfileSnapshotPublishResult>;
    /**
     * Issue #239 — host-surface entry point for the per-flush remote-
     * durability verification gate. Delegates to
     * `LifecycleManager.verifyFlushDurability`. Exposed via the
     * `ProfileTokenStorageHost` interface so FlushScheduler can call it
     * AFTER pin + publish complete; throws on verification failure so
     * `forceFlushSerialized`'s rejection arm propagates the failure to
     * `awaitNextFlush` and the at-least-once gate refuses the Nostr ack.
     * See `ProfileTokenStorageHost.verifyFlushDurability` for the
     * contract.
     */
    verifyFlushDurability(bundleCid: string, snapshotCid: string | null, deadlineMs: number): Promise<void>;
    /**
     * Item #15 Phase D.2 — public accessor for the wallet-global
     * {@link BundleIndex}. Exposed so the factory's pull-side dispatcher
     * (`runProfileSnapshotJoin`) can dispatch JOIN over the
     * `tokens.bundle.*` slice of a remote lean snapshot. BundleIndex
     * implements {@link ProfileSyncWriter} and owns the
     * encrypted-envelope read/write contract for bundle refs.
     *
     * The handle remains owned by the provider — callers MUST NOT cache
     * it across `shutdown()`/`destroy()` cycles. Returns `null` only if
     * the provider has been torn down (today the field is non-null after
     * construction).
     */
    getBundleIndex(): BundleIndex | null;
    initialize(): Promise<boolean>;
    shutdown(options?: ShutdownOptions): Promise<void>;
    /**
     * TokenStorageProvider.awaitNextFlush — force pending writes to durably
     * persist (IPFS pin + OrbitDB ref + aggregator pointer) and wait for
     * completion. Used by PaymentsModule.handleIncomingTransfer to gate
     * the Nostr `since`-filter advancement on real IPFS durability.
     *
     * Pattern mirrors `LifecycleManager.shutdown`'s flush sequence
     * (cancel debounce → await in-flight → flush remaining pending),
     * but as a re-callable method that does NOT teardown the provider.
     *
     * Loops to handle the case where a concurrent save() lands during
     * an in-flight flush: that save's data sits in pendingData; we run
     * another flush to capture it. Bounded by `timeoutMs`.
     *
     * Rejects via SphereError('TIMEOUT') if pending writes can't drain
     * within the budget — caller treats this as "NOT durable" → don't
     * advance Nostr `since` → re-replay on next reconnect (idempotent
     * via addToken stateHash dedup).
     *
     * @param timeoutMs Max wall-clock time. Default 30s.
     */
    awaitNextFlush(timeoutMs?: number): Promise<void>;
    save(data: TxfStorageDataBase): Promise<SaveResult>;
    load(_identifier?: string): Promise<LoadResult<TxfStorageDataBase>>;
    sync(localData: TxfStorageDataBase): Promise<SyncResult<TxfStorageDataBase>>;
    exists(_identifier?: string): Promise<boolean>;
    clear(): Promise<boolean>;
    /**
     * Return the latest **structural** token manifest derived during
     * load(). Returns null if no load has completed yet.
     *
     * Structural-only: entries carry `status ∈ {'valid', 'conflicting'}`.
     * Oracle-based status (spent, pending, invalid) is produced by a
     * future higher-layer enrichment pass. See PROFILE-ARCHITECTURE.md
     * §10.2.2 and §10.6, and profile/token-manifest.ts for details.
     */
    getTokenManifest(): TokenManifest | null;
    createForAddress(addressId?: string): ProfileTokenStorageProvider;
    onEvent(callback: StorageEventCallback): () => void;
    addHistoryEntry(entry: HistoryRecord): Promise<void>;
    getHistoryEntries(): Promise<HistoryRecord[]>;
    hasHistoryEntry(dedupKey: string): Promise<boolean>;
    clearHistory(): Promise<void>;
    importHistoryEntries(entries: HistoryRecord[]): Promise<number>;
    private addBundle;
    private listBundles;
    private listActiveBundles;
    private refreshKnownBundles;
    private shouldConsolidate;
    /**
     * Extract token entries from TxfStorageDataBase.
     * Token keys include:
     * - Keys starting with `_` (standard tokens, excluding operational keys)
     * - Keys starting with `archived-` (archived tokens)
     * - Keys starting with `_forked_` (forked tokens — also caught by `_` prefix)
     */
    private extractTokensFromTxfData;
    /**
     * Extract operational state from TxfStorageDataBase.
     */
    private extractOperationalState;
    /**
     * Build a TxfStorageDataBase from assembled tokens and operational state.
     */
    private buildTxfStorageData;
    /**
     * Build an empty TxfStorageDataBase with just _meta.
     */
    private buildEmptyTxfData;
    /**
     * Write the SYNCED portion of operational state to OrbitDB.
     *
     * Keys written: outbox, invalid, mintOutbox, invalidatedNametags.
     * These are authoritative across all Sphere instances sharing the
     * wallet identity.
     *
     * `tombstones`, `sent`, and `history` are NOT written here — they go
     * to the local-only cache via `writeLocalDerivedCache()`. See
     * PROFILE-ARCHITECTURE.md §10 (Q1 decision) for rationale.
     */
    private writeOrbitOperationalState;
    /**
     * Wave G.7: per-entry-key write path. See readOrbitOperationalState
     * for layout description. Diffs the in-memory `opState` against
     * the on-disk per-entry view and writes only the deltas:
     *   - new/modified entries → put `${prefix}.${id}` = JSON(entry)
     *   - removed entries → put `${prefix}.${id}` = JSON({ tombstoned: true, deletedAt })
     *
     * Tombstones are retained for `TOMBSTONE_RETENTION_MS` (30 days)
     * and then GC'd. This is best-effort — a long-offline device
     * coming back after >30 days could re-replicate a tombstoned
     * entry as if it were live; the hazard is bounded by the wallet's
     * tombstone retention policy and is acceptable given typical
     * online cadence.
     */
    private writeOrbitOperationalStatePerEntry;
    /**
     * Wave G.7: list the on-disk per-entry keys with the given prefix.
     * Returns a Map<key, entryId> where entryId is the suffix after
     * the prefix. Used by the diff step to detect removals.
     */
    private listExistingPerEntryKeys;
    /**
     * Wave G.7: apply the per-entry diff for one list:
     *   - For each live entry, write its key (idempotent: same content
     *     produces same OrbitDB OpLog hash, no spurious oplog growth).
     *   - For each on-disk entryId not in the live set, write a
     *     tombstone (or delete the entry+tombstone if its tombstone
     *     is older than retention).
     *
     * T.6.A: when `skipForeignSchema` is `true`, an existing value
     * carrying `_schemaVersion: 'uxf-1'` is NOT tombstoned by this writer
     * — it is owned by `OutboxWriter` and shares the same prefix. Used by
     * the outbox slot only; other slots pass `false` (the default).
     */
    private applyPerEntryDiff;
    /**
     * Wave G.7 — legacy single-blob writer (preserved for reference;
     * unused after the per-entry migration).
     *
     * @deprecated kept only to allow reverting the per-entry path if
     * we hit unforeseen production issues. Not on any active code path.
     */
    private writeOrbitOperationalStateSingleBlob;
    /**
     * Write the LOCAL-ONLY derived cache (tombstones, sent, history) to
     * the injected StorageProvider. These views are per-device and MUST
     * NOT be replicated — a corrupt or malicious remote instance would
     * otherwise poison them everywhere simultaneously.
     *
     * **Atomicity**: all three fields are serialized into a single key
     * `deriver.{addressId}.all`. A crash or disk-full error between two
     * individual writes would otherwise leave the cache in an inconsistent
     * state that subsequent empty-checks would silently trust (since one
     * field being non-empty bypasses the rebuild).
     *
     * **Error surfacing**: a write failure emits a `storage:error` event
     * AND returns false, so callers can react (retry, degrade, alert).
     * Previously the failure was only logged — hiding corruption.
     *
     * If no local cache was injected, this is a no-op and the deriver
     * will rebuild from the token pool on next load.
     */
    private writeLocalDerivedCache;
    /**
     * Read SYNCED operational state from OrbitDB.
     */
    private readOrbitOperationalState;
    /**
     * Wave G.7: per-entry-key reader with single-blob fallback.
     *
     * Iterates all OrbitDB keys with `prefix`, decodes each as a
     * tombstone or live entry, returns the live entries in
     * insertion-order-stable form. If no per-entry keys are found,
     * falls back to reading the single-blob `legacyBlobKey` for
     * backward compatibility with pre-G.7 wallets — the next write
     * will migrate the data forward.
     */
    private readPerEntryArrayWithLegacyFallback;
    /**
     * T.6.A: shape-aware variant of {@link readPerEntryArrayWithLegacyFallback}
     * for the outbox prefix. The outbox per-entry-key namespace carries TWO
     * distinct on-disk shapes during the migration window:
     *
     *   - **legacy** `TxfOutboxEntry` (pre-T.6.A, no `_schemaVersion`)
     *   - **new** `UxfTransferOutboxEntry` (T.6.A, `_schemaVersion: 'uxf-1'`)
     *
     * The legacy-only reader filters out new-shape entries so the
     * {@link OperationalState.outbox} slot continues to carry exactly the
     * shape its consumers expect. New-shape entries are read via
     * `OutboxWriter.readAll()` (`profile/outbox-writer.ts`) on a separate
     * code path.
     *
     * The discriminator is presence of the literal `_schemaVersion: 'uxf-1'`.
     * Any other value (missing field, unrelated string) is treated as
     * legacy-shape — preserves backward compatibility for partial /
     * pre-migration entries.
     */
    private readPerEntryArrayLegacyOnly;
    /**
     * Wave G.7: decode a single per-entry value. Returns the entry
     * payload or `null` for a tombstoned / corrupt entry.
     *
     * Tombstone format: `{ tombstoned: true, deletedAt: number }`.
     * Live format: the entry value as JSON (same shape the legacy
     * single-blob array carried).
     */
    private decodePerEntryValue;
    /**
     * Read LOCAL-ONLY derived cache. Returns empty arrays if no cache
     * exists or no StorageProvider was injected. Callers that need a
     * populated cache should invoke `rebuildDerivedCache()` afterwards.
     *
     * Falls back to reading the pre-atomic legacy per-key layout on miss
     * so that caches written before the atomic migration continue to work
     * until their next rewrite.
     *
     * **Error rate-limiting**: at most one `storage:error` event is
     * emitted per call, even when multiple underlying reads fail.
     * Subscribers should not see an event flood when the cache is
     * globally corrupted.
     */
    private readLocalDerivedCache;
    /**
     * Read a JSON value from the local cache, returning null on miss or
     * parse failure. A parse failure is surfaced via `storage:error` so
     * it is not silently swallowed — corrupted cache data should be
     * visible to callers, not masked as "fresh device".
     *
     * This helper is used by non-derived-cache read paths that want the
     * per-call event semantics. The derived-cache read path in
     * `readLocalDerivedCache` uses its own rate-limited reader instead.
     */
    private readLocalJson;
    /**
     * Compose the per-address storage key for the pending-publish CID
     * marker. Per-address scoping is required because two derived
     * addresses on the same wallet have independent token pools and
     * independent pointer chains; sharing a single marker would let one
     * address's transient failure pollute another's retry state.
     */
    private getPendingPublishCidKey;
    /**
     * Persist the pending-publish CID marker to local cache. Called on
     * every mutation via `host.setPendingPublishCid`. Best-effort: a
     * failure leaves the in-memory state correct and the next mutation
     * retries. Crash-safety degrades to "best-effort"; an unwritten
     * marker means a process restart won't auto-retry, but the next
     * save-driven flush will re-derive the need to publish via the
     * baseline-staleness check.
     */
    private persistPendingPublishCid;
    /**
     * Load any previously-persisted pending-publish CID marker into the
     * in-memory field on initialize. Called by lifecycle-manager during
     * `initialize()` so the next flush / poll can re-attempt the
     * pending publish without waiting for a fresh save.
     */
    private restorePendingPublishCidFromCache;
    /**
     * Refresh the merged-bundle baseline (`lastLoadedFromBundleCids`)
     * and the cached `lastLoadedData` by running a fresh `load()`.
     * Called by FlushScheduler when the runtime
     * `POINTER_MONOTONICITY_VIOLATION` check fires — repairing a stale
     * baseline so the next flush attempt passes the check.
     *
     * Returns true on success; false on internal load failure. The
     * caller (FlushScheduler / awaitNextFlush retry path) decides
     * whether to retry the flush or surface the original violation.
     *
     * IMPORTANT: this MUST NOT be called from inside `flushToIpfs`
     * directly because `load()` awaits the in-flight `flushPromise`,
     * which would deadlock. FlushScheduler invokes this via a
     * fire-and-forget pattern from the catch arm (which fires AFTER
     * the flush has already resolved/rejected), or the at-least-once
     * gate calls it explicitly between iterations.
     */
    private refreshBaselineForMonotonicity;
    /**
     * Rebuild the local derived cache from the token pool. Used when the
     * cache is empty on a fresh device or after corruption. Oracle-based
     * tombstone validation is deferred — this best-effort rebuild uses
     * archived tokens as the sole source.
     *
     * **Race guard**: concurrent load() calls are deduplicated — if a
     * rebuild is in flight, the second caller awaits the same Promise
     * rather than starting a second rebuild that could interleave writes.
     */
    private rebuildDerivedCache;
    private rebuildDerivedCacheInner;
    /**
     * Read the full operational state (synced + local-cached) for use
     * when building a TxfStorageDataBase on load.
     *
     * G4 — `tombstones` are read from BOTH the OrbitDB blob
     * (`${addr}.tombstones`, replicated, survives cold-start) AND the
     * local cache (`deriver.${addr}.all`, per-device). Both sources are
     * merged via union by primary-key (`tokenId`+`stateHash`) so a device
     * that has never written to OrbitDB yet still surfaces locally-known
     * tombstones, while a freshly-imported wallet pulls the boundary from
     * the synced source. Writes to OrbitDB happen in
     * `writeOrbitOperationalStatePerEntry`.
     */
    private readOperationalState;
    /**
     * Cached envelope-support probe. Lazy-initialised by `supportsEnvelopes()`.
     * Both `putEntry` and `getEntry` must exist together — same invariant as
     * ProfileStorageProvider. See that class's `supportsEnvelopes` for the
     * asymmetry-rejection rationale.
     */
    private _envelopesSupported;
    private supportsEnvelopes;
    /**
     * Write a string value to an OrbitDB key, encrypting if enabled.
     *
     * **Routes through the OpLog envelope path** (`db.putEntry`) — same
     * format ProfileStorageProvider uses for `set()`. Both providers share
     * a single OrbitDB instance via the factory; if either side wrote raw
     * bytes via `db.put` while the other side read via `db.getEntry`, the
     * decode would fail with bogus errors like `tag not supported (21)` —
     * the dag-cbor decoder choking on encrypted-ciphertext bytes that
     * happen to start with byte values that look like CBOR tags. By
     * routing both providers through the envelope path, the OrbitDB key
     * is byte-compatible across consumers.
     */
    private writeProfileKey;
    /**
     * Read a string value from an OrbitDB key, decrypting if needed.
     *
     * Symmetric with `writeProfileKey`: reads via the OpLog envelope path
     * (`db.getEntry`) so the same OrbitDB key is byte-compatible regardless
     * of which provider wrote it. See `writeProfileKey` for the cross-
     * provider decoding-collision rationale.
     *
     * Wave G.1 — deferred follow-up: emit a typed `storage:error` event
     * with `code: 'PROFILE_KEY_DECRYPT_FAILED'` so callers can route on
     * decrypt failures (likely indicates: encryption key changed,
     * key was rotated, or an attacker tampered with the ciphertext)
     * instead of treating them indistinguishably from "key not present".
     * The function still returns `null` to preserve the existing
     * caller contract (a missing-or-corrupt key triggers rebuild from
     * derived sources), but observability now distinguishes the two.
     */
    private readProfileKey;
    /**
     * Read and parse a JSON value from an OrbitDB key.
     */
    private readProfileKeyJson;
    /**
     * Handle OrbitDB replication events.
     * Checks for new `tokens.bundle.*` keys and emits `storage:remote-updated`.
     *
     * Cross-device sync resilience (Fix 2): when new bundle CIDs appear,
     * schedule a no-data flush so we anchor our OWN aggregator pointer
     * to the merged state. Without this, if Device A originated a bundle
     * and goes offline before Device B re-flushes, a future Device C
     * joining via the aggregator pointer would only see A's CID — which
     * is fine if A's bundle covered the full state, but loses anything
     * B contributed via Nostr DMs (or any source the originator hadn't
     * captured). The flush body short-circuits if the merged-state CAR
     * matches a known anchor (idempotent).
     *
     * # Pointer monotonicity invariant (CRITICAL)
     *
     * The published pointer V_n MUST reference a CAR that contains every
     * token reachable from V_n-1's CARs. Concretely: the CAR pinned by a
     * no-data flush MUST cover the union of every active bundle in OrbitDB
     * — otherwise Device C, joining via the aggregator pointer alone, would
     * see only V_n's CAR and miss tokens that lived in V_n-1's bundles.
     *
     * That invariant relies on `lastLoadedData` reflecting the current
     * bundle union when the flush body runs. Two events fire on every
     * replication tick:
     *   - `scheduleFlushNoData()` here (debounced ~ flushDebounceMs).
     *   - `storage:remote-updated` event → PaymentsModule.sync → load()
     *     (debounced 500ms, then load() awaits the in-flight flush).
     *
     * If the flush timer fires BEFORE load() refreshes `lastLoadedData`,
     * the flush body builds its CAR from STALE merged state — silently
     * dropping the newly-discovered remote bundle's tokens from V_n.
     *
     * Mode A fix #2: AWAIT a fresh `load()` here before scheduling the
     * no-data flush. load() reads the active bundle index, fetches all
     * CARs, merges, and writes the union into `lastLoadedData` — which is
     * exactly the superset the flush body needs. With this in place the
     * flush body's `lastLoadedData` snapshot is by-construction a superset
     * of V_n-1's bundle union, eliminating the race at the source.
     *
     * Why fix #2 over fix #1 (defer-with-retry): the retry approach is
     * brittle (the load could complete just as the flush fires; cap
     * exhaustion drops the publish silently) and adds an unobservable
     * timing dependency. Awaiting load() here is structurally clean,
     * synchronously verifiable, and uses load()'s existing dedup machinery
     * (it awaits an in-flight flush; the flush awaits the in-flight load
     * via its debounce timer). No new state, no retry counters.
     */
    /**
     * Called by `LifecycleManager.runPointerPollOnce` after the periodic
     * aggregator-pointer poll discovers a NEW CID (one not in
     * `knownBundleCids`) and adds it via `bundleIndex.addBundle`.
     *
     * Distinct from `handleReplication` in two ways:
     *   1. The poll already confirmed novelty via the `knownBundleCids`
     *      check — no diff against `previousCids` is needed (and any
     *      diff would be a no-op since `addBundle` updated
     *      `knownBundleCids` BEFORE this callback fires).
     *   2. No recursive aggregator-poll trigger — we're already inside
     *      the poll loop.
     *
     * Responsibilities:
     *   - `load()` to merge the new CID's content into `lastLoadedData`
     *     (this updates `lastLoadedFromBundleCids` as a side effect,
     *     restoring the pointer-monotonicity invariant).
     *   - Schedule a no-data flush to re-anchor our pointer at the
     *     merged state. The flush body short-circuits if the projected
     *     CID equals the just-discovered pointer CID (no duplicate
     *     pin / aggregator submit cost on the receiver side).
     *
     * Failures here are best-effort — load failures are surfaced via
     * `storage:error` events independently; we proceed to schedule the
     * flush so the next save-driven flush gets a fresh baseline check.
     */
    private onPollDiscoveredNewCid;
    private handleReplication;
    /**
     * Get the address ID for per-address key scoping.
     * Returns the computed short address ID (DIRECT_xxxxxx_yyyyyy format),
     * falling back to the options addressId or 'default'.
     */
    private getAddressId;
    /**
     * Extract token IDs from a TxfStorageDataBase for diffing.
     * Includes standard tokens (`_`-prefixed), archived (`archived-`), and forked (`_forked_`).
     */
    private extractTokenIds;
    private emitEvent;
    /**
     * Steelman³⁸ warning: build an event payload that preserves typed
     * error codes (AggregatorPointerError.code, ProfileError.code,
     * UxfError.code, SphereError.code) instead of flattening to a string.
     * Consumers can switch on `event.code` to drive UI state.
     */
    private buildErrorEvent;
    private log;
}

/**
 * Lean Profile Snapshot — full-profile-state CAR for the aggregator-pointer
 * sync path (Item #15 Phase A).
 *
 * This is a sibling of `profile/profile-export.ts` (the "fat" v1 used by
 * the operator-facing back-up / restore CLI). The lean variant is the
 * payload published to the aggregator pointer under the new sync
 * architecture: every peer-local mutation (OUTBOX/SENT/dispositions/
 * UXF-token state) flushes into a lean snapshot whose CID becomes the
 * next pointer version. Other peers pull the snapshot, JOIN per writer,
 * converge.
 *
 * Differences from v1 (`profile-export.ts`):
 *
 *   - **No bundle CAR embedding.** `bundles[]` carries CID + minimal
 *     metadata only. The bundle CARs themselves stay pinned on IPFS via
 *     the existing per-bundle pin path; receivers fetch them lazily.
 *     This collapses snapshot size from "sum of all bundle CARs" to
 *     "sum of OrbitDB KV envelopes" — orders of magnitude smaller for
 *     a wallet with many tokens.
 *
 *   - **Filter reversal.** v1 strips operational keys (`tokens.bundle.*`,
 *     `consolidation.*`) since the fat snapshot is meant for back-up,
 *     where bundle refs get reconstructed from the bundle index. Under
 *     #15 the snapshot IS the propagation mechanism for these writers,
 *     so we INCLUDE them in `entries[]`. Per-device transport sync
 *     cursors (`last_wallet_event_ts_*`, `last_dm_event_ts_*`) remain
 *     filtered — those are per-device state that must NOT propagate
 *     (or peer B picks up peer A's transport cursor and skips events it
 *     has not actually seen).
 *
 *   - **Version 2.** Disambiguates the two payload shapes at the CAR
 *     level. v1 readers reject v2 (the existing
 *     `parseProfileSnapshot` rejects `version > PROFILE_SNAPSHOT_VERSION
 *     = 1`); v2 readers (this file's `parseLeanProfileSnapshot`)
 *     accept exactly version 2 and reject everything else. No
 *     cross-decoding — the two formats are not interchangeable.
 *
 * Encryption-form invariant carries over from v1: KV values are read
 * via `getEncryptedRaw` and emitted as ciphertext. Plaintext mnemonics
 * / master keys never reach this layer. Snapshot privacy reduces to
 * mnemonic privacy — the destination peer must derive the same master
 * key (same mnemonic) to decrypt them. Phases B / D add the per-writer
 * JOIN logic that consumes the encrypted KV envelopes.
 *
 * Determinism: entries[] sorted by key, bundles[] sorted by CID,
 * `createdAt` option-overridable. Two builds of the same Profile state
 * produce byte-identical CARs.
 *
 * @see profile/profile-export.ts — the v1 fat snapshot (CLI export/import)
 * @see docs/uxf/OUTBOX-SEND-FOLLOWUPS.md — Item #15 (full design)
 * @module profile/profile-lean-snapshot
 */

/**
 * One KV entry in a snapshot. `value` is a base64-encoded ciphertext
 * blob — the exact OrbitDB envelope payload. Only a wallet sharing the
 * source's master key (i.e. mnemonic) can decrypt it.
 *
 * Structurally identical to v1's `ProfileSnapshotKvEntry`; redeclared
 * here so the lean snapshot module can stand alone (no cross-imports
 * from the v1 file's surface).
 */
interface LeanProfileSnapshotKvEntry {
    readonly key: string;
    readonly value: string;
}
/**
 * A single bundle reference in the lean snapshot — CID + minimal
 * metadata, NO embedded CAR bytes. The receiving peer fetches the CAR
 * from IPFS (via its own gateways) on demand if it is not already
 * pinned locally.
 */
interface LeanProfileSnapshotBundleEntry {
    readonly cid: string;
    readonly status: 'active' | 'superseded';
    readonly createdAt: number;
    readonly tokenCount?: number;
}
/**
 * One v3 entry-group reference in the snapshot root. Points at a
 * per-group sub-block holding the encrypted KV entries that belong to
 * this group (a single addressId, or `__global__` for wallet-global
 * keys).
 *
 * The sub-block CID provides both per-group addressability (a
 * partial-recovery client can fetch only the groups it needs) and
 * dedup (two snapshots whose entries for the same group are
 * byte-identical share the same CID at the IPFS storage layer).
 *
 * `entryCount` is included as informational metadata so a recipient
 * can pre-allocate / log without round-tripping to the sub-block.
 */
interface LeanProfileSnapshotEntryGroupRef {
    /** Group key — addressId (DIRECT_aabbcc_ddeeff) or `__global__`. */
    readonly groupKey: string;
    /** dag-cbor CID of the per-group entries sub-block. */
    readonly entriesCid: string;
    /** Number of KV entries inside the sub-block. */
    readonly entryCount: number;
}
/**
 * Decoded lean snapshot root document.
 *
 * `entries` is the **materialised** flat view of every per-group
 * sub-block, sorted by key. Parsers that walk the entryGroups[]
 * sub-blocks (full-fetch path) populate this field directly; parsers
 * that defer entry loading (root-only path) leave it empty so the
 * caller can fetch lazily via {@link parseLeanProfileSnapshotPartial}.
 */
interface LeanProfileSnapshot {
    /** Lean snapshot schema version. Always 3. */
    readonly version: 3;
    /** Wallet's chain pubkey at snapshot time (informational). */
    readonly chainPubkey: string;
    /** Network identifier at snapshot time (testnet/mainnet/dev). */
    readonly network: string;
    /** Snapshot timestamp (ms since epoch). */
    readonly createdAt: number;
    /**
     * All Profile KV entries that should propagate (encrypted form),
     * fully materialised across every entry group. Sorted by `key`.
     */
    readonly entries: ReadonlyArray<LeanProfileSnapshotKvEntry>;
    /**
     * v3 entry-group references (sorted by groupKey). Each ref's
     * sub-block is fetched and decoded by the full-fetch parsers;
     * partial-recovery callers can use the partial parser variant to
     * fetch only the groups they need.
     */
    readonly entryGroups: ReadonlyArray<LeanProfileSnapshotEntryGroupRef>;
    /** Bundle refs (CID + metadata) — bundle CAR bytes pinned separately. */
    readonly bundles: ReadonlyArray<LeanProfileSnapshotBundleEntry>;
}

/**
 * Item #15 Phase D.2 — Pull-side snapshot dispatcher.
 *
 * Consumes a parsed {@link LeanProfileSnapshot} (produced by Phase A's
 * `parseLeanProfileSnapshot`) and dispatches per-writer JOINs over the
 * snapshot's entries.
 *
 * **Responsibilities**:
 *   1. Base64-decode the snapshot's encrypted KV entries into the
 *      raw-bytes {@link SnapshotEntry} shape consumed by each writer's
 *      `joinSnapshot()`.
 *   2. Extract unique `addressId` prefixes from the entry keys
 *      (pattern `DIRECT_[0-9a-f]{6}_[0-9a-f]{6}`) so the dispatcher
 *      can instantiate per-address sync writers without depending on
 *      the receiver's in-memory tracked-addresses cache (which may
 *      lag a fresh address that landed via this very snapshot).
 *   3. Dispatch each per-address writer (`OutboxWriter`,
 *      `SentLedgerWriter`, finalization-queue, recipient-context
 *      request + finalization) over the writer's prefix-filtered
 *      slice of `entries[]`. Each writer's `joinSnapshot` already
 *      validates the prefix and rejects foreign entries; pre-filtering
 *      is purely for diagnostic clarity.
 *   4. Dispatch the wallet-global {@link BundleIndex} writer over
 *      `tokens.bundle.*` entries.
 *   5. Aggregate per-writer {@link JoinResult} counters and return a
 *      consolidated {@link ApplySnapshotResult} so the pointer-wiring
 *      layer can decide whether to re-mark the profile dirty (if any
 *      JOIN landed, the receiver's snapshot now diverges from the one
 *      it just consumed → next flush re-publishes the union).
 *
 * **What this module DOES NOT do**:
 *   - Persist the local pointer version cursor — that stays in
 *     `buildFetchAndJoin` per the existing crash-safety contract
 *     (write data → advance cursor, never the inverse).
 *   - Fetch the CAR from IPFS — the pointer-wiring layer does that.
 *   - Notify the dirty-flush debouncer — each per-writer
 *     `joinSnapshot()` already invokes `notifyProfileDirty()` when
 *     entries land, per the Phase C contract.
 *
 * @see profile/profile-lean-snapshot.ts — snapshot format
 * @see profile/profile-snapshot-merge.ts — per-writer JOIN runner
 * @see profile/pointer-wiring.ts — the caller (D.2 buildFetchAndJoin path)
 * @module profile/profile-snapshot-dispatcher
 */

/**
 * Aggregated counters across every per-writer JOIN performed by a
 * single dispatch. Mirrors the per-writer {@link JoinResult} shape
 * with all values summed.
 */
interface AggregatedJoinCounters {
    readonly entriesEvaluated: number;
    readonly liveLanded: number;
    readonly tombstonesLanded: number;
    readonly localWon: number;
    readonly remoteRejectedMalformed: number;
}
/**
 * Outcome of a full snapshot apply. The pointer-wiring layer uses
 * `joinedAny` to decide whether to mark the profile dirty for a
 * follow-up re-publish (the receiver's state now is the *union* of
 * the consumed snapshot + the receiver's local state; the next
 * pointer version should reflect that union).
 */
interface ApplySnapshotResult {
    /**
     * True if any live or tombstone entry from the remote snapshot was
     * persisted locally during this dispatch. The dispatcher itself
     * does NOT propagate the dirty signal — the per-writer
     * `joinSnapshot()` already invokes the host's notifier when
     * entries land; this flag is consumed by the pointer-wiring layer
     * for cursor-advancement bookkeeping and tests.
     */
    readonly joinedAny: boolean;
    /** Number of distinct `addressId` prefixes observed in the snapshot. */
    readonly addressesSeen: number;
    /** Number of bundle refs the BundleIndex JOIN evaluated. */
    readonly bundleEntriesSeen: number;
    /** Aggregated counters across every per-writer JOIN. */
    readonly counters: AggregatedJoinCounters;
}

/** Profile-pointer version number. `0` means "no pointer published yet". */
type PointerVersion = number;
/** Persistent BLOCKED-state flag (§10.2). */
interface BlockedState {
    readonly blocked: boolean;
    readonly reason?: string;
    readonly setAt?: number;
}

/**
 * SecretKey wrapper (T-A7) — hides derived secret bytes from
 * serialization paths per SPEC §11.11(d).
 *
 * Uses ECMAScript private fields (`#bytes`, `#label`) — genuinely
 * invisible to `Object.keys`, `{...spread}`, `structuredClone`,
 * `JSON.stringify`, `util.inspect` (via the custom hook), and
 * `console.log` (which falls through to toString). TypeScript
 * `private` is erased at compile time and does NOT provide this
 * guarantee; private fields do.
 *
 * Raw bytes are retrievable only via explicit `.reveal()` — each
 * call site is an audit point. `.reveal()` returns a COPY; callers
 * are responsible for zeroizing the copy after use.
 *
 * This does NOT prevent JS engines from retaining copies; complete
 * zeroization is impossible in GC'd runtimes. See §11.11(a′)
 * MAX_CT_RESIDENT_MS for the retry-window residual-risk model.
 */
declare class SecretKey {
    #private;
    constructor(bytes: Uint8Array, label: string);
    /**
     * Return a COPY of the bytes. Audit every call site.
     * Throws after zeroize() to prevent silent-zero correctness bombs.
     */
    reveal(): Uint8Array;
    get length(): number;
    get label(): string;
    toString(): string;
    toJSON(): string;
    [Symbol.toPrimitive](_hint: string): string;
    /**
     * Best-effort zeroization: overwrites the underlying buffer with zeros
     * and flags the wrapper so subsequent reveal() throws. Prior copies
     * handed out via reveal() are untouched — callers must zeroize their own.
     */
    zeroize(): void;
    isZeroized(): boolean;
}

/**
 * Key-derivation chain (T-A4, T-A5, T-A6) — SPEC §4.
 *
 *   walletPrivateKey (via MasterPrivateKey) → HKDF-Extract + Expand
 *     → pointerSecret (32 bytes)
 *   pointerSecret → HKDF-Expand with distinct info strings
 *     → signingSeed, xorSeed, padSeed (32 bytes each, pairwise distinct; H12).
 *
 * Per-version per-side material (stateHashDigest, xorKey) and
 * per-version paddingBytes are produced from xorSeed/padSeed and v.
 */

interface PointerKeyMaterial {
    readonly pointerSecret: SecretKey;
    readonly signingSeed: SecretKey;
    readonly xorSeed: SecretKey;
    readonly padSeed: SecretKey;
}

/**
 * SigningService wrapper (T-A8) — enforces SPEC §4.3 `createFromSecret`
 * discipline.
 *
 * The SDK's raw `new SigningService(privKey)` constructor uses the
 * 32-byte input AS the scalar. createFromSecret SHA-256-hashes the
 * input first, producing a different signingPubKey for the same seed.
 * These are non-interoperable. This wrapper ensures the pointer layer
 * always uses createFromSecret.
 *
 * The wrapper also captures signingPubKey as hex for use in
 * MUTEX_KEY / PENDING_VERSION_KEY / BLOCKED_FLAG_KEY templates.
 */

interface PointerSigner {
    readonly service: SigningService;
    readonly signingPubKey: Uint8Array;
    readonly signingPubKeyHex: string;
}

/**
 * FlagStore — durable key-value primitives for the pointer layer (T-B1).
 *
 * Wraps a StorageProvider and enforces:
 *   - Per-wallet key scoping (all keys prefixed by hex(signingPubKey))
 *   - Durability contract: IndexedDB transaction.oncomplete / fsync
 *   - AGGREGATOR_POINTER_UNSUPPORTED_RUNTIME on backends that cannot guarantee
 *     durability (detected at init via `isDurable()` capability flag)
 *
 * SPEC §7.1.2, §7.1.3.
 */

declare class FlagStore {
    #private;
    private constructor();
    /**
     * Create a FlagStore for the given signing pubkey.
     *
     * Throws AGGREGATOR_POINTER_UNSUPPORTED_RUNTIME if the storage backend
     * cannot guarantee durable writes per §7.1.3.
     */
    static create(storage: StorageProvider, signingPubKeyHex: string): FlagStore;
    /** Scoped key = prefix + localKey.  localKey must match /^[a-z][a-z0-9_]*$/. */
    scopedKey(localKey: string): string;
    get(localKey: string): Promise<string | null>;
    set(localKey: string, value: string): Promise<void>;
    remove(localKey: string): Promise<void>;
    has(localKey: string): Promise<boolean>;
}

/**
 * Cross-context publish mutex (T-B3, T-B4, T-B4b).
 *
 * Provides exclusive mutual exclusion for the pointer-publish critical section
 * across concurrent contexts:
 *
 *   Browser:  Web Locks API (cross-tab)
 *   Node.js:  proper-lockfile (cross-process) stacked with async-mutex (in-process / worker_threads)
 *
 * Acquisition order (R-18, LIFO release):
 *   1. async-mutex Mutex  — in-process/worker_threads (Node only)
 *   2. proper-lockfile    — cross-process (Node only)
 *
 * Release order is LIFO: file lock released first, then in-process Mutex.
 *
 * SPEC §7.1.1, R-17, R-18.
 */
interface MutexAcquireOptions {
    /** Max ms to wait for lock before raising PUBLISH_BUSY. Default: 30000. */
    timeoutMs?: number;
}
interface MutexHandle {
    release(): Promise<void>;
    /**
     * Steelman remediation (BFCache / tab-discard race): verify the
     * underlying lock is still held by this handle. Browser Web Locks
     * may be lost when the tab is frozen (BFCache) or discarded for
     * memory reclaim; the page may then resume from BFCache and try
     * to continue publishing at a stale version — violating the
     * mutual-exclusion contract other tabs rely on. Callers SHOULD
     * invoke `assertHeld()` before each commit-side network submit
     * so lost-lock resumes fail closed with PUBLISH_BUSY.
     *
     * Throws AggregatorPointerError(PUBLISH_BUSY) if the lock is no
     * longer held. Returns normally otherwise.
     */
    assertHeld(): void;
}
interface PointerMutex {
    acquire(opts?: MutexAcquireOptions): Promise<MutexHandle>;
}

/**
 * Aggregator probe (T-C2) — SPEC §8.1, §8.2.
 *
 * Three public entry points:
 *
 *   probeVersion(v)
 *     H2 OR-predicate. Returns true iff at least one side (A or B) has a
 *     verified inclusion proof. Used by the Phase-1/Phase-2 discovery walk.
 *     Trust-base rotation is detected on verify failure (§8.4.1).
 *
 *   classifyVersion(v, ...)
 *     H1 three-way classifier. Returns VALID | SEMANTICALLY_INVALID |
 *     TRANSIENT_UNAVAILABLE. Used by Phase-3 walkback. Requires an
 *     injected IPFS/CAR fetcher (the pointer layer does not own IPFS
 *     itself — that stays in profile/ipfs-client.ts).
 *
 *   isReachable(signingPubKey)
 *     Health check. Issues a getInclusionProof for the wallet's HEALTH_CHECK
 *     request id (SPEC §11.12) and returns true iff the aggregator answered
 *     (status is irrelevant — the request is not expected to be included).
 *     Used by BLOCKED-state CLEAR paths (SPEC §10.2).
 *
 * No side-channel leakage: timing does not depend on which side verified.
 */

/**
 * Injected CAR fetch + deserialize callback for classifyVersion.
 *
 * Returns:
 *   - `{ ok: true }` on successful content-address-verified CAR deserialization
 *   - `{ ok: false, kind: 'transient_unavailable' }` when all gateways return
 *     network errors / timeouts / 5xx
 *   - `{ ok: false, kind: 'content_mismatch' }` on CID hash mismatch
 *   - `{ ok: false, kind: 'car_parse_failed' }` on structural CAR failure
 */
type CarFetchResult = {
    readonly ok: true;
} | {
    readonly ok: false;
    readonly kind: 'transient_unavailable' | 'content_mismatch' | 'car_parse_failed';
};
type CarFetcher = (cidBytes: Uint8Array) => Promise<CarFetchResult>;
/**
 * Injected CID decoder — reconstructs cidBytes from the two 32-byte halves
 * (partA || partB) after XOR-decode. Throws on length-prefix violation, bad
 * varints, or out-of-bounds.
 *
 * The pointer layer does not own CID multiformat parsing — the caller supplies
 * a decoder that returns either:
 *   - `{ ok: true, cidBytes: Uint8Array }` on structural success
 *   - `{ ok: false }` on any semantic failure (treated as SEMANTICALLY_INVALID)
 */
type CidDecodeResult = {
    readonly ok: true;
    readonly cidBytes: Uint8Array;
} | {
    readonly ok: false;
};
type CidDecoder = (full: Uint8Array) => CidDecodeResult;

/**
 * Discover algorithm (T-D2) — SPEC §8.2 three-phase walk.
 *
 *   Phase 1 — exponential expansion via probeVersion (H2 OR-predicate)
 *             from localVersion upward; doubles until probe returns false
 *             or hits DISCOVERY_HARD_CEILING (→ DISCOVERY_OVERFLOW).
 *
 *   Phase 2 — binary search between lo (last included) and hi (first
 *             excluded) → converges to includedV = latest-included version.
 *
 *   Phase 3 — walk back through SEMANTICALLY_INVALID versions via
 *             classifyVersion (H1 three-way). TRANSIENT_UNAVAILABLE
 *             versions propagate as CAR_UNAVAILABLE — we do NOT skip
 *             past them because tokens may still exist. Bail after
 *             DISCOVERY_CORRUPT_WALKBACK consecutive invalid versions
 *             (→ CORRUPT_STREAK).
 *
 * Returns { validV, includedV } (H4 return shape).
 *
 * W7 walkback floor: when an `acceptCorruptStreak(walkbackLimit)` override
 * raises the walkback ceiling, the effective floor MUST NOT cross below
 * localVersion — crossing below would walk past versions this wallet has
 * already confirmed as its own.
 */

interface DiscoverResult {
    /** Latest VALID version (0 if no pointer ever published). */
    readonly validV: PointerVersion;
    /** Latest INCLUDED version (Phase 2 result — may be corrupt residue). */
    readonly includedV: PointerVersion;
    /**
     * List of (v, side) probe-pairs visited during all three phases.
     * Deterministic for a given { localVersion, V_true, corrupt-version set }.
     * Used by getProbeFingerprint() for UI clustering signal.
     */
    readonly probeVersions: readonly PointerVersion[];
}

/**
 * Reconcile algorithm (T-D3) — SPEC §9.
 *
 * Wraps publishOnceAtVersion with cross-version conflict handling per §9.2:
 *
 *   publishWithConflictHandling(cidProducer, attempts = 0):
 *     if attempts >= PUBLISH_RETRY_BUDGET: raise RETRY_EXHAUSTED
 *     cid = cidProducer()
 *     { validV, includedV } = findLatestValidVersion()
 *     nextV = max(validV, includedV) + 1          // H4
 *     result = publish(cid, nextV)
 *     if result == 'success': return
 *     if result == 'conflict':
 *       re-discover, recoverLatest, fetchAndJoin remote, update localVersion
 *       sleep(backoff(attempts))
 *       recurse with attempts + 1
 *     else: propagate error
 *
 * R-14 reset semantics: the `attempts` counter counts CONFLICT-driven retries
 * only. Intra-attempt transient retries (retry_side, retry_backoff,
 * retry_after) are absorbed by publish-algorithm's inner loop and do NOT
 * consume reconcile's budget.
 */

/**
 * Callback invoked after discovering a new remote version during conflict
 * reconciliation. The pointer layer hands the caller the remote CID; caller
 * is responsible for the FULL conflict-merge sequence:
 *
 *   1. Fetch the CAR bytes from IPFS (with content-address verification).
 *   2. Merge the remote bundle into the local OrbitDB OpLog per §10.4
 *      JOIN rules (typically: write a bundle ref keyed by CID).
 *   3. Persist `profile.pointer.version = remoteVersion` (i.e. invoke the
 *      same `persistLocalVersion` callback the layer was constructed with).
 *
 * Step 3 was previously performed by `reconcileAndPublish` after the
 * callback returned. That created a "double persist" with the in-tree
 * production wiring (which already persists internally to enforce the
 * "bundle ref durable BEFORE cursor advance" ordering invariant
 * introduced in commit 561f551), and split ownership across two layers
 * for a single logical commit. We now make the callback the SOLE owner
 * of cursor advancement on the conflict path:
 *
 *   - `reconcileAndPublish` does NOT touch `persistLocalVersion` after
 *     the callback returns; it only advances the in-memory loop variable
 *     used to compute the next discovery's starting version.
 *   - The eventual successful publish in the next iteration persists
 *     `localVersion = nextV` via `publishOnceAtVersion` as before.
 *
 * Implementations MUST therefore call their `persistLocalVersion`
 * adapter (or equivalent storage write) as the LAST step on success,
 * AFTER the OrbitDB bundle ref has landed. Test harnesses whose fake
 * callback does not invoke `persistLocalVersion` will see the storage
 * cursor remain at its previous value across a conflict — that is now
 * the documented contract; the in-memory loop variable inside reconcile
 * tracks the advanced version for subsequent discovery so the next
 * publish still targets the correct `nextV`.
 *
 * The pointer layer does NOT own OrbitDB or IPFS fetch — those stay with
 * the Profile layer. This callback is the integration seam.
 */
type FetchAndJoinCallback = (remoteCid: Uint8Array, remoteVersion: PointerVersion) => Promise<void>;

/**
 * Pointer-layer configuration + capability gates (T-D5, T-E26).
 *
 * SPEC §13.4 — capability protocol.
 *
 * The pointer layer offers two operator-override surfaces:
 *
 *   allowOperatorOverrides (SPEC §10.2.4, §10.7.1) — gates clearBlocked(),
 *     acceptCarLoss(), clearPendingMarker(), acceptCorruptStreak(). These
 *     APIs are dangerous — they can dismiss data-loss safety interlocks.
 *     Enabling this flag is a user-consent signal.
 *
 *   allowUnverifiedOverride (SPEC §13, W6) — legacy dev-only flag that
 *     suppresses trust-base verification. Currently NOT supported outside
 *     explicit NODE_ENV=development. T-E26 production guard: init throws
 *     CAPABILITY_DENIED when this flag is set in any non-dev environment.
 */
interface PointerLayerConfig {
    /**
     * Enables operator-override APIs (clearBlocked, acceptCarLoss,
     * clearPendingMarker, acceptCorruptStreak). Off by default. Enabling
     * is a user-consent signal for data-loss-adjacent operations.
     *
     * Must ALSO match the SPHERE_ALLOW_OVERRIDES environment variable when
     * set (prevents silent enablement from library defaults).
     */
    readonly allowOperatorOverrides?: boolean;
    /**
     * DEV-ONLY: suppress trust-base verification on probe / recover.
     * PRODUCTION USE IS DISALLOWED — init throws CAPABILITY_DENIED when set
     * outside NODE_ENV=development. See SPEC §13 W6.
     */
    readonly allowUnverifiedOverride?: boolean;
}

interface ProfilePointerLayerInit {
    /** HKDF-derived key material. */
    readonly keyMaterial: PointerKeyMaterial;
    /** Signing service wrapper. */
    readonly signer: PointerSigner;
    /** Aggregator client from OracleProvider.getAggregatorClient(). */
    readonly aggregatorClient: AggregatorClient;
    /** Bundled RootTrustBase from OracleProvider.getRootTrustBase(). */
    readonly trustBase: RootTrustBase;
    /** Per-wallet FlagStore (FlagStore.create(storage, signingPubKeyHex)). */
    readonly flagStore: FlagStore;
    /** Publish mutex (createPointerMutex with per-wallet path/key). */
    readonly mutex: PointerMutex;
    /** CID decoder callback (multiformats). */
    readonly decodeCid: CidDecoder;
    /** CAR fetcher (wraps profile/ipfs-client). */
    readonly fetchCar: CarFetcher;
    /** fetchAndJoin callback — merges remote bundle into local OpLog. */
    readonly fetchAndJoin: FetchAndJoinCallback;
    /** Read `profile.pointer.version` from local storage. */
    readonly readLocalVersion: () => Promise<PointerVersion>;
    /** Persist `profile.pointer.version` to local storage. */
    readonly persistLocalVersion: (v: PointerVersion) => Promise<void>;
    /** Given a version, resolve its CID bytes (via classifyVersion or recoverLatest). */
    readonly resolveRemoteCid: (version: PointerVersion) => Promise<Uint8Array>;
    /** Configuration (capabilities). */
    readonly config?: PointerLayerConfig;
}
interface PublishResult {
    readonly version: PointerVersion;
    readonly attemptsUsed: number;
}
interface RecoverResult {
    readonly cid: Uint8Array;
    readonly version: PointerVersion;
}
/**
 * Issue #247 — outcome of `reconcileLocalVersionDownward`.
 *
 *   - `reconciled` — the candidate.version was strictly less than
 *     `localVersion` AND the candidate authored under this wallet's
 *     signing identity (see authoring trust note on the method). Local
 *     state was rewritten and persisted; the next discovery starts
 *     from the lower floor.
 *   - `up-to-date` — candidate.version >= localVersion. Nothing to
 *     reconcile (a normal forward publish path applies). Local state
 *     unchanged.
 */
interface ReconcileDownwardResult {
    readonly reconciled: boolean;
    readonly fromVersion: PointerVersion;
    readonly toVersion: PointerVersion;
}
declare class ProfilePointerLayer {
    #private;
    constructor(init: ProfilePointerLayerInit);
    /**
     * RFC-251 Approach D (issue #255 Problem B) — expose the pointer layer's
     * signing pubkey + signer to the integration wiring layer (Sphere /
     * ProfileTokenStorageProvider). The win-broadcast publisher needs
     * the pubkey hex to build the per-wallet broadcast tag, and the
     * signer to sign the broadcast payload. The signer itself is exposed
     * read-only — callers can only sign payloads, not mutate the signer's
     * state.
     *
     * Returns a tuple rather than two getters so consumers can destructure
     * once and cache for the wallet's lifetime; the underlying signer
     * never rotates within a `ProfilePointerLayer` instance.
     */
    getSignerForWinBroadcast(): {
        readonly signer: PointerSigner;
        readonly signingPubKeyHex: string;
    };
    /**
     * Issue #263 — sibling pointer-win broadcast observer.
     *
     * Sphere's `pointer-win` Nostr subscriber (see
     * `Sphere.handleIncomingPointerWinBroadcast`) calls this AFTER signature
     * verification and replay/dedup checks. The reconcile loop reads
     * `#siblingHighestV` to bypass the initial discovery walkback when a
     * sibling device has already announced "I just landed V=N" — turning a
     * 30 s+ classifyVersion CAR fetch into a single ~50 ms aggregator RPC
     * for the common case.
     *
     * Monotonic by construction — only versions strictly greater than the
     * current cache value are stored. Stale broadcasts (lower-V than what
     * we have already learned, or lower than our own current localVersion)
     * are kept in the cache but ignored by the reconcile loop's `>= `
     * comparison.
     *
     * Defensive about non-integer / negative inputs (already vetted by
     * verifyWinBroadcastPayload upstream, but this method is a public API
     * surface so we don't trust the caller).
     *
     * No-op once `shutdown()` has been called.
     */
    noteSiblingWin(version: PointerVersion): void;
    /**
     * Wave F.2 architecture-advisory remediation: drain in-flight
     * publish/recover/probe operations before the surrounding
     * ProfileStorageProvider tears down OrbitDB. Previously the
     * disconnect path duck-typed `pointerLayer.shutdown?.()` and silently
     * no-op'd because the method did not exist — leaving an in-flight
     * Node publish able to leak its proper-lockfile mutex for up to
     * 8 seconds (until proper-lockfile's stale detector reclaimed it).
     *
     * `shutdown()` waits for all tracked operations to settle, with a
     * hard internal deadline (default 30 s) so a single hung tracked
     * promise (e.g. an aggregator-probe stuck on an unresponsive socket
     * with no per-call timeout) cannot block the entire teardown
     * indefinitely. Steelman⁴⁶ HIGH: previously, shutdown() relied on
     * callers wrapping in their own Promise.race against a timeout —
     * but no caller did, so process tear-down could hang forever.
     *
     * After the deadline expires, shutdown() returns; any still-tracked
     * operations are abandoned (they may run to completion, but the
     * surrounding storage provider can proceed with disconnect — pin/db
     * close paths are idempotent with respect to ghost continuations).
     * The caller can pass `{ timeoutMs: ... }` to override; pass `null`
     * to disable the deadline (legacy behavior).
     *
     * Steelman¹⁸: sets #shuttingDown to block new operations from being
     * enqueued during the drain. Concurrent calls both participate in
     * draining (via Promise.allSettled) rather than racing on a snapshot.
     * Safe to call multiple times — subsequent calls drain any operations
     * enqueued after the previous shutdown() completed.
     */
    shutdown(opts?: {
        timeoutMs?: number | null;
    }): Promise<void>;
    /**
     * Publish a CID as the new latest pointer. Runs the full reconcile loop:
     *   - discover V_true
     *   - target nextV = max(validV, includedV) + 1 (H4)
     *   - submit + §7.3 state machine + §7.4 backoff
     *   - on conflict: fetchAndJoin remote, advance localVersion, retry
     *
     * @param cidProducer  Callback that (re)produces the CID bytes. Called
     *   fresh on each reconcile iteration so the bundle may include state
     *   merged from fetchAndJoin on prior conflicts.
     * @param opts.abortSignal  Wave G.4: caller-supplied cancellation
     *   signal. Aborting unwinds the reconcile loop at the next safe
     *   checkpoint (between iterations, or via the deadline race inside
     *   submitPointer / probeVersion). The signal is propagated all the
     *   way down through `submitOneSide` and `fetchProofWithTimeout`,
     *   so an in-flight HTTP RPC is cancelled promptly rather than
     *   running to its per-side timeout.
     */
    publish(cidProducer: () => Promise<Uint8Array>, opts?: {
        abortSignal?: AbortSignal;
    }): Promise<PublishResult>;
    /**
     * Discover + recover the latest VALID pointer.
     * Returns null when no pointer has ever been published (validV == 0).
     *
     * SPEC §13 recoverLatest semantics: returns `{ cid, version }` for the
     * latest valid version (Phase 3 winner), having classified + fetched the
     * CAR successfully.
     */
    recoverLatest(opts?: {
        abortSignal?: AbortSignal;
    }): Promise<RecoverResult | null>;
    /**
     * Issue #247 — adopt a strictly-lower aggregator-visible version as
     * the wallet's local baseline. Solves the same-identity cross-device
     * race where two devices each push localVersion ahead of the
     * aggregator's currently-visible value and both subsequently hit
     * W7 WALKBACK_FLOOR for the SPEC-correct reason (cannot walk past
     * a version this wallet has already confirmed as its own).
     *
     * **Authoring trust note (SAFETY-CRITICAL).** The `candidate` MUST
     * originate from this wallet's own `recoverLatest()` call. Because
     * `recoverLatest()` runs `classifyVersion`, which XOR-decodes the
     * inclusion-proof ciphertext with the wallet's `keyMaterial.xorSeed`
     * (HKDF-derived from the wallet's private key) and then verifies the
     * decoded CID via `fetchCar`'s content-address check, a candidate
     * surfaced by `recoverLatest()` is *implicitly* authenticated as
     * authored by this wallet. A foreign-author commitment at the same
     * version V would XOR-decode under our seed to a different 32-byte
     * pair, the resulting CID would fail content-address verification,
     * and `classifyVersion` would return SEMANTICALLY_INVALID — never
     * surfaced through `recoverLatest()` as a non-null result.
     *
     * Callers passing a `RecoverResult` from `recoverLatest()` therefore
     * get same-author-only downgrades by construction. Callers crafting
     * a candidate from another source MUST guarantee equivalent author
     * verification themselves (no such caller exists in this SDK).
     *
     * **Side effects.** When `candidate.version < currentLocalVersion`,
     * the method:
     *   1. Persists `profile.pointer.version = candidate.version` via
     *      the wired `persistLocalVersion` callback.
     *   2. Returns `{ reconciled: true, fromVersion, toVersion }`.
     *
     * Otherwise (`candidate.version >= currentLocalVersion`), it is a
     * no-op and returns `{ reconciled: false, ... }`.
     *
     * **NOT a CONFLICT path.** This is not §9.2 conflict reconciliation
     * — there is no `fetchAndJoin` of remote OpLog state, no bundle ref
     * write. The semantic is "the aggregator's view of our pointer is
     * BEHIND our local cursor; rewind our cursor so we publish from a
     * baseline the aggregator can see." Bundle data already published
     * at versions in `(candidate.version, fromVersion]` remains on IPFS
     * and is rediscoverable via the standard publish-retry path —
     * publish at `candidate.version + 1` will conflict against any
     * still-live version, re-trigger discovery, and converge.
     */
    reconcileLocalVersionDownward(candidate: RecoverResult): Promise<ReconcileDownwardResult>;
    /**
     * Run only the discovery phase (no CAR fetch, no XOR-decode, no CID parse —
     * BUT Phase 3 still calls classifyVersion which DOES fetch CAR for
     * validation per SPEC §8.2 step 3). Returns { validV, includedV } per H4.
     */
    discoverLatestVersion(walkbackLimit?: number, opts?: {
        abortSignal?: AbortSignal;
    }): Promise<DiscoverResult>;
    /**
     * Aggregator reachability probe via HEALTH_CHECK_REQUEST_ID (§11.12).
     * Returns true iff aggregator responded with any HTTP response (even a
     * permissible PATH_NOT_INCLUDED). False only on network-level failure.
     */
    isReachable(): Promise<boolean>;
    /**
     * Query the persistent BLOCKED state (§10.2). Returns true iff
     * BLOCKED_FLAG_KEY is set.
     *
     * Steelman¹⁹ warning: a CORRUPT record (invalid JSON, bad shape, or
     * unrecognized reason) is treated as BLOCKED for the purpose of read-
     * API queries. Read APIs are pure observations — letting CORRUPT
     * propagate would change a stable contract (always returns boolean) into
     * a throwing API and break consumers (UIs, telemetry, the publish
     * pre-check). The publish path still routes CORRUPT through the proper
     * error code via `setBlocked`'s catch-and-overwrite recovery, so this
     * wrapper does not mask the CORRUPT classification — it just keeps the
     * read API predictable.
     */
    isPublishBlocked(): Promise<boolean>;
    /**
     * Returns the full BlockedState including reason and setAt timestamp.
     *
     * Steelman¹⁹ warning: on CORRUPT, returns a synthetic state with
     * `reason='corrupt'` and `setAt=0` so callers (UIs, telemetry) get a
     * stable shape. Operators investigating a corrupt block flag can read
     * the underlying record directly via the FlagStore.
     */
    getBlockedState(): Promise<BlockedState>;
    /**
     * Clear BLOCKED after a legitimate §10.2.4 exit condition is met.
     * Gated on allowOperatorOverrides — the spec's strict CLEAR paths
     * (exclusion-proof or successful recovery) are typically detected and
     * cleared automatically by recoverLatest; this method is for operator-
     * initiated recovery when automatic detection is insufficient.
     *
     * Steelman⁴⁶ MEDIUM (forward-compat downgrade): when the persisted
     * BLOCKED record is well-formed in shape but its `reason` is not
     * recognized by this SDK build (e.g. a newer SDK wrote it and the
     * user rolled back), allow clearing WITHOUT operator override. A
     * recognized BLOCKED state still requires the override. This trades a
     * small attacker-injected-unknown-reason gap (which is already gated
     * by storage-write access — equivalent to setting any recognized
     * reason that this SDK could clear) for a real recovery path on
     * downgrade.
     *
     * @throws AggregatorPointerError(CAPABILITY_DENIED) if overrides disabled
     *   AND the persisted reason is recognized (or there is no persisted
     *   record at all — calling clearBlocked without a real block is a
     *   no-op but should still respect the capability gate).
     */
    clearBlocked(): Promise<void>;
    /**
     * Operator recovery path for a corrupt pending-version marker (§7.1.4 C1
     * clamp failure). Gated on allowOperatorOverrides. Side effect: SETs
     * BLOCKED so the next pass through §10.2.4 CLEAR requires verified
     * recovery — prevents a bypass where clearing a marker alone would
     * resume publish without re-verification.
     *
     * @throws AggregatorPointerError(CAPABILITY_DENIED) if overrides disabled.
     */
    clearPendingMarker(): Promise<void>;
    /**
     * H7 operator override for §10.7 CAR-unavailable state.
     *
     * This is the MINIMAL implementation — it checks the wall-clock gate
     * and the capability flag, then delegates the republish + advance to
     * the caller (via the existing publish() and persistLocalVersion
     * callbacks). Peer-availability poll and the §10.7.1 (3) gossipsub
     * integration remain caller responsibilities.
     *
     * @throws AggregatorPointerError(CAPABILITY_DENIED) if overrides disabled.
     * @throws AggregatorPointerError(UNREACHABLE_RECOVERY_BLOCKED) if gate not met.
     */
    acceptCarLoss(version: PointerVersion, cidProducer: () => Promise<Uint8Array>): Promise<PublishResult>;
    /**
     * Record a CAR-fetch failure for H7 ledger (caller invokes this when
     * IPFS gateway fetches fail during recovery).
     */
    recordCarFetchFailure(version: PointerVersion, gateway: string): Promise<void>;
    /**
     * W6 / §10.8 operator override: raise DISCOVERY_CORRUPT_WALKBACK for a
     * single subsequent recovery attempt. Caller passes the raised ceiling
     * to the next `discoverLatestVersion(walkbackLimit)` call.
     *
     * @throws AggregatorPointerError(CAPABILITY_DENIED) if overrides disabled.
     */
    acceptCorruptStreak(walkbackLimit?: number): Promise<{
        walkbackUsed: number;
    }>;
    /**
     * Short stable hash of the last discovery probe sequence for UI
     * same-wallet-clustering signal. Returns '' if no probe has run.
     */
    getProbeFingerprint(): Promise<string>;
    /** Low-level probe for a single version — H2 OR-predicate. */
    probe(v: PointerVersion): Promise<boolean>;
    /** Low-level classifyVersion. */
    classify(v: PointerVersion): Promise<'VALID' | 'SEMANTICALLY_INVALID' | 'TRANSIENT_UNAVAILABLE'>;
}

/**
 * Configuration for connecting to an OrbitDB instance.
 * The database identity is derived from the wallet's secp256k1 key.
 *
 * Steelman²⁸/²⁹ critical: passing the private key (hex string) into the
 * OrbitDB adapter is a memory-safety hazard — JS strings are immutable
 * and cannot be wiped, leaving the master key heap-resident for the
 * session lifetime. EITHER `dbNameOverride` OR `privateKey` must be
 * provided; new callers SHOULD pass `dbNameOverride` (computed ONCE
 * from a wipeable Uint8Array, with the bytes zeroized after derivation).
 */
/**
 * OUTBOX-SEND-FOLLOWUPS item #4 — result of one
 * `gcExpiredTombstones()` sweep on a profile writer (OutboxWriter or
 * SentLedgerWriter). Returned to callers for diagnostics.
 *
 *  - `scanned` — total tombstones observed under the writer's prefix.
 *  - `purged`  — tombstones whose `(now - deletedAt) > retentionMs`
 *                AND whose `db.del()` succeeded; storage reclaimed.
 *  - `kept`    — tombstones inside the retention window, OR
 *                tombstones whose `db.del()` threw (best-effort sweep
 *                preserves the marker for the next cycle).
 *  - `skipped` — `true` when the prefix scan itself failed (DB
 *                unavailable); counters are all zero in that case.
 *
 * Invariant: `scanned === purged + kept` when `skipped === false`.
 */
interface TombstoneGcResult {
    readonly scanned: number;
    readonly purged: number;
    readonly kept: number;
    readonly skipped: boolean;
}
/**
 * Item #15 Phase D.1a — outcome of a lean-snapshot publish attempt.
 *
 * Shape mirrors `LifecycleManager.publishAggregatorPointerBestEffort`:
 *   - `{ ok: true }` — anchored at a new pointer version.
 *   - `{ ok: false, transient: true }` — network / aggregator timed
 *     out; pending-publish marker stamped; safe to retry.
 *   - `{ ok: false, transient: false, code? }` — permanent failure
 *     (rejected, untrusted proof, trust-base stale, etc.); operator
 *     intervention required; retrying will not help. The `code` field
 *     carries the typed `AggregatorPointerErrorCode` when available, or
 *     a closure-side `NOT_READY_*` sentinel when the closure bailed
 *     before reaching the publish step.
 */
interface ProfileSnapshotPublishResult {
    readonly ok: boolean;
    readonly transient: boolean;
    readonly code?: string;
}
interface OrbitDbConfig {
    /**
     * @deprecated — pass `dbNameOverride` instead. JS strings cannot be
     * zeroized, so storing the master key here leaks it to GC for the
     * entire session. Optional: only consulted when `dbNameOverride` is
     * not set.
     */
    readonly privateKey?: string;
    /**
     * Pre-computed `sphere-profile-<16-hex>` database name. When set,
     * the adapter uses this directly and IGNORES privateKey for identity
     * derivation. Callers should derive once from a Uint8Array, wipe the
     * bytes, then pass the resulting name here.
     */
    readonly dbNameOverride?: string;
    /** Local storage directory for OrbitDB data (Node.js only) */
    readonly directory?: string;
    /** libp2p bootstrap peers for peer discovery */
    readonly bootstrapPeers?: string[];
    /** Enable libp2p pubsub for replication (default: true) */
    readonly enablePubSub?: boolean;
}
/**
 * Configuration for Profile initialization.
 * Mirrors the IpfsStorageConfig pattern from impl/shared/ipfs/ipfs-types.ts.
 */
interface ProfileConfig {
    /** OrbitDB connection configuration */
    readonly orbitDb: OrbitDbConfig;
    /** Whether to encrypt values stored in OrbitDB (default: true) */
    readonly encrypt?: boolean;
    /**
     * Network identifier — passed through to the pointer layer's
     * SPEC §14.1 / §11.12 denylist enforcement. Pass 'test-vectors' to
     * accept the canonical 0x01×32 KAT vector for fixture-driven tests.
     * Production deployments should use 'mainnet' / 'testnet' / 'dev'
     * (or leave undefined; any non-'test-vectors' value rejects the KAT).
     */
    readonly network?: string;
    /** IPFS gateway URLs for CAR file pinning/fetching */
    readonly ipfsGateways?: string[];
    /** Maximum local cache size in bytes (optional, platform-dependent) */
    readonly cacheMaxSizeBytes?: number;
    /** Consolidation retention period in ms before removing superseded bundles (default: 7 days) */
    readonly consolidationRetentionMs?: number;
    /** Minimum consolidation retention period in ms (default: 24 hours) */
    readonly consolidationRetentionMinMs?: number;
    /** Write-behind debounce window in ms (default: 2000) */
    readonly flushDebounceMs?: number;
    /**
     * Issue #239 — per-flush remote-durability verification deadline (ms)
     * for the token storage provider's flush body. Forwarded into
     * `ProfileTokenStorageProviderOptions.flushVerificationDeadlineMs`
     * when the factory wires up the provider.
     *
     * Defaults to 30 000 when undefined (production wants verification
     * by default). Pass `0` to opt out (tests, dev mode, scenarios
     * where the shutdown gate alone suffices). See
     * `ProfileTokenStorageProviderOptions.flushVerificationDeadlineMs`
     * for full semantics.
     */
    readonly flushVerificationDeadlineMs?: number;
    /**
     * Item #15 Phase F — retention window (in ms) for OUTBOX/SENT
     * tombstones before they are GC'd at snapshot-build time. Tombstones
     * older than this threshold are `db.del()`'d by the per-writer
     * `gcExpiredTombstones()` sweep that runs in the lean-snapshot
     * builder's pre-read hook, AND consequently dropped from the
     * published snapshot (so peers do not receive ancient deletes that
     * have already converged everywhere).
     *
     * Default: 30 days. The safety contract — retention must exceed the
     * longest realistic concurrent-replica pre-sync window — is taken
     * from the Item #4 default; a fortnight-long offline replica still
     * converges before its tombstones are reclaimed.
     *
     * Set lower for tests that exercise the GC path with simulated
     * clocks. Setting to `0` makes every tombstone immediately eligible
     * for purge.
     *
     * @see docs/uxf/OUTBOX-SEND-FOLLOWUPS.md — Item #4 (writer GC) and
     *      Item #15 Phase F (snapshot-build-time hook).
     */
    readonly tombstoneRetentionMs?: number;
    /** Custom bootstrap peers for OrbitDB (convenience alias for orbitDb.bootstrapPeers) */
    readonly profileOrbitDbPeers?: string[];
    /**
     * Publish a wallet-keyed IPNS snapshot of active bundle CIDs after
     * every flush, and attempt to resolve it on cold-start when the
     * local OrbitDB has no bundles. Default: true.
     *
     * This is an OrbitDB-layer parity assist — without it, a freshly
     * re-imported wallet on a wiped device cannot discover its own
     * bundles unless another live peer is replicating the OrbitDB
     * OpLog. Publish is best-effort (never fails the flush).
     *
     * Tests and specialised deployments can opt out with `false`.
     */
    readonly ipnsSnapshot?: boolean;
    /** Enable debug logging (default: false) */
    readonly debug?: boolean;
}
/**
 * Reference to a single UXF bundle stored as a CAR file on IPFS.
 * Each bundle is stored as a separate OrbitDB key: `tokens.bundle.{CID}`.
 * Two devices writing different bundles never conflict because they write
 * to different keys.
 *
 * See PROFILE-ARCHITECTURE.md Section 2.3 for the multi-bundle model.
 */
interface UxfBundleRef {
    /** CID of the UXF CAR file on IPFS */
    readonly cid: string;
    /**
     * Bundle lifecycle status.
     *
     *   - `active`     — JOIN walker includes this bundle.
     *   - `superseded` — older bundle subsumed by a consolidated one.
     *   - `unverified` — recovered from the aggregator pointer but the
     *                    CAR was not fetchable / verifiable at recovery
     *                    time. Excluded from JOIN until a subsequent
     *                    sync re-fetches and promotes to `active`.
     *                    Steelman defense: prevents a compromised
     *                    aggregator from poisoning the local bundle
     *                    index with un-fetchable CIDs. See
     *                    profile/profile-token-storage/lifecycle-
     *                    manager.ts:recoverFromAggregatorPointerBestEffort.
     */
    readonly status: 'active' | 'superseded' | 'unverified';
    /** Creation timestamp (Unix seconds) */
    readonly createdAt: number;
    /** Optional device identifier that created this bundle */
    readonly device?: string;
    /** CID of the consolidated bundle that includes this one (set when superseded) */
    readonly supersededBy?: string;
    /** Unix seconds -- when to remove this entry from the Profile (after safety period) */
    readonly removeFromProfileAfter?: number;
    /** Number of tokens in this bundle (for quick display without fetching CAR) */
    readonly tokenCount?: number;
}
/**
 * Encryption configuration for Profile values.
 * All OrbitDB values and CAR files are encrypted with a key derived
 * from the wallet master key via HKDF.
 *
 * profileEncryptionKey = HKDF(masterKey, "uxf-profile-encryption", 32)
 */
interface ProfileEncryptionConfig {
    /** Whether encryption is enabled (default: true) */
    readonly enabled: boolean;
    /** HKDF info string used for key derivation */
    readonly hkdfInfo: string;
    /** Derived key length in bytes */
    readonly keyLengthBytes: number;
    /** AES-GCM IV length in bytes */
    readonly ivLengthBytes: number;
}
/**
 * Options for constructing a ProfileStorageProvider.
 * The provider wraps a local cache (IndexedDB or file-based) with
 * an OrbitDB-backed persistence layer.
 */
interface ProfileStorageProviderOptions {
    /** Profile configuration */
    readonly config: ProfileConfig;
    /** Enable encryption of OrbitDB values (default: true) */
    readonly encrypt?: boolean;
    /** Encryption configuration overrides */
    readonly encryptionConfig?: Partial<ProfileEncryptionConfig>;
    /**
     * Oracle provider used by the aggregator pointer layer (Phase D wiring).
     * The pointer layer consumes `getAggregatorClient()` and `getRootTrustBase()`
     * from this instance — the same oracle passed to L4 / `PaymentsModule` so
     * the embedded `RootTrustBase` is shared (SPEC §8.4.2 H6).
     */
    readonly oracle?: OracleProvider;
    /** Enable debug logging */
    readonly debug?: boolean;
}
/**
 * Options for constructing a ProfileTokenStorageProvider.
 * The provider bridges TxfStorageData (PaymentsModule format)
 * and UXF bundles stored as encrypted CAR files on IPFS.
 */
interface ProfileTokenStorageProviderOptions {
    /** Profile configuration */
    readonly config: ProfileConfig;
    /** Address identifier for per-address scoping */
    readonly addressId: string;
    /** Enable encryption of CAR files (default: true) */
    readonly encrypt?: boolean;
    /** Encryption configuration overrides */
    readonly encryptionConfig?: Partial<ProfileEncryptionConfig>;
    /** Write-behind debounce window in ms (default: 2000) */
    readonly flushDebounceMs?: number;
    /**
     * Oracle provider used by the aggregator pointer layer (Phase D wiring).
     * Forwarded from the Profile factory. See ProfileStorageProviderOptions.
     */
    readonly oracle?: OracleProvider;
    /**
     * Lazy accessor for the aggregator pointer layer owned by the
     * companion `ProfileStorageProvider`. The pointer layer is
     * constructed asynchronously after Phase B OrbitDB attach, so at
     * factory-time it does not exist yet — callers pass a closure that
     * reads `storage.getPointerLayer()` on demand. Returns `null` when
     * the pointer is unavailable (no oracle, BLOCKED state, storage not
     * durable, etc.); consumers fall back to the legacy IPNS path.
     *
     * Optional during rollout. When absent, token storage runs in the
     * pre-pointer mode (IPNS-only cold-start recovery).
     */
    readonly getPointerLayer?: () => ProfilePointerLayer | null;
    /**
     * Optional accessor for the storage provider's pointer-build status.
     * Used by `recoverFromAggregatorPointerBestEffort` to distinguish:
     *   - 'pending'      — a build is in flight; caller should wait.
     *   - 'unavailable'  — no oracle wired or build deterministically skipped;
     *                      caller falls through to legacy IPNS migration
     *                      WITHOUT polling further.
     *   - 'ready'        — pointer layer is constructed (`getPointerLayer()`
     *                      already returns non-null).
     *
     * Without this accessor the lifecycle manager has to time-bound its
     * poll, which conflates "still building (slow CI)" with "build will
     * never produce one" — leading to spurious legacy-IPNS fallbacks that
     * fork the pointer history. Optional during rollout.
     */
    readonly getPointerBuildStatus?: () => 'pending' | 'unavailable' | 'ready';
    /**
     * Item #15 Phase C.2 — host-injected debounced handler for
     * "profile state changed" signals.
     *
     * Every per-writer mutation (OUTBOX, SENT, finalization queue,
     * recipient context, bundle index) and every JOIN-applied remote
     * change calls into the provider's `notifyProfileDirty()` method
     * (also exposed via the host interface). The provider debounces
     * these notifications over `dirtyFlushDebounceMs` and, when the
     * timer fires, invokes this callback.
     *
     * The natural caller (Sphere / pointer wiring) implements the
     * callback to:
     *   1. Build a lean profile snapshot via `buildLeanProfileSnapshot()`.
     *   2. Pin the snapshot CAR to IPFS.
     *   3. Publish the snapshot CID via the aggregator pointer layer.
     *
     * Optional. When omitted, `notifyProfileDirty()` is a no-op — the
     * Phase B sync writers stay wired but no aggregator-pointer
     * publication happens for non-token-bundle state. This is the
     * default during Phase C rollout; Phase D/E land the full pipeline.
     *
     * Errors thrown by the callback are caught and surfaced via a
     * `storage:error` event with `code: 'PROFILE_DIRTY_FLUSH_FAILED'`.
     * They do NOT propagate into write paths — dirty signalling is
     * best-effort by design.
     */
    readonly onProfileDirtyFlush?: () => Promise<void | ProfileSnapshotPublishResult>;
    /**
     * Item #15 Phase E follow-up — host-injected pull-side snapshot
     * applier. Counterpart to `onProfileDirtyFlush` (which publishes a
     * snapshot CID); this callback consumes a snapshot CID:
     *
     *   1. Fetch the CAR for `cidString` from the configured IPFS
     *      gateways (content-address verified by the fetcher).
     *   2. Parse it as a {@link LeanProfileSnapshot}.
     *   3. Dispatch per-writer JOIN over the parsed snapshot via the
     *      same factory closure that backs
     *      `ProfileStorageProvider.setSnapshotApplier`.
     *
     * Used by `LifecycleManager.runPointerPollOnce` and
     * `recoverFromAggregatorPointerBestEffort` so the periodic-poll and
     * cold-start recovery paths consume the pointer's CID as a snapshot
     * (Item #15) rather than calling `bundleIndex.addBundle()` on the
     * snapshot CID and corrupting the bundle index. The legacy
     * `addBundle` path was a latent bug: under Item #15 the pointer's
     * CID is a snapshot CID, not a UXF bundle CID, so the next `load()`
     * would try to parse the snapshot CAR as a UXF package and fail.
     *
     * Optional. When omitted, lifecycle's pointer paths log and skip
     * (no legacy fallback per Phase E — silent re-write of the snapshot
     * CID as a bundle ref is precisely the bug this option fixes).
     *
     * Errors thrown by the callback propagate to the lifecycle caller's
     * outer try/catch and are logged + re-armed on the next periodic
     * cycle. The pointer cursor is NOT advanced by this path — cursor
     * advancement remains owned by the reconcile-loop's `fetchAndJoin`
     * callback in `pointer-wiring.ts`.
     */
    readonly onApplySnapshot?: (cidString: string) => Promise<ApplySnapshotResult>;
    /**
     * Item #15 Phase C.2 — debounce window for `notifyProfileDirty`
     * signals. Defaults to `flushDebounceMs` (2000ms). Set lower for
     * tests; higher for high-write-volume wallets where the natural
     * flush cadence is already the throttle.
     */
    readonly dirtyFlushDebounceMs?: number;
    /**
     * Issue #239 — per-flush remote-durability verification deadline (ms).
     *
     * After every successful `flushToIpfs` body (pin + bundle ref +
     * snapshot publish), the provider HEAD-verifies the just-pinned CIDs
     * against the configured IPFS gateways AND polls the aggregator
     * `recoverLatest()` until it returns the just-published snapshot CID.
     * The verification gate gives the at-least-once invariant teeth
     * across cross-process and cross-device recovery: a Nostr-delivered
     * token is only ack'd after its containing bundle is **verifiably**
     * fetchable by other peers (closes the cross-process invoice loss
     * documented in #234 / #239).
     *
     * Default when constructed via `createProfileProviders`: **30 000**
     * (production contract). Default when the provider is constructed
     * directly without the factory: **0** (off) — this keeps legacy
     * tests that wire stub pointers + mock IPFS gateways from hanging
     * on HEAD retries against bogus URLs. Callers that want the per-
     * flush contract on a directly-constructed provider must pass an
     * explicit value here.
     *
     * Set to `0` to disable per-flush verification entirely (tests, dev
     * mode, or operators who prefer the shutdown-only gate). Verification
     * is also automatically skipped when no pointer layer is wired (no
     * cross-device recovery surface exists to verify).
     */
    readonly flushVerificationDeadlineMs?: number;
    /** Enable debug logging */
    readonly debug?: boolean;
}
/**
 * Abstract interface for the OrbitDB key-value database.
 * Implemented by the OrbitDB adapter (WU-P03). The rest of the Profile
 * system never imports @orbitdb/core directly -- it uses this interface.
 *
 * Two write/read APIs coexist during the OpLog-schema migration
 * (PROFILE-OPLOG-SCHEMA.md §7):
 *   - Legacy opaque-bytes: `put(key, Uint8Array)` / `get(key)`
 *   - Structured envelope: `putEntry(key, OpLogEntryEnvelope)` / `getEntry(key)`
 * Callers migrate one module at a time. `getEntry` auto-wraps legacy
 * opaque bytes in a synthetic envelope, so a partial migration reads cleanly.
 */
interface ProfileDatabase {
    /**
     * Open the database connection.
     * Creates Helia instance, OrbitDB instance, and opens the KV database
     * with a deterministic address derived from the wallet key.
     */
    connect(config: OrbitDbConfig): Promise<void>;
    /** Write a value (encrypted bytes) to the database. */
    put(key: string, value: Uint8Array): Promise<void>;
    /** Read a value by key. Returns null if the key does not exist. */
    get(key: string): Promise<Uint8Array | null>;
    /** Delete a key from the database. */
    del(key: string): Promise<void>;
    /**
     * Return all entries, optionally filtered by key prefix.
     * Used for listing `tokens.bundle.*` keys.
     *
     * **Round 5 (FIX 3) — `maxResults` cap.** Backends MAY accept an
     * optional `maxResults` cap to short-circuit iteration once that many
     * matching entries have been buffered. Without the cap, a hostile peer
     * planting millions of crafted prefix matches forces unbounded
     * materialization at the OrbitDB layer (the cap on the
     * disposition-storage adapter only bounds DECRYPT calls — the
     * underlying map is still fully populated). Backends that don't
     * support short-circuiting MAY ignore the cap (returning the full
     * matching set, as before) — callers MUST treat the cap as a request,
     * not a guarantee. The returned Map size MAY exceed the cap; the
     * caller still applies its own cap on the result.
     */
    all(prefix?: string, opts?: {
        readonly maxResults?: number;
    }): Promise<Map<string, Uint8Array>>;
    /** Close the database, Helia, and libp2p connections. */
    close(): Promise<void>;
    /**
     * Subscribe to replication events (new data arriving from peers).
     * Returns an unsubscribe function.
     */
    onReplication(callback: () => void): () => void;
    /** Whether `connect()` has been called and `close()` has not. */
    isConnected(): boolean;
    /**
     * Issue #236 — Local Helia accessor (read-only). Exposes the underlying
     * Helia IPFS node so callers (the Profile token-storage layer's pin and
     * fetch paths) can use the local on-disk blockstore as the primary CAR
     * store, treating HTTP IPFS gateways as best-effort replication.
     *
     * Returns the Helia handle on a connected adapter, or `null` when the
     * adapter has not been connected, has been closed, or the implementation
     * does not run a local Helia node. Typed as `unknown` so the public
     * interface does not leak `helia` types — consumers cast to a minimal
     * structural shape (`{ blockstore: { get, put, has } }`).
     *
     * Optional in the interface so legacy adapters that pre-date issue #236
     * (or test stubs) remain compatible — callers MUST treat a missing
     * accessor as equivalent to `null` and fall back to HTTP gateways for
     * both pin and fetch.
     */
    getHelia?(): unknown | null;
    /**
     * Write a structured OpLog entry envelope (PROFILE-OPLOG-SCHEMA.md §5).
     * Type is imported lazily via `import type` elsewhere; declared as
     * `unknown` here to avoid a circular types dependency.
     */
    putEntry?(key: string, entry: unknown): Promise<void>;
    /**
     * Read a structured OpLog entry envelope. Auto-wraps legacy opaque
     * bytes in a synthetic envelope (§7.1). Returns null if key absent.
     *
     * SECURITY DEFAULT: returned envelope's `originated` is forced to
     * `'replicated'` UNLESS caller passes `trustLocalClaim: true` AND the
     * key was written by a local putEntry in this session. Prevents peer-
     * forged `'user'`/`'system'` tags from leaking into local state (§5.2).
     *
     * @param opts.downgradeAsReplicated  — Legacy flag: force downgrade
     *   regardless. Kept for backward compat; new callers use the default.
     * @param opts.trustLocalClaim  — When true, returns the stored tag
     *   verbatim IF the key is known to be locally-authored. Otherwise
     *   still downgrades.
     */
    getEntry?(key: string, opts?: {
        downgradeAsReplicated?: boolean;
        trustLocalClaim?: boolean;
    }): Promise<unknown | null>;
}

/**
 * UXF Inter-Wallet Transfer — Production adapters for
 * {@link DispositionPerEntryStorage} (T.3.C / Round 3).
 *
 * The {@link DispositionPerEntryStorage} interface in
 * `profile/disposition-writer.ts` is consumed by both the disposition
 * writer (T.3.C) and the inclusion-proof importer
 * (`modules/payments/transfer/import-inclusion-proof.ts`). Round 1 added
 * `listKeysWithPrefix` to the interface but no concrete production
 * implementation existed — the interface was implemented only by test
 * fakes. Without a production adapter the importer's `_findInvalidEntry`
 * prefix-scan path raises `dispositionStorage.listKeysWithPrefix is not
 * a function` at runtime.
 *
 * This module provides two production-ready adapters:
 *
 *  1. {@link InMemoryDispositionStorageAdapter} — pure in-memory
 *     implementation, suitable for tests, CLI dev tools, and
 *     development-mode wallets that don't need OrbitDB persistence.
 *
 *  2. {@link OrbitDbDispositionStorageAdapter} — wraps a
 *     {@link ProfileDatabase} (the same OrbitDB key-value store the
 *     rest of the profile system uses). Records are encrypted with the
 *     profile encryption key before write and decrypted on read.
 *     Tombstoned keys (carrying the canonical
 *     `{ tombstoned: true, deletedAt: number }` marker, mirroring the
 *     OutboxWriter convention) are skipped on reads and excluded from
 *     prefix scans.
 *
 * Both adapters honour the `maxResults` cap added in Round 3 to defend
 * against a hostile peer planting millions of crafted prefix matches —
 * unbounded scans degrade into N sequential `readRecord` round-trips
 * via the importer's `_findInvalidEntry` consumer.
 *
 * @module profile/disposition-storage-adapters
 *
 * @see profile/disposition-writer.ts (the interface contract)
 * @see modules/payments/transfer/import-inclusion-proof.ts (consumer)
 * @see PROFILE-ARCHITECTURE §10 (OrbitDB profile KV store)
 */

/**
 * Construction options for {@link OrbitDbDispositionStorageAdapter}.
 */
interface OrbitDbDispositionStorageAdapterOptions {
    /** OrbitDB-backed profile database (same instance the rest of the profile uses). */
    readonly db: ProfileDatabase;
    /** AES-256 key derived from the wallet master key (see {@link deriveProfileEncryptionKey}). */
    readonly encryptionKey: Uint8Array;
    /**
     * Default `maxResults` applied when callers omit the option. Defaults
     * to {@link DEFAULT_LIST_KEYS_MAX_RESULTS}.
     */
    readonly defaultMaxResults?: number;
    /**
     * Item #15 Phase C — fired after every successful mutation on either
     * the `_invalid` / `_audit` sub-prefixes. Also threaded into the four
     * {@link PrefixSyncWriter}s returned by
     * {@link OrbitDbDispositionStorageAdapter.syncWritersFor} so
     * JOIN-applied remote changes mark the profile dirty as well.
     *
     * The local `writeRecord` / `tombstone` paths on this adapter do NOT
     * fire the notifier today — they are write-side surfaces that
     * `DispositionWriter` calls in tandem with manifest mutations that
     * already drive the dirty-flush. Threading the notifier here would
     * cause double-fires; leave it as JOIN-only signalling.
     */
    readonly notifyProfileDirty?: () => void;
}
/**
 * {@link DispositionPerEntryStorage} backed by OrbitDB.
 *
 * Records are JSON-encoded then encrypted with the profile encryption
 * key before write. On read, ciphertext is decrypted and JSON-parsed.
 * Tombstones use the same `{ tombstoned: true, deletedAt }` marker as
 * `OutboxWriter` and the rest of the profile system, so the tombstone
 * protocol is uniform across the codebase.
 *
 * **Prefix-scan implementation.** OrbitDB exposes `db.all(prefix?)`
 * which returns a `Map<string, Uint8Array>` of every stored entry under
 * the prefix. The adapter caps enumeration at `maxResults` to defend
 * against hostile peers planting millions of crafted matches — once
 * the cap is hit, the rest of the iteration is skipped (we still
 * iterate the whole map that `db.all()` returns, but we don't decrypt
 * past the cap, which is the expensive operation for the importer's
 * downstream `readRecord` cascade).
 *
 * Tombstones are filtered: entries that successfully decrypt to a
 * tombstone marker are dropped from the returned key list.
 *
 * **Decode failures.** A peer may write a malformed envelope at any
 * matching key. Rather than fail the whole scan, decode failures are
 * logged once and the offending key is excluded from the result. This
 * matches `OrbitDbAdapter.all()`'s lenient handling of malformed
 * peer-replicated values.
 */
declare class OrbitDbDispositionStorageAdapter implements DispositionPerEntryStorage {
    private readonly db;
    private readonly encryptionKey;
    private readonly defaultMaxResults;
    private readonly notifyProfileDirty;
    constructor(opts: OrbitDbDispositionStorageAdapterOptions);
    readRecord<T>(key: string): Promise<T | undefined>;
    writeRecord<T>(key: string, value: T): Promise<void>;
    /**
     * Tombstone a key. Subsequent reads return undefined; subsequent
     * prefix scans exclude the key. Idempotent.
     */
    tombstone(key: string): Promise<void>;
    listKeysWithPrefix(keyPrefix: string, opts?: {
        readonly maxResults?: number;
    }): Promise<ReadonlyArray<string>>;
    private encodeValue;
    private tryDecode;
    /**
     * Item #15 Phase B.4 — Return four prefix-scoped
     * {@link ProfileSyncWriter}s covering the address's disposition
     * surfaces:
     *
     *   - `${addressId}.invalid.`         — `_invalid` records keyed by
     *                                       (tokenId, observedContentHash).
     *                                       Content-immutable on the key
     *                                       disambiguator; constant-Lamport
     *                                       JOIN via {@link PrefixSyncWriter}
     *                                       is the correct semantics.
     *   - `${addressId}.invalid-orphan.`  — `_invalid` records for entries
     *                                       whose `tokenId` was the empty
     *                                       sentinel (structural-defect
     *                                       hydration throws). See
     *                                       `invalidKeyFor` in
     *                                       `profile/disposition-writer.ts`
     *                                       for the orphan-routing
     *                                       rationale.
     *   - `${addressId}.audit.`           — `_audit` records keyed by
     *                                       (tokenId, observedContentHash).
     *                                       Mostly content-immutable; the
     *                                       rare `auditStatus:
     *                                       'audit-promoted'` mutation
     *                                       causes operator-visible
     *                                       interim divergence that
     *                                       converges eventually.
     *                                       Constant-Lamport semantics
     *                                       are acceptable per the B.4
     *                                       scope analysis (see
     *                                       docs/uxf/OUTBOX-SEND-FOLLOWUPS.md).
     *   - `${addressId}.audit-orphan.`    — `_audit` orphan records (same
     *                                       sentinel routing as
     *                                       `_invalid-orphan`).
     *
     * **NOT covered by this method**: the `${addressId}.manifest.` surface.
     * Manifest entries are Lamport-tracked AND CAS-guarded with per-field
     * merge rules in `mergeManifestEntry`. A byte-verbatim JOIN would lose
     * the per-field merge. The production manifest storage is currently
     * in-memory only (an `MinimalManifestStorage` Map inside `PaymentsModule`),
     * so there is no OrbitDB persistence to JOIN against today. Treat as
     * a deferred follow-up; see `docs/uxf/OUTBOX-SEND-FOLLOWUPS.md` item
     * #15 "Deferred — B.4 manifest" for the path forward.
     *
     * Lifecycle and null semantics mirror
     * {@link OrbitDbRecipientContextStorageAdapter.syncWritersFor}.
     *
     * @param addressId  Wallet-address scope (`DIRECT_xxxxxx_yyyyyy`).
     * @throws TypeError when `addressId` is empty.
     */
    syncWritersFor(addressId: string): {
        readonly invalid: ProfileSyncWriter;
        readonly invalidOrphan: ProfileSyncWriter;
        readonly audit: ProfileSyncWriter;
        readonly auditOrphan: ProfileSyncWriter;
    };
}

/**
 * Pointer-layer wiring helper (Phase D integration, Task #103).
 *
 * Constructs a `ProfilePointerLayer` from the dependencies available
 * inside `ProfileStorageProvider` after Phase B OrbitDB attach. The
 * helper is deliberately fail-open: if any precondition is not met
 * (no oracle, no aggregator client, no bundled trust base, local
 * cache not marked durable, etc.) it returns a structured skip result
 * rather than throwing. Callers report the reason and continue
 * without a pointer layer — the existing recovery path (IPNS, until
 * T-D6 removes it) remains live until all preconditions land.
 *
 * Scope:
 *   - Derive HKDF key material from the wallet private key
 *   - Build pointer signer, flag store, publish mutex
 *   - Wire `fetchCar` / `decodeCid` via profile/ipfs-client +
 *     multiformats
 *   - Wire `readLocalVersion` / `persistLocalVersion` via the local
 *     cache (no envelope; raw KV — the pointer version is per-device,
 *     not replicated)
 *   - Wire `resolveRemoteCid` via `decodeVersionCid` — re-runs Phase
 *     1+2 of `classifyVersion` (inclusion proofs + XOR-decode) to
 *     return the CID bytes for an already-VALID version
 *   - Wire `fetchAndJoin` — fetches the CAR from IPFS with content-
 *     address verify, records the remote CID as a bundle ref in
 *     OrbitDB (`tokens.bundle.{cid}`), and ONLY THEN advances the
 *     per-device cursor by calling `persistLocalVersion`. The bundle-
 *     ref-first ordering is load-bearing: if OrbitDB writes fail
 *     (timeout, sync error), the cursor stays behind OrbitDB and the
 *     next reconcile re-attempts the same `(cidBytes, version)` pair
 *     — recoverable. Reversing the order would silently strand the
 *     bundle on cross-device recovery. The next JOIN pass (inside
 *     ProfileTokenStorageProvider.load()) merges the new ref into the
 *     joined view. The per-token JOIN resolver (Rules 3 + 4 of the
 *     D0 audit) is now wired: `resolveTokenRoot` (`uxf/token-join.ts`
 *     — exported and unit-tested) classifies overlapping tokenIds
 *     across remote + local bundles using longest-valid-chain
 *     semantics, with production callers in `UxfPackage.merge()`
 *     (`uxf/UxfPackage.ts:~785`) and the post-load conflict pass
 *     (`modules/payments/transfer/conflict-merger.ts:~351`). The
 *     reactive submit-time arm (`Item #14` Phase 1) emits
 *     `transfer:double-spend-detected` on aggregator state mismatch,
 *     and the snapshot-time arm (`PR #182`, JOIN-divergent loser
 *     detection in `PaymentsModule.loadFromStorageData` ~line 15112)
 *     drops superseded `'transferring'` tokens with a tombstone.
 *
 * @see PROFILE-AGGREGATOR-POINTER-IMPL-PLAN.md Phase D (T-D4 consumption, T-D3c)
 * @see PROFILE-AGGREGATOR-POINTER-INTEGRATION-MAP.md §3.2
 * @see PROFILE-AGGREGATOR-POINTER-D0-JOIN-AUDIT.md (Rules 1/3/4 — now landed)
 * @see uxf/token-join.ts — resolveTokenRoot implementation
 * @see modules/payments/PaymentsModule.ts — loadFromStorageData JOIN-divergent loser branch (PR #182)
 * @module profile/pointer-wiring
 */

/**
 * Reason a pointer-layer construction was skipped. Surfaced to the
 * caller (ProfileStorageProvider) so the cause can be logged without
 * crashing the connect flow. Keep values stable — they show up in
 * logs and tests may assert on them.
 */
type PointerWiringSkipReason = 'oracle_missing' | 'aggregator_client_unavailable' | 'trust_base_unavailable' | 'storage_not_durable' | 'identity_missing' | 'lock_file_path_missing' | 'snapshot_applier_missing' | 'pointer_init_failed';

/**
 * Storage provider backed by OrbitDB with a local cache layer.
 *
 * Implements the full `StorageProvider` interface as a drop-in replacement
 * for `IndexedDBStorageProvider` or `FileStorageProvider`. Existing code
 * calling `storage.get('mnemonic')` continues to work — the provider
 * translates old key names to Profile key names internally.
 *
 * Constructor takes a local cache provider (existing IndexedDB or file
 * provider), an OrbitDB adapter, and optional configuration.
 */
declare class ProfileStorageProvider implements StorageProvider {
    private readonly localCache;
    private readonly db;
    private readonly options?;
    readonly id = "profile-storage";
    readonly name = "Profile Storage (OrbitDB)";
    readonly type: "p2p";
    readonly description = "OrbitDB-backed profile storage with local cache";
    private identity;
    private profileEncryptionKey;
    /**
     * Base provider status — reflects LOCAL CACHE connectivity only.
     * A Phase-B (OrbitDB attach) failure does not poison this status because
     * the local cache is still usable; callers who defensively disconnect()
     * shouldn't destroy the working cache just because OrbitDB couldn't attach.
     */
    private status;
    /**
     * Independent sub-status for the OrbitDB attach phase.
     *
     *   'disconnected' → initial / after disconnect
     *   'attaching'    → Phase B in progress
     *   'attached'     → OrbitDB is ready for reads/writes
     *   'error'        → transient failure (may be retried by next connect())
     *   'fatal'        → permanent failure (e.g. missing dependency); no retry
     */
    private dbStatus;
    private addressId;
    private encryptionEnabled;
    private debug;
    /**
     * Identity pubkey captured at the last successful Phase B attach.
     * Used by `setIdentity()` to detect a key swap after attach — which
     * would cause writes encrypted under key-B to hit an OrbitDB whose
     * access controller was initialised with key-A, silently rejecting
     * them. The warning gives operators a breadcrumb to diagnose.
     */
    private attachedChainPubkey;
    /**
     * In-flight connect() promise. Deduplicates concurrent callers so Phase A
     * and Phase B each run at most once per observable result. Cleared on
     * completion (success or failure) so the next caller can retry.
     */
    private connectPromise;
    /**
     * In-flight disconnect() promise. Blocks new connect() calls from
     * piggy-backing on a dying attach while disconnect awaits connectPromise.
     * Without this, a concurrent connect() could return success while the DB
     * is being torn down, and subsequent writes would hit a closing OrbitDB.
     */
    private disconnectPromise;
    /**
     * Aggregator pointer layer (Phase D). Constructed lazily after Phase B
     * OrbitDB attach when an OracleProvider is configured AND all
     * preconditions are met (see profile/pointer-wiring.ts). Null when the
     * preconditions are not met — the caller falls back to the legacy
     * recovery path until T-D6 removes it.
     */
    private pointerLayer;
    /**
     * Reason pointer construction was skipped (or null when successful /
     * not yet attempted). Surfaced via getPointerSkipReason() for
     * diagnostics and test assertions.
     */
    private pointerSkipReason;
    /**
     * Steelman pass — serialize concurrent tryBuildPointerLayer() calls.
     * Both connect()'s Phase C and setIdentity()'s deferred fire-and-
     * forget can call tryBuildPointerLayer concurrently when they
     * interleave. Without serialization the buildProfilePointerLayer()
     * lock-file path and master-key construction can race; the layer
     * for identity A may be overwritten by a slower build for identity B
     * (or vice-versa) — silent divergence with OrbitDB writes.
     *
     * The dedup is an in-flight promise: while ANY build is running,
     * subsequent callers wait for it (idempotent re-entry); after it
     * settles, the next caller starts a fresh build.
     */
    private pointerBuildPromise;
    /**
     * Item #15 Phase C — host-supplied "profile state changed" callback.
     * When set, every {@link OutboxWriter} / {@link SentLedgerWriter} /
     * {@link OrbitDbFinalizationQueueStorageAdapter} /
     * {@link OrbitDbRecipientContextStorageAdapter} produced by the
     * `build*` factories is wired with this callback. Mutations and
     * JOIN-applied remote changes invoke it to signal the host's
     * FlushScheduler.
     *
     * Null until {@link setProfileDirtyNotifier} runs (typically during
     * Sphere's wiring step alongside the token-storage facade). Writers
     * constructed before the notifier is set treat the callback as
     * absent — they simply don't emit dirty signals. This matches the
     * Phase A/B contract (the existing pre-#15 flush path is
     * functionally complete without the dirty signals).
     */
    private profileDirtyNotifier;
    /**
     * Item #15 Phase D.2 / E — host-supplied snapshot-apply callback.
     * REQUIRED for pointer-layer construction under Phase E: the
     * `fetchAndJoin` callback parses each remote CAR as a lean profile
     * snapshot and dispatches per-writer JOIN through this callback.
     * The legacy bundle-CID-only write path was removed in Phase E, so
     * `tryBuildPointerLayer` skips with the `snapshot_applier_missing`
     * reason when this is null.
     *
     * Null until {@link setSnapshotApplier} runs (typically during the
     * Profile factory wiring step alongside the token-storage facade,
     * AFTER both providers are constructed so the closure can capture
     * `storage.buildOutboxWriter(...)` and `tokenStorage.getBundleIndex()`).
     *
     * The applier is read each time `tryBuildPointerLayer` runs (i.e.
     * each attach cycle), so callers may change it across reconnects.
     * In practice the factory sets it once at construction.
     */
    private snapshotApplier;
    /**
     * Derived: true iff OrbitDB has been attached.
     * Single source of truth — no separate `dbConnected` field to diverge.
     */
    private get dbConnected();
    /**
     * Item #15 Phase C — register the host's "profile dirty" callback.
     * Idempotent: callers MAY re-register (the most recent callback
     * wins). Pass `null` to disable.
     *
     * The notifier propagates into every writer/adapter built AFTER
     * this call via the `build*` factories. Writers built BEFORE the
     * call continue with their construction-time notifier (or with
     * none if they were built without one). Sphere's wiring sets the
     * notifier early enough that the typical wallet-build path picks
     * it up.
     */
    setProfileDirtyNotifier(notifier: (() => void) | null): void;
    /**
     * Item #15 Phase D.2 / E — register the host's snapshot-apply
     * callback. Idempotent: callers MAY re-register (the most recent
     * callback wins). Pass `null` to disable.
     *
     * The applier is threaded into the pointer-wiring layer on the next
     * `tryBuildPointerLayer` run (called from `doConnect`); callers
     * should set it BEFORE the first `connect()` call so it lands on
     * the first attach cycle. The factory wires it during provider
     * construction, satisfying this ordering.
     *
     * Phase E made the applier REQUIRED for pointer-layer construction.
     * Passing `null` causes the next `tryBuildPointerLayer` run to skip
     * with the `snapshot_applier_missing` reason — the wallet runs
     * without aggregator-pointer recovery rather than silently writing
     * the wrong CAR shape to the bundle index.
     */
    setSnapshotApplier(applier: ((snapshot: LeanProfileSnapshot) => Promise<ApplySnapshotResult>) | null): void;
    constructor(localCache: StorageProvider, db: ProfileDatabase, options?: ProfileStorageProviderOptions | undefined);
    connect(): Promise<void>;
    /**
     * Serialized connect logic — always invoked through the `connectPromise`
     * guard in `connect()`. Must not be called directly.
     */
    private doConnect;
    /**
     * Serialized wrapper around tryBuildPointerLayer. Dedupes concurrent
     * calls from connect()'s Phase C and setIdentity()'s deferred build
     * (steelman). While a build is in-flight, subsequent callers await
     * the same promise; after settle, the field is cleared so a future
     * caller starts a fresh build.
     */
    private runPointerBuildSerialized;
    /**
     * Is the current skip reason a terminal config error that will not
     * be resolved by another connect() attempt? Terminal cases:
     *   - `lock_file_path_missing` — Node without a lock path; fixing
     *     it requires re-constructing the provider
     *   - `pointer_init_failed`    — crypto stack failure (denylist,
     *     malformed key); re-attempting against the same inputs will
     *     fail identically
     * Everything else (oracle_missing, aggregator_client_unavailable,
     * trust_base_unavailable, storage_not_durable, identity_missing)
     * reflects state the caller can fix between connects.
     */
    private isPointerSkipSticky;
    /**
     * Attempt to construct the pointer layer. Never throws — sets
     * `pointerLayer` on success, `pointerSkipReason` otherwise. Runs
     * at most once per attach cycle (reset on disconnect()).
     */
    private tryBuildPointerLayer;
    /**
     * Accessor for the constructed pointer layer. Returns null when the
     * layer could not be built (see `getPointerSkipReason()` for why).
     * Downstream call sites (T-D6 recovery/publish wiring) use this to
     * decide whether to go through the pointer layer or fall back to
     * the legacy path.
     */
    getPointerLayer(): ProfilePointerLayer | null;
    /**
     * Steelman accessor: the pointer-build state machine viewed from the
     * outside.
     *   - 'ready'       — `pointerLayer !== null`.
     *   - 'pending'     — a build is in-flight (`pointerBuildPromise`),
     *                     OR the preconditions are present but the build
     *                     hasn't started yet (e.g., `setIdentity` is about
     *                     to fire-and-forget the build).
     *   - 'unavailable' — no oracle wired, sticky skip reason, or the
     *                     pointer is structurally inaccessible. Callers
     *                     SHOULD NOT poll further; fall through to the
     *                     legacy path immediately.
     *
     * The "pending" classification is conservative: when in doubt, we
     * prefer to keep callers waiting rather than to fire the legacy
     * IPNS migration prematurely (which would fork the pointer chain).
     */
    getPointerBuildStatus(): 'pending' | 'unavailable' | 'ready';
    /**
     * Returns the reason pointer-layer construction was skipped on the
     * last attach attempt, or null when construction succeeded or was
     * not yet attempted (no oracle configured).
     */
    getPointerSkipReason(): PointerWiringSkipReason | null;
    /**
     * Round 7 (FIX 1) — Build an {@link OrbitDbDispositionStorageAdapter}
     * bound to this provider's OrbitDB instance and profile encryption
     * key. Returns null when:
     *  - encryption is disabled (no key to encrypt records with), OR
     *  - identity has not been set yet (no key derived), OR
     *  - the caller passes nothing useful (defensive null-check).
     *
     * The adapter is intentionally constructed lazily: bootstrap callers
     * (Sphere) invoke this AFTER `setIdentity()` (which derives the
     * encryption key) but possibly BEFORE OrbitDB has finished attaching
     * (Phase B). The underlying `OrbitDbAdapter.put/get/all` methods all
     * `ensureConnected()`, so the adapter's actual reads/writes are
     * deferred until the DB is ready — there's no need for the adapter
     * to wait at construction time.
     *
     * Returned adapter is a fresh instance each call; callers SHOULD
     * cache the reference (the returned adapter holds a reference to
     * `this.db` and `this.profileEncryptionKey`, so it follows the
     * lifecycle of this provider).
     *
     * Encryption key sharing: the returned adapter shares the encryption
     * key reference with this provider's internal encrypt/decrypt. If the
     * provider's encryption key is rotated (e.g. via setIdentity with a
     * different chainPubkey), the existing adapter holds the OLD key.
     * Bootstrap layers that detect identity rotation MUST rebuild the
     * adapter via this method.
     */
    buildDispositionStorageAdapter(): OrbitDbDispositionStorageAdapter | null;
    /**
     * G3 — Build an {@link OrbitDbFinalizationQueueStorageAdapter} bound
     * to this provider's OrbitDB instance and profile encryption key.
     * Lifecycle and null semantics mirror
     * {@link buildDispositionStorageAdapter}.
     *
     * The returned adapter persists recipient-side finalization queue
     * entries under `${addr}.finalizationQueue.${entryId}` keys. Each
     * record carries `_schemaVersion: 'uxf-1'` so the legacy
     * PaymentsModule.save() flush path leaves them alone.
     */
    buildFinalizationQueueStorageAdapter(): OrbitDbFinalizationQueueStorageAdapter | null;
    /**
     * G7 — Build an {@link OrbitDbRecipientContextStorageAdapter} bound
     * to this provider's OrbitDB instance and profile encryption key.
     * Persists `_recipientRequestContextMap` and
     * `_recipientFinalizationContext` records under
     * `${addr}.recipientContext.{request,finalization}.${id}` keys.
     * Lifecycle and null semantics mirror
     * {@link buildDispositionStorageAdapter}.
     */
    buildRecipientContextStorageAdapter(): OrbitDbRecipientContextStorageAdapter | null;
    /**
     * Issue #97 — Build an {@link OutboxWriter} bound to this provider's
     * OrbitDB instance and profile encryption key, scoped to the given
     * address. The writer persists per-entry-key UXF outbox entries under
     * `${addressId}.outbox.${id}` (PROFILE-ARCHITECTURE §10.12) which are
     * IPFS-synced as part of the profile so they survive total local
     * profile loss.
     *
     * Returns null when:
     *  - encryption is disabled, OR
     *  - the encryption key has not been derived yet (setIdentity pending)
     *
     * Lifecycle: callers SHOULD cache the returned writer for the current
     * address. On address switch, callers MUST rebuild via this method —
     * the writer's `addressId` is captured at construction.
     *
     * Lamport clock: the writer takes a fresh {@link Lamport} unless the
     * caller passes one. The writer's first `write()` calls
     * `collectObservedLamports()` to rehydrate `max(observed) + 1`, so the
     * fresh-instance default is correct after restart.
     */
    buildOutboxWriter(addressId: string, lamport?: Lamport): OutboxWriter | null;
    /**
     * Issue #97 — Build a {@link SentLedgerWriter} bound to this
     * provider's OrbitDB instance and profile encryption key, scoped to
     * the given address. The writer persists per-entry-key SENT ledger
     * entries under `${addressId}.sent.${id}` (PROFILE-ARCHITECTURE
     * §10.12). Lifecycle and null semantics mirror
     * {@link buildOutboxWriter}.
     *
     * The SENT ledger and the outbox use distinct Lamport instances by
     * design — see profile/sent-ledger-writer.ts module docs. The
     * default `new Lamport()` is correct because the writer's first
     * `write()` rehydrates the max via `collectObservedLamports()`.
     */
    buildSentLedgerWriter(addressId: string, lamport?: Lamport): SentLedgerWriter | null;
    disconnect(): Promise<void>;
    private doDisconnect;
    isConnected(): boolean;
    getStatus(): ProviderStatus;
    /**
     * Set identity for scoped storage.
     * Synchronous. Stores identity, derives profileEncryptionKey via HKDF.
     * Does NOT open OrbitDB — that is deferred to `connect()`.
     */
    setIdentity(identity: FullIdentity): void;
    /**
     * Get value by key.
     * Reads from local cache first. On cache miss, falls back to OrbitDB
     * (decrypt), populates cache, and returns the value.
     */
    get(key: string): Promise<string | null>;
    /**
     * Set value by key.
     * Cache-only keys are written to local cache only.
     * All other keys are encrypted and written to both local cache AND OrbitDB.
     *
     * PROFILE-OPLOG-SCHEMA.md §5.1: the encrypted payload is wrapped in a
     * structured envelope carrying an originated tag. Generic `set` calls
     * default to `type='cache_index', originated='system'` — a safe
     * conservative classification. Callers that know the action semantics
     * SHOULD use `setEntry()` (see below) which accepts an explicit type.
     */
    set(key: string, value: string, opts?: {
        entryType?: OpLogEntryType;
    }): Promise<void>;
    /**
     * Typed-entry write helper — lets callers pass an explicit OpLogEntryType
     * for W11 originated-tag discipline. Maps the user's `OpLogEntryType` to
     * the envelope's `(type, originated)` pair via the originated-tag coherence
     * rules (user-action types → 'user'; system types → 'system').
     *
     * Delegates to `set()` for local-cache write + key translation;
     * the envelope wrap happens internally.
     */
    setEntry(key: string, value: string, entryType: OpLogEntryType): Promise<void>;
    /**
     * Computed ONCE lazily from the adapter's capability surface. Both
     * putEntry AND getEntry must exist together, OR both must be absent —
     * an asymmetric adapter (one method but not the other) would silently
     * corrupt reads, so we treat it as a configuration error.
     *
     * Value is cached after first probe to avoid repeated `typeof` checks
     * on hot paths; reset in `disconnect()` on re-connect.
     */
    private _envelopesSupported;
    /** Probe both putEntry + getEntry exactly once; throw on asymmetry. */
    private supportsEnvelopes;
    /**
     * Write `encryptedPayload` to OrbitDB wrapped in a structured envelope.
     * Falls back to raw-bytes `db.put` if the underlying adapter does not
     * implement putEntry (legacy test stubs, older adapter versions).
     *
     * Capability probe is symmetric: the first call asserts that putEntry
     * and getEntry are either both present or both absent. See
     * `supportsEnvelopes()`.
     */
    private writeEnvelope;
    /**
     * Read an envelope's encrypted payload from OrbitDB. Returns null if
     * the key is absent. Legacy raw-bytes entries are auto-wrapped by
     * `getEntry`'s legacy fallback (§7.1), so this helper works on both
     * pre-schema and post-schema OpLog contents.
     *
     * Passes `trustLocalClaim: true` — callers at this layer have already
     * established that this wallet's OrbitDB instance is its own source of
     * truth (no cross-wallet sharing). Peer writes reach this path only
     * through replication events, which clear the locally-authored set.
     */
    private readEnvelopePayload;
    /**
     * Remove key from both cache and OrbitDB.
     */
    remove(key: string): Promise<void>;
    /**
     * Check if key exists.
     * Checks cache first, then OrbitDB.
     * Special handling for `wallet_exists` on cold cache — falls back to
     * checking OrbitDB for `identity.*` keys.
     */
    has(key: string): Promise<boolean>;
    /**
     * Get all keys with optional prefix filter.
     * Returns the union of keys from cache and OrbitDB, mapped back to
     * legacy format (with appropriate prefixes for callers to consume).
     */
    keys(prefix?: string): Promise<string[]>;
    /**
     * Clear all keys with optional prefix filter.
     * Writes `profile.cleared = true` to OrbitDB so other devices see the clear.
     * Clears local cache via the composed provider.
     */
    clear(prefix?: string): Promise<void>;
    /**
     * Save tracked addresses — encrypt and write to OrbitDB key `addresses.tracked`.
     */
    saveTrackedAddresses(entries: TrackedAddressEntry[]): Promise<void>;
    /**
     * Load tracked addresses — read from cache or OrbitDB, decrypt, parse.
     */
    loadTrackedAddresses(): Promise<TrackedAddressEntry[]>;
    /**
     * Read the ENCRYPTED OrbitDB envelope payload for a key WITHOUT
     * decryption. Returns a base64-encoded ciphertext string suitable
     * for round-tripping through `setEncryptedRaw`. Returns null when
     * the key is absent or stored cache-only / excluded.
     *
     * The whole point of this method is to defeat the "decrypt-on-read,
     * leak-into-CAR" mnemonic-leak path closed in Wave 9 critical #1.
     * `profile-export` must NOT see plaintext for identity-class keys
     * (`mnemonic`, `master_key`, `chain_code`, ...) — the snapshot CAR
     * is supposed to carry encrypted bytes only, decryptable solely
     * by a wallet sharing the source's master key (and therefore
     * mnemonic). This entry point bypasses the in-cache plaintext
     * shadow that `set()` populates and reads the OrbitDB ciphertext
     * envelope directly.
     *
     * Cache-only keys (price cache, registry cache) and excluded keys
     * (IPFS state) return null — they are never written to OrbitDB.
     *
     * @param key - The legacy (caller-facing) key name, same shape as
     *              passed to `get()` / `set()`.
     * @returns Base64-encoded encrypted bytes, or null when absent.
     * @throws ProfileError when OrbitDB is not connected (the export
     *         path requires durable backing — refusing here forces
     *         the caller to surface the error rather than silently
     *         emit a snapshot with missing identity entries).
     */
    getEncryptedRaw(key: string): Promise<string | null>;
    /**
     * Write a previously-extracted encrypted envelope payload back to
     * OrbitDB without re-encryption. The destination wallet's master
     * key MUST match the source's (verified by the importer's
     * `expectedChainPubkey` check), or the ciphertext will be
     * unreadable on subsequent `get()` calls — but this method does
     * NOT verify decryptability, since the import path runs before the
     * destination's storage has settled.
     *
     * Local-cache plaintext is intentionally NOT populated here: the
     * destination's `get()` will fall through to OrbitDB and decrypt
     * fresh on first read. Populating cache with the ciphertext would
     * defeat the cache (it'd pretend to be plaintext and fail callers
     * with corrupted bytes).
     *
     * @param key   - Legacy key name (same shape as `set()`).
     * @param value - Base64-encoded encrypted bytes from `getEncryptedRaw`.
     */
    setEncryptedRaw(key: string, value: string): Promise<void>;
    /**
     * Encrypt a string value for OrbitDB storage.
     * If encryption is disabled, returns the raw UTF-8 bytes.
     */
    private encrypt;
    /**
     * Decrypt bytes from OrbitDB to a string.
     * If encryption is disabled, decodes as raw UTF-8.
     */
    private decrypt;
    private log;
}

/** Network configurations */
declare const NETWORKS: {
    readonly mainnet: {
        readonly name: "Mainnet";
        readonly aggregatorUrl: "https://aggregator.unicity.network/rpc";
        readonly nostrRelays: readonly ["wss://relay.unicity.network", "wss://relay.damus.io", "wss://nos.lol", "wss://relay.nostr.band"];
        readonly ipfsGateways: readonly string[];
        readonly electrumUrl: "wss://fulcrum.unicity.network:50004";
        readonly groupRelays: readonly ["wss://sphere-relay.unicity.network"];
        readonly tokenRegistryUrl: "https://raw.githubusercontent.com/unicitynetwork/unicity-ids/refs/heads/main/unicity-ids.testnet.json";
    };
    readonly testnet: {
        readonly name: "Testnet";
        readonly aggregatorUrl: "https://goggregator-test.unicity.network";
        readonly nostrRelays: readonly ["wss://nostr-relay.testnet.unicity.network"];
        readonly ipfsGateways: readonly string[];
        readonly electrumUrl: "wss://fulcrum.unicity.network:50004";
        readonly groupRelays: readonly ["wss://sphere-relay.unicity.network"];
        readonly tokenRegistryUrl: "https://raw.githubusercontent.com/unicitynetwork/unicity-ids/refs/heads/main/unicity-ids.testnet.json";
    };
    readonly dev: {
        readonly name: "Development";
        readonly aggregatorUrl: "https://dev-aggregator.dyndns.org/rpc";
        readonly nostrRelays: readonly ["wss://nostr-relay.testnet.unicity.network"];
        readonly ipfsGateways: readonly string[];
        readonly electrumUrl: "wss://fulcrum.unicity.network:50004";
        readonly groupRelays: readonly ["wss://sphere-relay.unicity.network"];
        readonly tokenRegistryUrl: "https://raw.githubusercontent.com/unicitynetwork/unicity-ids/refs/heads/main/unicity-ids.testnet.json";
    };
};
type NetworkType = keyof typeof NETWORKS;

/**
 * Profile Node.js Factory
 *
 * Standalone factory function for creating Profile-backed providers in Node.js
 * environments. Uses FileStorageProvider as the local cache layer.
 *
 * This module does NOT modify `impl/nodejs/index.ts`. It is a standalone
 * entry point that consumers opt into explicitly.
 *
 * @example
 * ```ts
 * import { createNodeProfileProviders } from '@unicitylabs/sphere-sdk/profile/node';
 *
 * const { storage, tokenStorage } = createNodeProfileProviders({
 *   network: 'testnet',
 *   dataDir: './wallet-data',
 *   profileConfig: {
 *     orbitDb: { privateKey: '...', directory: './orbitdb-data' },
 *   },
 * });
 *
 * const { sphere } = await Sphere.init({
 *   storage,
 *   tokenStorage,
 *   transport: ...,
 *   oracle: ...,
 * });
 * ```
 *
 * @module profile/node
 */

/**
 * Configuration for the Node.js Profile factory.
 */
interface NodeProfileProvidersConfig {
    /** Network preset: mainnet, testnet, or dev */
    readonly network: NetworkType;
    /** Directory for wallet data storage (local cache) */
    readonly dataDir: string;
    /** Profile-specific configuration overrides */
    readonly profileConfig?: Partial<ProfileConfig>;
    /**
     * Oracle provider for the aggregator pointer layer. Pass the same
     * `oracle` instance that will be handed to `Sphere.init` / L4 so the
     * embedded `RootTrustBase` is shared (SPEC §8.4.2 H6). Optional during
     * rollout; required once pointer-layer recovery replaces IPNS (T-D6).
     */
    readonly oracle?: OracleProvider;
}
/**
 * Result of creating Node.js Profile providers.
 */
interface NodeProfileProviders {
    /** Profile-backed storage provider (drop-in for FileStorageProvider) */
    readonly storage: ProfileStorageProvider;
    /** Profile-backed token storage provider (drop-in for FileTokenStorageProvider) */
    readonly tokenStorage: ProfileTokenStorageProvider;
}
/**
 * Create Profile-backed storage providers for Node.js environments.
 *
 * Constructs a FileStorageProvider as the local cache, wraps it with
 * ProfileStorageProvider (OrbitDB-backed), and creates a
 * ProfileTokenStorageProvider for token operations.
 *
 * The returned providers are drop-in replacements for the standard Node.js
 * providers. When using Profile providers, IpfsStorageProvider is NOT needed --
 * OrbitDB replication replaces IPNS-based sync.
 *
 * @param config - Node.js profile configuration
 * @returns Profile-backed storage and token storage providers
 */
declare function createNodeProfileProviders(config: NodeProfileProvidersConfig): NodeProfileProviders;

export { type NodeProfileProviders, type NodeProfileProvidersConfig, createNodeProfileProviders };
