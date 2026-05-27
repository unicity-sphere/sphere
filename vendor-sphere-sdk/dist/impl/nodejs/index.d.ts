import { NostrClient, NostrKeyManager, Event } from '@unicitylabs/nostr-js-sdk';
import { StateTransitionClient } from '@unicitylabs/state-transition-sdk/lib/StateTransitionClient';
import { AggregatorClient } from '@unicitylabs/state-transition-sdk/lib/api/AggregatorClient';
import { RootTrustBase } from '@unicitylabs/state-transition-sdk/lib/bft/RootTrustBase';
import { TransferCommitment as TransferCommitment$1 } from '@unicitylabs/state-transition-sdk/lib/transaction/TransferCommitment';

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
type OracleEventType = 'oracle:connected' | 'oracle:disconnected' | 'oracle:error' | 'commitment:submitted' | 'proof:received' | 'validation:completed';
interface OracleEvent {
    type: OracleEventType;
    timestamp: number;
    data?: unknown;
    error?: string;
}
type OracleEventCallback = (event: OracleEvent) => void;
/**
 * Trust base loader interface for platform-specific loading
 * Browser: fetch from URL
 * Node.js: read from file
 */
interface TrustBaseLoader$1 {
    /**
     * Load trust base JSON data
     * @returns Trust base data or null if not available
     */
    load(): Promise<unknown | null>;
}

/**
 * Unicity Aggregator Provider
 * Platform-independent implementation using @unicitylabs/state-transition-sdk
 *
 * The oracle is a trusted service that provides verifiable truth
 * about token state through cryptographic inclusion proofs.
 *
 * TrustBaseLoader is injected for platform-specific loading:
 * - Browser: fetch from URL
 * - Node.js: read from file
 */

interface SdkMintCommitment {
    requestId?: {
        toString(): string;
    };
    [key: string]: unknown;
}
interface UnicityAggregatorProviderConfig {
    /** Aggregator URL */
    url: string;
    /** API key for authentication */
    apiKey?: string;
    /** Request timeout (ms) */
    timeout?: number;
    /** Skip trust base verification (dev only) */
    skipVerification?: boolean;
    /** Enable debug logging */
    debug?: boolean;
    /** Trust base loader (platform-specific) */
    trustBaseLoader?: TrustBaseLoader$1;
}
/**
 * Unicity Aggregator Provider
 * Concrete implementation of OracleProvider using Unicity's aggregator service
 */
declare class UnicityAggregatorProvider implements OracleProvider {
    readonly id = "unicity-aggregator";
    readonly name = "Unicity Aggregator";
    readonly type: "network";
    readonly description = "Unicity state transition aggregator (oracle implementation)";
    private config;
    private status;
    private eventCallbacks;
    private aggregatorClient;
    private stateTransitionClient;
    private trustBase;
    /** Get the current trust base */
    getTrustBase(): RootTrustBase | null;
    /**
     * Get the bundled RootTrustBase (H6 — SPEC §8.4.2).
     *
     * Alias for getTrustBase(), exposed under the spec-canonical name so the
     * pointer layer can consume the same bundled trust base as L4.
     */
    getRootTrustBase(): RootTrustBase | null;
    /** Get the state transition client */
    getStateTransitionClient(): StateTransitionClient | null;
    /** Get the aggregator client */
    getAggregatorClient(): AggregatorClient | null;
    private spentCache;
    private static SPENT_CACHE_MAX;
    /** Wave L: bounded cache insert. */
    private cacheSpent;
    constructor(config: UnicityAggregatorProviderConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getStatus(): ProviderStatus;
    initialize(trustBase?: RootTrustBase): Promise<void>;
    /**
     * Submit a transfer commitment to the aggregator.
     * Accepts either an SDK TransferCommitment or a simple commitment object.
     */
    submitCommitment(commitment: TransferCommitment | TransferCommitment$1): Promise<SubmitResult>;
    /**
     * Submit a mint commitment to the aggregator (SDK only)
     * @param commitment - SDK MintCommitment instance
     */
    submitMintCommitment(commitment: SdkMintCommitment): Promise<SubmitResult>;
    private isSdkTransferCommitment;
    getProof(requestId: string): Promise<InclusionProof | null>;
    waitForProof(requestId: string, options?: WaitOptions): Promise<InclusionProof>;
    validateToken(tokenData: unknown): Promise<ValidationResult>;
    /**
     * Issue #245 #5 — derive the hex-encoded publicKey from a parsed
     * SDK Token's current state predicate. Best-effort; returns `null`
     * when the predicate is missing or cannot be materialized.
     *
     * Same recipe as PaymentsModule's
     * `extractCurrentStatePublicKeyHexFromSdkData` but operates on an
     * already-parsed `SdkToken` (validateToken parses once and shares).
     */
    private derivePredicatePublicKeyHex;
    /**
     * Wait for inclusion proof using SDK (for SDK commitments)
     */
    waitForProofSdk(commitment: TransferCommitment$1 | SdkMintCommitment, signal?: AbortSignal): Promise<unknown>;
    /**
     * Wave G.3: cryptographic verification of an inclusion proof for
     * the UXF Rule 4 enrichment gate.
     *
     * Reconstructs the SDK `InclusionProof` from the supplied JSON
     * shape, derives the `RequestId` from the proof's authenticator
     * (publicKey + stateHash imprint), and calls `proof.verify()`
     * against the bundled `RootTrustBase`. Returns true ONLY on
     * `OK` — anything else (PATH_NOT_INCLUDED / PATH_INVALID /
     * NOT_AUTHENTICATED / thrown) returns false so a buggy or
     * forged proof can never be lifted into a synthetic token-root.
     *
     * Cache: results are memoized by transactionHash since proof
     * verification is deterministic given (proofJson, trustBase,
     * tx). The cache is bounded; a Profile-level merge typically
     * runs verifyInclusionProof O(N) times where N = number of
     * unique tx-proof pairs in the merge candidates, often
     * single-digit.
     */
    private inclusionProofCache;
    private static INCLUSION_PROOF_CACHE_MAX;
    verifyInclusionProof(input: {
        proofJson: unknown;
        transactionHash: string;
        proofHash?: string;
    }): Promise<boolean>;
    isSpent(publicKey: string, stateHash: string): Promise<boolean>;
    getTokenState(tokenId: string): Promise<TokenState | null>;
    getCurrentRound(): Promise<number>;
    mint(params: MintParams): Promise<MintResult>;
    onEvent(callback: OracleEventCallback): () => void;
    private rpcCall;
    private ensureConnected;
    private emitEvent;
    private log;
}
/** @deprecated Use UnicityAggregatorProvider instead */
declare const UnicityOracleProvider: typeof UnicityAggregatorProvider;
/** @deprecated Use UnicityAggregatorProviderConfig instead */
type UnicityOracleProviderConfig = UnicityAggregatorProviderConfig;

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

/**
 * Optional capability marker.  Storage providers that guarantee write
 * durability (fsync / IndexedDB transaction.oncomplete) expose this symbol
 * as a property set to `true`.  Backends that omit it are treated as
 * non-durable and rejected at init.
 *
 * IMPORTANT: This is a module-local Symbol (NOT Symbol.for).  Only code that
 * imports `DURABLE_STORAGE` from this module can mark a backend durable.
 * A package using Symbol.for('aggregator-pointer:durable-storage') would get
 * a DIFFERENT symbol and cannot forge the durability claim.
 */
declare const DURABLE_STORAGE: unique symbol;

/**
 * UXF Inter-Wallet Transfer Wire Format — Types & Runtime Guards (T.1.A)
 *
 * Defines the discriminated union that travels in Nostr `TOKEN_TRANSFER`
 * encrypted event content for the UXF transfer protocol v1.0.
 *
 * Spec references:
 * - §3.1   `UxfTransferPayload` discriminated union
 * - §3.2   `kind: 'uxf-car'`  — small bundles, inline base64 CAR bytes
 * - §3.3   `kind: 'uxf-cid'`  — large bundles, CID-by-reference
 * - §3.3.1 Per-call sender overrides (`DeliveryStrategy`)
 * - §3.4   TXF (legacy) wire shape — 4 structural shapes
 * - §5.6   Replay / duplicate / merge handling (idempotency invariants)
 * - §9.3   Unknown-sender threat model (sender.nametag UNAUTHENTICATED)
 *
 * NOTE: this module is types-only. It does NOT import `MAX_INLINE_CAR_BYTES`,
 * `INLINE_CAR_RELAY_CEILING_BYTES`, or any limit constants — those belong to
 * T.1.D. Consumers (T.1.B.1 / T.1.C / T.1.D / T.3.A) read this barrel for
 * shape definitions and structural guards.
 *
 * Companion module: `types/txf.ts` (the on-disk TXF token shape, distinct
 * from the legacy wire shapes enumerated below — §3.4 is about the wire
 * envelope a peer publishes on Nostr, not about token storage).
 */
/**
 * Common fields shared by both `uxf-car` and `uxf-cid` payloads.
 *
 * @remarks
 * - `bundleCid` is the canonical bundle identity (CIDv1, base32, multibase
 *   prefix `b`). It is REQUIRED and authenticates the bundle contents
 *   when the receiver re-derives it from the CAR bytes. See §3.2/§3.3.
 * - `tokenIds` is ADVISORY ONLY — the receiver processes every token-root
 *   element it finds in the CAR pool and filters by ownership. Senders
 *   populate this for UI/audit; receivers MUST NOT use it for security
 *   gating (§5.6).
 * - `memo` is UNAUTHENTICATED — the outer envelope is not covered by
 *   `bundleCid`. Display-only.
 * - `sender.nametag` is UNAUTHENTICATED on the wire. The receiver MUST
 *   re-resolve the nametag against the Nostr signing pubkey via the
 *   identity-binding event before any UI display (§9.3, T.7.B.5).
 */
interface UxfTransferPayloadBase {
    /** Discriminator — `'uxf-car'` for inline, `'uxf-cid'` for by-reference. */
    readonly kind: 'uxf-car' | 'uxf-cid';
    /** Protocol version of THIS payload schema. Increment on breaking changes. */
    readonly version: '1.0';
    /** Transfer mode used by the sender. ADVISORY — recipient processes per
     *  bundle contents, not per this field. */
    readonly mode: 'conservative' | 'instant';
    /** Bundle CID — CIDv1, base32-encoded (multibase prefix 'b'). REQUIRED. */
    readonly bundleCid: string;
    /** Token IDs the sender claims are in this bundle. ADVISORY ONLY (§5.6).
     *  Lowercase-hex matching the BYTE_FIELDS canonical form for `tokenId`. */
    readonly tokenIds: readonly string[];
    /** Optional sender memo. UNAUTHENTICATED — outer envelope is not covered
     *  by `bundleCid`. */
    readonly memo?: string;
    /** Sender identity. UNAUTHENTICATED on wire — see field-level docs. */
    readonly sender?: {
        /** 64-hex (32-byte secp256k1 x-coordinate, NIP-19 nsec-derived). */
        readonly transportPubkey: string;
        /**
         * Plaintext nametag claim. UNTRUSTED ON WIRE — display ONLY after
         * re-resolving against the Nostr signing pubkey via the
         * identity-binding event. See §9.3 and T.7.B.5.
         */
        readonly nametag?: string;
    };
}
/**
 * `kind: 'uxf-car'` — inline CAR bundle delivered inside the Nostr event.
 *
 * Used when the assembled CAR fits under the configured inline cap
 * (default 16 KiB, hard ceiling 96 KiB — see T.1.D for limit constants).
 * No IPFS round-trip required; recipient base64-decodes and verifies the
 * embedded bytes against `bundleCid`.
 *
 * @see §3.2
 */
interface UxfTransferPayloadCar extends UxfTransferPayloadBase {
    readonly kind: 'uxf-car';
    /**
     * Base64-encoded CAR bytes. SIZE-CAPPED at the inline ceiling enforced by
     * the sender. The recipient also enforces an upper bound and rejects
     * oversize payloads with `INLINE_CAR_TOO_LARGE`.
     */
    readonly carBase64: string;
}
/**
 * `kind: 'uxf-cid'` — CID-by-reference, used for bundles exceeding the
 * inline cap. Sender pins the CAR to IPFS, sends only the CID over Nostr.
 *
 * The receiver fetches the CAR via the verified-CAR pipeline using its
 * own configured gateway list. `senderGateways` is an INFORMATIONAL hint;
 * a hostile sender could lie, so the verification layer always rehashes
 * the fetched bytes against `bundleCid`.
 *
 * @see §3.3
 */
interface UxfTransferPayloadCid extends UxfTransferPayloadBase {
    readonly kind: 'uxf-cid';
    /** Optional gateway hint set the sender used (informational only). */
    readonly senderGateways?: readonly string[];
}
/**
 * Legacy Sphere TXF single-token transfer (current pre-UXF default).
 * Shape: `{sourceToken, transferTx, memo?, sender?}` (§3.4).
 */
interface LegacySphereTxfPayload {
    /** Serialized source token (SDK token JSON or storage shape). */
    readonly sourceToken: unknown;
    /** Serialized transfer transaction. */
    readonly transferTx: unknown;
    readonly memo?: string;
    readonly sender?: {
        readonly transportPubkey?: string;
        readonly nametag?: string;
    };
}
/**
 * Legacy V6 multi-token combined transfer.
 * Shape: `{type: 'COMBINED_TRANSFER', version: '6.0', ...}` (§3.4).
 *
 * @remarks Canonical type lives at `types/instant-split.ts ::
 * CombinedTransferBundleV6`. Replicated structurally here as the legacy
 * detector only requires the discriminator fields, not the full payload.
 */
interface LegacyCombinedTransferPayload {
    readonly type: 'COMBINED_TRANSFER';
    readonly version: '6.0';
    readonly [k: string]: unknown;
}
/**
 * Legacy V5/V4 instant-split transfer.
 * Shape: `{type: 'INSTANT_SPLIT', version: '4.0' | '5.0', ...}` (§3.4).
 *
 * @remarks Canonical types live at `types/instant-split.ts ::
 * InstantSplitBundleV4 | InstantSplitBundleV5`.
 */
interface LegacyInstantSplitPayload {
    readonly type: 'INSTANT_SPLIT';
    readonly version: '4.0' | '5.0';
    readonly [k: string]: unknown;
}
/**
 * Legacy SDK-shape transfer.
 * Shape: `{token, proof}` (§3.4).
 */
interface LegacySdkPayload {
    readonly token: unknown;
    readonly proof: unknown;
    readonly [k: string]: unknown;
}
/**
 * Union of all four legacy wire shapes (§3.4).
 *
 * @remarks Note that legacy payloads do NOT carry a `kind` field on the
 * wire — they are recognized STRUCTURALLY via {@link isLegacyTokenTransferPayload}.
 * The TypeScript-level discrimination of {@link UxfTransferPayload} happens
 * via the presence vs. absence of `kind`.
 */
type LegacyTokenTransferPayload = LegacySphereTxfPayload | LegacyCombinedTransferPayload | LegacyInstantSplitPayload | LegacySdkPayload;
/**
 * Top-level wire payload published in Nostr `TOKEN_TRANSFER` events.
 *
 * TypeScript discrimination:
 *  - `kind === 'uxf-car'` → {@link UxfTransferPayloadCar}
 *  - `kind === 'uxf-cid'` → {@link UxfTransferPayloadCid}
 *  - no `kind` field      → {@link LegacyTokenTransferPayload} (one of 4 shapes)
 *
 * Use {@link isUxfTransferPayload} / {@link isLegacyTokenTransferPayload}
 * for runtime narrowing; both are paranoid against null/undefined/primitives.
 */
type UxfTransferPayload = UxfTransferPayloadCar | UxfTransferPayloadCid | LegacyTokenTransferPayload;

/**
 * Transport Provider Interface
 * Platform-independent P2P messaging abstraction
 */

/**
 * P2P messaging transport provider
 */
interface TransportProvider extends BaseProvider {
    /**
     * Set identity for signing/encryption.
     * If the transport is already connected, reconnects with the new identity.
     */
    setIdentity(identity: FullIdentity): void | Promise<void>;
    /**
     * Send encrypted direct message
     * @param recipientTransportPubkey - Transport-specific pubkey for messaging
     * @returns Event ID
     */
    sendMessage(recipientTransportPubkey: string, content: string): Promise<string>;
    /**
     * Subscribe to incoming direct messages
     * @returns Unsubscribe function
     */
    onMessage(handler: MessageHandler): () => void;
    /**
     * Send token transfer payload
     * @param recipientTransportPubkey - Transport-specific pubkey for messaging
     * @returns Event ID
     */
    sendTokenTransfer(recipientTransportPubkey: string, payload: TokenTransferPayload): Promise<string>;
    /**
     * Subscribe to incoming token transfers
     * @returns Unsubscribe function
     */
    onTokenTransfer(handler: TokenTransferHandler): () => void;
    /**
     * Resolve any identifier to full peer information.
     * Accepts @nametag, bare nametag, DIRECT://, PROXY://, L1 address, chain pubkey, or transport pubkey.
     * @param identifier - Any supported identifier format
     * @returns PeerInfo or null if not found
     */
    resolve?(identifier: string): Promise<PeerInfo | null>;
    /**
     * Resolve nametag to public key
     */
    resolveNametag?(nametag: string): Promise<string | null>;
    /**
     * Resolve nametag to full peer information
     * Returns transportPubkey, chainPubkey, l1Address, directAddress, proxyAddress
     */
    resolveNametagInfo?(nametag: string): Promise<PeerInfo | null>;
    /**
     * Resolve a DIRECT://, PROXY://, or L1 address to full peer info.
     * Performs reverse lookup: address → binding event → PeerInfo.
     * @param address - L3 address (DIRECT://... or PROXY://...) or L1 address (alpha1...)
     * @returns PeerInfo or null if no binding found for this address
     */
    resolveAddressInfo?(address: string): Promise<PeerInfo | null>;
    /**
     * Resolve transport pubkey to full peer info.
     * Queries binding events authored by the given transport pubkey.
     * @param transportPubkey - Transport-specific pubkey (e.g. 64-char hex string)
     * @returns PeerInfo or null if no binding found
     */
    resolveTransportPubkeyInfo?(transportPubkey: string): Promise<PeerInfo | null>;
    /**
     * Batch-resolve multiple transport pubkeys to peer info.
     * Used for HD address discovery: derives transport pubkeys for indices 0..N
     * and queries binding events in a single batch.
     * @param transportPubkeys - Array of transport-specific pubkeys to look up
     * @returns Array of PeerInfo for pubkeys that have binding events (may be shorter than input)
     */
    discoverAddresses?(transportPubkeys: string[]): Promise<PeerInfo[]>;
    /**
     * Recover nametag for current identity by decrypting stored encrypted nametag
     * Used after wallet import to recover associated nametag
     * @returns Decrypted nametag or null if none found
     */
    recoverNametag?(): Promise<string | null>;
    /**
     * Publish identity binding event.
     * Without nametag: publishes base binding (chainPubkey, l1Address, directAddress).
     * With nametag: adds nametag hash, proxy address, encrypted nametag for recovery.
     * Uses parameterized replaceable event (kind 30078, d=hash(nostrPubkey)).
     * @returns true if successful, false if nametag is taken by another pubkey
     */
    publishIdentityBinding?(chainPubkey: string, l1Address: string, directAddress: string, nametag?: string): Promise<boolean>;
    /**
     * Subscribe to broadcast messages (global/channel)
     */
    subscribeToBroadcast?(tags: string[], handler: BroadcastHandler): () => void;
    /**
     * Publish broadcast message
     */
    publishBroadcast?(content: string, tags?: string[]): Promise<string>;
    /**
     * Send payment request to a recipient
     * @param recipientTransportPubkey - Transport-specific pubkey for messaging
     * @returns Event ID
     */
    sendPaymentRequest?(recipientTransportPubkey: string, request: PaymentRequestPayload): Promise<string>;
    /**
     * Subscribe to incoming payment requests
     * @returns Unsubscribe function
     */
    onPaymentRequest?(handler: PaymentRequestHandler): () => void;
    /**
     * Send response to a payment request
     * @param recipientTransportPubkey - Transport-specific pubkey for messaging
     * @returns Event ID
     */
    sendPaymentRequestResponse?(recipientTransportPubkey: string, response: PaymentRequestResponsePayload): Promise<string>;
    /**
     * Subscribe to incoming payment request responses
     * @returns Unsubscribe function
     */
    onPaymentRequestResponse?(handler: PaymentRequestResponseHandler): () => void;
    /**
     * Send a read receipt for a message
     * @param recipientTransportPubkey - Transport pubkey of the message sender
     * @param messageEventId - Event ID of the message being acknowledged
     */
    sendReadReceipt?(recipientTransportPubkey: string, messageEventId: string): Promise<void>;
    /**
     * Subscribe to incoming read receipts
     * @returns Unsubscribe function
     */
    onReadReceipt?(handler: ReadReceiptHandler): () => void;
    /**
     * Send typing indicator to a recipient
     * @param recipientTransportPubkey - Transport pubkey of the conversation partner
     */
    sendTypingIndicator?(recipientTransportPubkey: string): Promise<void>;
    /**
     * Subscribe to incoming typing indicators
     * @returns Unsubscribe function
     */
    onTypingIndicator?(handler: TypingIndicatorHandler): () => void;
    /**
     * Send composing indicator to a recipient using NIP-44 encrypted gift wrap
     * @param recipientTransportPubkey - Transport pubkey of the conversation partner
     * @param content - JSON payload with senderNametag and expiresIn
     */
    sendComposingIndicator?(recipientTransportPubkey: string, content: string): Promise<void>;
    /**
     * Subscribe to incoming composing indicators
     * @returns Unsubscribe function
     */
    onComposing?(handler: ComposingHandler): () => void;
    /**
     * Get list of configured relay URLs
     */
    getRelays?(): string[];
    /**
     * Get list of currently connected relay URLs
     */
    getConnectedRelays?(): string[];
    /**
     * Add a relay dynamically
     * @returns true if added successfully
     */
    addRelay?(relayUrl: string): Promise<boolean>;
    /**
     * Remove a relay dynamically
     * @returns true if removed successfully
     */
    removeRelay?(relayUrl: string): Promise<boolean>;
    /**
     * Check if a relay is configured
     */
    hasRelay?(relayUrl: string): boolean;
    /**
     * Check if a relay is currently connected
     */
    isRelayConnected?(relayUrl: string): boolean;
    /**
     * Send an instant split bundle to a recipient.
     * This is a specialized method for INSTANT_SPLIT V5 bundles.
     *
     * @param recipientTransportPubkey - Transport-specific pubkey for messaging
     * @param bundle - The InstantSplitBundleV5 to send
     * @returns Event ID
     */
    sendInstantSplitBundle?(recipientTransportPubkey: string, bundle: InstantSplitBundlePayload): Promise<string>;
    /**
     * Subscribe to incoming instant split bundles.
     *
     * @param handler - Handler for received bundles
     * @returns Unsubscribe function
     */
    onInstantSplitReceived?(handler: InstantSplitBundleHandler): () => void;
    /**
     * Set fallback 'since' timestamp for event subscriptions.
     * Used when switching to an address that has never subscribed before.
     * The transport uses this instead of 'now' as the initial since filter,
     * ensuring events sent while the address was inactive are not missed.
     * Consumed once by the next subscription setup, then cleared.
     *
     * @param sinceSeconds - Unix timestamp in seconds
     */
    setFallbackSince?(sinceSeconds: number): void;
    /**
     * Set fallback 'since' timestamp for DM (gift-wrap) subscriptions.
     * Used when no persisted DM timestamp exists in storage (e.g. first connect).
     * Consumed once by the next subscription setup, then cleared.
     *
     * @param sinceSeconds - Unix timestamp in seconds
     */
    setFallbackDmSince?(sinceSeconds: number): void;
    /**
     * Fetch pending events from transport (one-shot query).
     * Creates a temporary subscription, processes events through normal handlers,
     * and resolves after EOSE (End Of Stored Events).
     */
    fetchPendingEvents?(): Promise<void>;
    /**
     * Issue #166 P2 #3 — Re-query the underlying transport (e.g. Nostr
     * relay set) to verify that a previously published event identified
     * by `eventId` is still persisted / available for delivery.
     *
     * Used by the {@link NostrPersistenceVerifier} worker to detect
     * relay retention drops AFTER the immediate post-publish
     * verification window has passed (the `publishWithVerification` path
     * in NostrTransportProvider catches losses within the first second;
     * this method catches longer-term eviction or relay-segregation
     * failures minutes to hours later).
     *
     * Return semantics:
     *  - `'retained'` — the event is present on at least one queried
     *    relay. Worker marks the SENT entry as verified and skips it on
     *    subsequent cycles.
     *  - `'missing'`  — the event is NOT present on any queried relay
     *    despite a successful past publish. Worker emits
     *    `transfer:retention-warning`. The bundle is still
     *    content-addressed via `bundleCid` so the recipient's replay-LRU
     *    deduplicates on re-publish, but THIS PR does not attempt
     *    re-publication — that is gated to a follow-up wave because the
     *    safety surface (preserved bundle data, recipient pubkey, key
     *    rotation interaction) is too large to ship as a backfill.
     *  - `'unverifiable'` — the query itself failed (relay timeout,
     *    connection lost, malformed response). Worker leaves the entry
     *    untouched and retries next cycle. NOT treated as missing
     *    because a transient query failure must not produce false
     *    `retention-warning` events.
     *
     * Implementations SHOULD make this method best-effort and never
     * throw — convert exceptions to `'unverifiable'` internally.
     *
     * @param eventId  The relay-assigned event id returned by
     *                 {@link sendTokenTransfer}.
     * @returns        See above.
     */
    verifyTokenTransferRetained?(eventId: string): Promise<'retained' | 'missing' | 'unverifiable'>;
    /**
     * Register a handler to be called when the chat subscription receives EOSE
     * (End Of Stored Events), indicating that historical DMs have been delivered.
     * The handler fires at most once per subscription lifecycle.
     *
     * @returns Unsubscribe function
     */
    onChatReady?(handler: () => void): () => void;
}
/**
 * Payload for sending instant split bundles
 */
interface InstantSplitBundlePayload {
    /** The bundle JSON string (InstantSplitBundleV5 serialized) */
    bundle: string;
    /** Optional memo */
    memo?: string;
    /** Sender info */
    sender?: {
        transportPubkey: string;
        nametag?: string;
    };
}
/**
 * Incoming instant split bundle
 */
interface IncomingInstantSplitBundle {
    /** Event ID */
    id: string;
    /** Transport-specific pubkey of sender */
    senderTransportPubkey: string;
    /** The bundle JSON string */
    bundle: string;
    /** Timestamp */
    timestamp: number;
}
/**
 * Handler for instant split bundles
 */
type InstantSplitBundleHandler = (bundle: IncomingInstantSplitBundle) => void;
interface IncomingMessage {
    id: string;
    /** Transport-specific pubkey of sender */
    senderTransportPubkey: string;
    /** Sender's nametag (if known from NIP-17 unwrap) */
    senderNametag?: string;
    content: string;
    timestamp: number;
    encrypted: boolean;
    /** Set when this is a self-wrap replay (sent message recovered from relay) */
    isSelfWrap?: boolean;
    /** Recipient pubkey — only present on self-wrap replays */
    recipientTransportPubkey?: string;
}
type MessageHandler = (message: IncomingMessage) => void;
/**
 * Wire payload for the Nostr `TOKEN_TRANSFER` event (kind 31113).
 *
 * Shape-agnostic at the transport layer — this is a tagged union of:
 *
 *  - {@link UxfTransferPayloadCar} (`kind: 'uxf-car'`) — inline CAR via base64
 *  - {@link UxfTransferPayloadCid} (`kind: 'uxf-cid'`) — CID-by-reference
 *  - {@link LegacyTokenTransferPayload} — one of four pre-UXF shapes
 *    (Sphere TXF `{sourceToken, transferTx}`, V6 `COMBINED_TRANSFER`,
 *    V5/V4 `INSTANT_SPLIT`, SDK `{token, proof}`).
 *
 * The transport layer SERIALIZES whichever shape it is handed (UXF via
 * the canonical encoder from {@link "../uxf/transfer-payload"}, legacy via
 * pass-through `JSON.stringify`), and DELIVERS whichever shape arrives over
 * the wire to {@link TokenTransferHandler}. Shape discrimination is the
 * receiver/handler's responsibility — see `PaymentsModule` (T.7.A).
 *
 * Re-exported from `types/uxf-transfer` (T.1.A) so all transport callers
 * share one source of truth for the union.
 *
 * @see UxfTransferPayload
 * @see LegacyTokenTransferPayload
 */
type TokenTransferPayload = UxfTransferPayload;
interface IncomingTokenTransfer {
    id: string;
    /** Transport-specific pubkey of sender */
    senderTransportPubkey: string;
    payload: TokenTransferPayload;
    timestamp: number;
}
/**
 * Token-transfer handler return contract (at-least-once invariant):
 *  - `true` (or `void`/`undefined` — legacy backward-compat): the inbound
 *    event has been durably processed (token persisted to all configured
 *    TokenStorageProviders, including IPFS pin for the Profile provider).
 *    The transport MAY advance `lastEventTs` past this event.
 *  - `false`: the event was received but the handler could not durably
 *    persist its tokens (flush failure, IPFS unreachable, monotonicity
 *    violation, etc.). The transport MUST NOT advance `lastEventTs` so
 *    the event is re-replayed on the next reconnect. Re-processing is
 *    idempotent (addToken stateHash dedup; processedCombinedTransferIds
 *    dedup; etc.).
 *
 * Returning `void`/`undefined` preserves the pre-invariant contract for
 * external handlers — they default to "durable" so existing code does
 * not regress to "never ack".
 */
type TokenTransferHandler = (transfer: IncomingTokenTransfer) => void | boolean | Promise<void | boolean>;
interface PaymentRequestPayload {
    /** Amount requested (in smallest units) */
    amount: string | bigint;
    /** Coin/token type ID */
    coinId: string;
    /** Message/memo for recipient */
    message?: string;
    /** Recipient's nametag (who should pay) */
    recipientNametag?: string;
    /** Custom metadata */
    metadata?: Record<string, unknown>;
}
interface IncomingPaymentRequest {
    /** Event ID */
    id: string;
    /** Transport-specific pubkey of sender */
    senderTransportPubkey: string;
    /** Sender's nametag (if included in encrypted content) */
    senderNametag?: string;
    /** Parsed request data */
    request: {
        requestId: string;
        amount: string;
        coinId: string;
        message?: string;
        recipientNametag?: string;
        metadata?: Record<string, unknown>;
    };
    /** Timestamp */
    timestamp: number;
}
type PaymentRequestHandler = (request: IncomingPaymentRequest) => void;
type PaymentRequestResponseType = 'accepted' | 'rejected' | 'paid';
interface PaymentRequestResponsePayload {
    /** Original request ID */
    requestId: string;
    /** Response type */
    responseType: PaymentRequestResponseType;
    /** Optional message */
    message?: string;
    /** Transfer ID (if paid) */
    transferId?: string;
}
interface IncomingPaymentRequestResponse {
    /** Event ID */
    id: string;
    /** Transport-specific pubkey of responder */
    responderTransportPubkey: string;
    /** Parsed response data */
    response: {
        requestId: string;
        responseType: PaymentRequestResponseType;
        message?: string;
        transferId?: string;
    };
    /** Timestamp */
    timestamp: number;
}
type PaymentRequestResponseHandler = (response: IncomingPaymentRequestResponse) => void;
interface IncomingBroadcast {
    id: string;
    /** Transport-specific pubkey of author */
    authorTransportPubkey: string;
    content: string;
    tags: string[];
    timestamp: number;
}
type BroadcastHandler = (broadcast: IncomingBroadcast) => void;
type TransportEventType = 'transport:connected' | 'transport:disconnected' | 'transport:reconnecting' | 'transport:error' | 'transport:relay_added' | 'transport:relay_removed' | 'message:received' | 'message:sent' | 'transfer:received' | 'transfer:sent';
interface TransportEvent {
    type: TransportEventType;
    timestamp: number;
    data?: unknown;
    error?: string;
}
type TransportEventCallback = (event: TransportEvent) => void;
/**
 * Resolved peer identity information.
 * Returned by resolve methods — contains all public address formats for a peer.
 * Fields nametag and proxyAddress are optional (only present if nametag is registered).
 */
interface PeerInfo {
    /** Nametag name (without @), if registered */
    nametag?: string;
    /** Transport-specific pubkey (for messaging/encryption) */
    transportPubkey: string;
    /** 33-byte compressed secp256k1 public key (for L3 chain) */
    chainPubkey: string;
    /** L1 address (alpha1...) */
    l1Address: string;
    /** L3 DIRECT address (DIRECT://...) */
    directAddress: string;
    /** L3 PROXY address derived from nametag hash (PROXY:...), only if nametag registered */
    proxyAddress?: string;
    /** Event timestamp */
    timestamp: number;
    /**
     * Wire protocols the peer advertises support for. Canonical v1.0 set is
     * `['uxf-car', 'uxf-cid', 'txf']`. Empty/absent means "unknown".
     */
    wireProtocols?: ReadonlyArray<string>;
    /**
     * Asset kinds the peer advertises support for. Canonical v1.0 set is
     * `['coin', 'nft']`. Per §10.4 / W20: ABSENT ⇒ assume `['coin']`
     * (forward-compatibility default for older peers that pre-date NFTs).
     */
    assetKinds?: ReadonlyArray<string>;
}
interface IncomingReadReceipt {
    /** Transport-specific pubkey of the sender who read the message */
    senderTransportPubkey: string;
    /** Event ID of the message that was read */
    messageEventId: string;
    /** Timestamp */
    timestamp: number;
}
type ReadReceiptHandler = (receipt: IncomingReadReceipt) => void;
interface IncomingTypingIndicator {
    /** Transport-specific pubkey of the sender who is typing */
    senderTransportPubkey: string;
    /** Sender's nametag (if known) */
    senderNametag?: string;
    /** Timestamp */
    timestamp: number;
}
type TypingIndicatorHandler = (indicator: IncomingTypingIndicator) => void;
type ComposingHandler = (indicator: ComposingIndicator) => void;

/**
 * WebSocket Abstraction
 * Platform-independent WebSocket interface for cross-platform support
 */
/**
 * Minimal WebSocket interface compatible with browser and Node.js
 */
interface IWebSocket {
    readonly readyState: number;
    send(data: string): void;
    close(code?: number, reason?: string): void;
    onopen: ((event: unknown) => void) | null;
    onclose: ((event: unknown) => void) | null;
    onerror: ((event: unknown) => void) | null;
    onmessage: ((event: IMessageEvent) => void) | null;
}
interface IMessageEvent {
    data: string;
}
/**
 * Factory function to create WebSocket instances
 * Different implementations for browser (native) vs Node.js (ws package)
 */
type WebSocketFactory = (url: string) => IWebSocket;
/**
 * Generate a unique ID (platform-independent)
 * Browser: crypto.randomUUID()
 * Node: crypto.randomUUID() or uuid package
 */
type UUIDGenerator = () => string;

/**
 * Nostr Transport Provider
 * Platform-independent implementation using Nostr protocol for P2P messaging
 *
 * Uses @unicitylabs/nostr-js-sdk for:
 * - Real secp256k1 event signing
 * - NIP-04 encryption/decryption
 * - Event ID calculation
 * - NostrClient for reliable connection management (ping, reconnect, NIP-42)
 *
 * WebSocket is injected via factory for cross-platform support
 */

/**
 * Minimal key-value storage interface for transport persistence.
 * Used to persist the last processed event timestamp across sessions.
 */
interface TransportStorageAdapter {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
}
interface NostrTransportProviderConfig {
    /** Nostr relay URLs */
    relays?: string[];
    /** Connection timeout (ms) */
    timeout?: number;
    /** Auto-reconnect on disconnect */
    autoReconnect?: boolean;
    /** Reconnect delay (ms) */
    reconnectDelay?: number;
    /** Max reconnect attempts */
    maxReconnectAttempts?: number;
    /** Enable debug logging */
    debug?: boolean;
    /** WebSocket factory (required for platform support) */
    createWebSocket: WebSocketFactory;
    /** UUID generator (optional, defaults to crypto.randomUUID) */
    generateUUID?: UUIDGenerator;
    /** Optional storage adapter for persisting subscription timestamps */
    storage?: TransportStorageAdapter;
}
declare class NostrTransportProvider implements TransportProvider {
    readonly id = "nostr";
    readonly name = "Nostr Transport";
    readonly type: "p2p";
    readonly description = "P2P messaging via Nostr protocol";
    private config;
    private storage;
    /** In-memory max event timestamp to avoid read-before-write races in updateLastEventTimestamp. */
    private lastEventTs;
    /** In-memory max DM (gift-wrap) event timestamp. */
    private lastDmEventTs;
    /** Fallback 'since' timestamp for first-time address subscriptions (consumed once). */
    private fallbackSince;
    /** Fallback 'since' timestamp for DM (gift-wrap) subscriptions (consumed once). */
    private fallbackDmSince;
    private identity;
    private keyManager;
    private status;
    private nostrClient;
    private mainSubscriptionId;
    private processedEventIds;
    private inFlightEventIds;
    /**
     * Issue #275 — debounce timer for persisting `processedEventIds` and
     * `failedEventCooldowns`. Coalesces a burst of EOSE-replay arrivals
     * into a single storage write. Set to `LIMITS.PROCESSED_EVENT_IDS_FLUSH_MS`.
     */
    private persistDedupTimer;
    /** Reentrancy guard so concurrent schedules don't race the in-flight write. */
    private persistDedupInFlight;
    /** True once dedup state has been hydrated from storage; gates re-hydration. */
    private dedupHydrated;
    /**
     * Issue #272 + #275 — per-event failure cooldown ledger for TOKEN_TRANSFER
     * replays. When `handleIncomingTransfer` returns `false` (the at-
     * least-once gate refused the ack), we record an exponential cool-
     * down so the relay-paced replay storm cannot busy-spin the
     * receive pipeline (parse → crypto verify → flush → HEAD-verify)
     * for the same event on every reconnect cycle.
     *
     * Semantics:
     *   - `attempts` counts consecutive durability misses. Cleared on
     *     success (advance happens) or when the bounded budget exhausts.
     *   - `nextRetryAt` is `Date.now() + min(COOLDOWN_BASE_MS * 2^(n-1),
     *     COOLDOWN_MAX_MS)`. Events arriving inside the cooldown window
     *     are skipped without entering the gate.
     *   - After `MAX_REPLAY_ATTEMPTS` consecutive misses, we ADVANCE the
     *     cursor anyway and emit an operator alert. This matches the
     *     acceptance criterion in issue #272: "`[AT-LEAST-ONCE] not
     *     durable` count per token bounded by a small constant (≤3)
     *     rather than unbounded replay." Local-durability is intact
     *     (issue #272 also decoupled the per-flush HEAD-verify from
     *     the gate, so persistent durability=false now strictly
     *     indicates an underlying OrbitDB/pin POST/publish failure that
     *     replay alone won't fix — operator intervention is the right
     *     escalation).
     *   - The map is LRU-capped to bound memory under pathological
     *     replay floods. Eviction is single-victim per insert when at
     *     capacity (cheap; no full sort).
     *
     * Issue #275: this map is now PERSISTED across process restarts so
     * the bounded replay budget accumulates across CLI invocations
     * instead of resetting to zero per-process. Without persistence, a
     * persistently-failing TOKEN_TRANSFER could replay across CLI
     * sessions indefinitely because every fresh process saw `attempts=1`
     * and never reached the budget exhaustion threshold.
     */
    private failedEventCooldowns;
    private static readonly DURABILITY_COOLDOWN_BASE_MS;
    private static readonly DURABILITY_COOLDOWN_MAX_MS;
    private static readonly DURABILITY_MAX_REPLAY_ATTEMPTS;
    private static readonly DURABILITY_COOLDOWN_MAP_CAP;
    private messageHandlers;
    private transferHandlers;
    private paymentRequestHandlers;
    private paymentRequestResponseHandlers;
    private readReceiptHandlers;
    private typingIndicatorHandlers;
    private composingHandlers;
    private pendingMessages;
    /**
     * Issue #247 — buffer for TOKEN_TRANSFER events that arrive on this
     * outer provider before any handler is registered. The pre-Mux race
     * (#223 comment in `handleTokenTransfer`) sees relay events landing
     * here while `PaymentsModule` has registered its handler on the
     * AddressTransportAdapter, not on this provider. Without a buffer,
     * the events are dropped (allDurable=false → since-not-advanced) and
     * the only recovery is replay-on-reconnect — producing the persistent
     * "TOKEN_TRANSFER ... not durable" storm observed in
     * manual-test-full-recovery.sh.
     *
     * Buffered transfers are drained when a handler registers via
     * `onTokenTransfer` (in-session catch-up). If the process exits
     * before any handler registers, `lastEventTs` was not advanced and
     * the events replay on next reconnect — preserving at-least-once.
     *
     * Each entry retains the original event's `created_at` (seconds) so
     * the drain can advance `lastEventTs` per-event on successful
     * delivery.
     */
    private pendingTransfers;
    private broadcastHandlers;
    private eventCallbacks;
    constructor(config: NostrTransportProviderConfig);
    /**
     * Get the WebSocket factory (used by MultiAddressTransportMux to share the same factory).
     */
    getWebSocketFactory(): WebSocketFactory;
    /**
     * Get the configured relay URLs.
     */
    getConfiguredRelays(): string[];
    /**
     * Get the storage adapter.
     */
    getStorageAdapter(): TransportStorageAdapter | null;
    /**
     * Get the underlying NostrClient (or null if not yet connected).
     *
     * Exposed so {@link MultiAddressTransportMux} can share the same
     * client/socket pair instead of opening a duplicate WebSocket per
     * relay (#123). The transport owns the client's lifecycle — callers
     * MUST NOT call {@code disconnect()} on the returned instance.
     */
    getNostrClient(): NostrClient | null;
    /**
     * Suppress event subscriptions — unsubscribe wallet/chat filters
     * but keep the connection alive for resolve/identity-binding operations.
     * Used when MultiAddressTransportMux takes over event handling.
     *
     * Stops application-level keepalive ping timers on the bare connection.
     * After suppression this NostrClient has zero active subscriptions; the
     * connection is retained only as an outbound resolve()/identity-binding
     * channel. Application pings on a subscription-free connection have been
     * empirically observed to elicit no relay response, causing
     * `appears stale` flapping every ~45 s. OS-level TCP keepalive maintains
     * connection liveness; we don't need application-level pings here.
     */
    suppressSubscriptions(): void;
    /**
     * Stop the bare NostrClient's per-relay application-level keepalive
     * ping timers. Reaches into NostrClient internals via a structural cast
     * because `stopPingTimer(url)` and `relays` are declared `private` in
     * @unicitylabs/nostr-js-sdk. An upstream PR adding a public
     * `stopAllPingTimers()` would let us drop this cast.
     *
     * Called from `suppressSubscriptions()` and from the post-reconnect path
     * in `setIdentity` when suppression is active — every fresh NostrClient
     * starts its own ping timers on connect, so we must re-stop them after
     * each replacement.
     */
    private stopApplicationPingsOnBareClient;
    private _subscriptionsSuppressed;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getStatus(): ProviderStatus;
    /**
     * Get list of configured relay URLs
     */
    getRelays(): string[];
    /**
     * Get list of currently connected relay URLs
     */
    getConnectedRelays(): string[];
    /**
     * Add a new relay dynamically
     * Will connect immediately if provider is already connected
     */
    addRelay(relayUrl: string): Promise<boolean>;
    /**
     * Remove a relay dynamically
     * Will disconnect from the relay if connected
     * NOTE: NostrClient doesn't support removing individual relays at runtime.
     * We remove from config so it won't be used on next connect().
     */
    removeRelay(relayUrl: string): Promise<boolean>;
    /**
     * Check if a relay is configured
     */
    hasRelay(relayUrl: string): boolean;
    /**
     * Check if a relay is currently connected
     */
    isRelayConnected(relayUrl: string): boolean;
    setIdentity(identity: FullIdentity): Promise<void>;
    setFallbackSince(sinceSeconds: number): void;
    setFallbackDmSince(sinceSeconds: number): void;
    /**
     * Get the Nostr-format public key (32 bytes / 64 hex chars)
     * This is the x-coordinate only, without the 02/03 prefix.
     */
    getNostrPubkey(): string;
    sendMessage(recipientPubkey: string, content: string): Promise<string>;
    onMessage(handler: MessageHandler): () => void;
    sendTokenTransfer(recipientPubkey: string, payload: TokenTransferPayload): Promise<string>;
    onTokenTransfer(handler: TokenTransferHandler): () => void;
    sendPaymentRequest(recipientPubkey: string, payload: PaymentRequestPayload): Promise<string>;
    onPaymentRequest(handler: PaymentRequestHandler): () => void;
    sendPaymentRequestResponse(recipientPubkey: string, payload: PaymentRequestResponsePayload): Promise<string>;
    onPaymentRequestResponse(handler: PaymentRequestResponseHandler): () => void;
    sendReadReceipt(recipientTransportPubkey: string, messageEventId: string): Promise<void>;
    onReadReceipt(handler: ReadReceiptHandler): () => void;
    sendTypingIndicator(recipientTransportPubkey: string): Promise<void>;
    onTypingIndicator(handler: TypingIndicatorHandler): () => void;
    onChatReady(handler: () => void): () => void;
    onComposing(handler: ComposingHandler): () => void;
    sendComposingIndicator(recipientPubkey: string, content: string): Promise<void>;
    /**
     * Resolve any identifier to full peer information.
     * Routes to the appropriate specific resolve method based on identifier format.
     */
    resolve(identifier: string): Promise<PeerInfo | null>;
    resolveNametag(nametag: string): Promise<string | null>;
    resolveNametagInfo(nametag: string): Promise<PeerInfo | null>;
    /**
     * Resolve a DIRECT://, PROXY://, or L1 address to full peer info.
     * Performs reverse lookup via nostr-js-sdk with first-seen-wins anti-hijacking.
     */
    resolveAddressInfo(address: string): Promise<PeerInfo | null>;
    /**
     * Convert a BindingInfo (from nostr-js-sdk) to PeerInfo (sphere-sdk type).
     * Computes PROXY address from nametag if available.
     *
     * T.8.B — When a nametag is resolved we additionally do a best-effort
     * query for the peer's capability-bearing identity binding event (lives
     * on a different d-tag than the nametag binding). Capability hints are
     * informational only and the lookup never throws on failure.
     */
    private bindingInfoToPeerInfo;
    /**
     * T.8.B — Extract capability hints (`wireProtocols`, `assetKinds`) from
     * a binding event's raw JSON content.
     *
     * Returns an object whose keys are present ONLY when the corresponding
     * field appeared in the parsed content. This preserves the W20 absent vs
     * empty distinction at the type level: a missing key on the returned
     * object means "field absent on the wire" (for `assetKinds` callers
     * default to `['coin']` per W20); an EMPTY array means "field present
     * but empty" (informational quirk, no W20 default).
     */
    private extractCapabilityHints;
    /**
     * T.8.B — Best-effort fetch of capability hints for a peer.
     *
     * Queries the predictable per-pubkey identity binding event (the one
     * `publishIdentityBindingWithCapabilities` writes) and returns the hints
     * extracted from its content. Returns an empty object on any failure
     * (relay error, no event, parse error). Capability hints are
     * informational and MUST NOT block resolution.
     */
    private fetchCapabilityHints;
    /**
     * Resolve transport pubkey (Nostr pubkey) to full peer info.
     * Queries binding events authored by the given pubkey.
     */
    resolveTransportPubkeyInfo(transportPubkey: string): Promise<PeerInfo | null>;
    /**
     * Batch-resolve multiple transport pubkeys to peer info.
     * Used for HD address discovery — single relay query with multi-author filter.
     */
    discoverAddresses(transportPubkeys: string[]): Promise<PeerInfo[]>;
    /**
     * Recover nametag for the current identity by searching for encrypted nametag events
     * Used after wallet import to recover associated nametag
     * @returns Decrypted nametag or null if none found
     */
    recoverNametag(): Promise<string | null>;
    /**
     * Publish identity binding event on Nostr.
     * Without nametag: publishes base binding (chainPubkey, l1Address, directAddress)
     * using a per-identity d-tag for address discovery.
     * With nametag: delegates to nostr-js-sdk's publishNametagBinding which handles
     * conflict detection (first-seen-wins), encryption, and indexed tags.
     *
     * @returns true if successful, false if nametag is taken by another pubkey
     */
    publishIdentityBinding(chainPubkey: string, l1Address: string, directAddress: string, nametag?: string): Promise<boolean>;
    /**
     * T.8.B — Publish a base identity binding event (no nametag) carrying
     * capability hints in the JSON content.
     *
     * Uses the same d-tag formula as the upstream nostr-js-sdk
     * createIdentityBindingEvent (`SHA256('unicity:identity:' + nostrPubkey)`)
     * so this event participates in the same parameterized-replaceable slot
     * (kind 30078 — APP_DATA). Older readers that parse only the four
     * canonical fields (`public_key`, `l1_address`, `direct_address`,
     * `proxy_address`) ignore the additional `wire_protocols` and
     * `asset_kinds` arrays — forward-compatible by construction.
     *
     * Spec refs: §10.4 (capability hints), W20 (assetKinds default).
     */
    private publishIdentityBindingWithCapabilities;
    private broadcastSubscriptions;
    subscribeToBroadcast(tags: string[], handler: BroadcastHandler): () => void;
    publishBroadcast(content: string, tags?: string[]): Promise<string>;
    onEvent(callback: TransportEventCallback): () => void;
    private handleEvent;
    /**
     * Issue #275 — add an event ID to the persistent dedup set and
     * schedule a debounced write. FIFO-eviction keeps the set bounded
     * at `LIMITS.PROCESSED_EVENT_IDS_CAP`.
     */
    private markEventProcessed;
    /**
     * Issue #275 — schedule a debounced write of the persistent dedup
     * sets to storage. Coalesces a burst of EOSE-replay arrivals into a
     * single storage transaction. Subsequent calls within the debounce
     * window are no-ops (timer already armed).
     */
    private schedulePersistDedup;
    /**
     * Issue #275 — write the persistent dedup sets to storage. Serialized
     * via `persistDedupInFlight` so concurrent timer fires (debounce + a
     * forced flush) don't race on the underlying KV write.
     */
    private persistDedupNow;
    private doPersistDedup;
    /**
     * Issue #275 — hydrate the persistent dedup sets from storage on the
     * first connect/fetchPendingEvents per identity. Idempotent: subsequent
     * calls are no-ops once `dedupHydrated` is true.
     *
     * Failure modes (storage read throw, JSON parse error, malformed
     * data) all degrade to "start fresh" — the wallet still works, just
     * pays the cross-process re-dispatch tax once until the next write
     * cycle repopulates the disk.
     */
    private hydrateProcessedDedup;
    /**
     * Save the max event timestamp to storage (fire-and-forget, no await needed by caller).
     * Uses in-memory `lastEventTs` to avoid read-before-write race conditions
     * when multiple events arrive in quick succession.
     */
    private updateLastEventTimestamp;
    /**
     * Issue #272 — return true iff this event ID has a live durability
     * cooldown. Cleans up the entry when the cooldown has expired so the
     * map doesn't accumulate stale entries on the read path.
     */
    private isInDurabilityCooldown;
    /**
     * Issue #272 — record a durability miss for this event ID and arm
     * an exponential cooldown. Returns `true` when the per-event replay
     * budget (`DURABILITY_MAX_REPLAY_ATTEMPTS`) is exhausted — in that
     * case the caller should advance the `since` cursor (the entry is
     * deleted by this method to free the slot) so subsequent events
     * are not blocked indefinitely behind one persistently-failing one.
     * Local-durability is decoupled from this gate (issue #272 background-
     * verify patch in `flush-scheduler.ts`), so a persistent miss after
     * the budget exhausts indicates a genuine local persistence failure
     * (OrbitDB write timeout / pin POST != 200 / monotonicity violation)
     * that re-replay alone cannot resolve.
     */
    private recordDurabilityMiss;
    /** Persist the max DM (gift-wrap) event timestamp for the since filter on next connect. */
    private updateLastDmEventTimestamp;
    private handleDirectMessage;
    private handleGiftWrap;
    private handleTokenTransfer;
    private handlePaymentRequest;
    private handlePaymentRequestResponse;
    private handleBroadcast;
    private createEvent;
    private createEncryptedEvent;
    private publishEvent;
    /**
     * Publish an event with verification: after publishing, query the relay to
     * confirm the event was stored. Retries up to `maxAttempts` times on failure.
     *
     * This is critical for token transfers and DMs where silent loss means
     * funds or messages disappear. The nostr-js-sdk's publishEvent resolves on
     * a 5s timeout even without relay confirmation, so verification is needed.
     */
    private publishWithVerification;
    /**
     * Issue #166 P2 #3 — Verify a previously published TOKEN_TRANSFER
     * event is still persisted by querying the relay for its event id.
     *
     * Implements the {@link TransportProvider.verifyTokenTransferRetained}
     * contract: NEVER throws — converts query failures (no connection,
     * timeout, malformed response) to `'unverifiable'`. The verifier
     * worker treats `'unverifiable'` as "retry next cycle"; only
     * `'missing'` triggers a retention-warning event.
     */
    verifyTokenTransferRetained(eventId: string): Promise<'retained' | 'missing' | 'unverifiable'>;
    fetchPendingEvents(): Promise<void>;
    /**
     * Default upper bound for `queryEvents` REQ→EOSE wait. Was 15 s historically
     * but real-network testnet runs (Phase 9 e2e) repeatedly observed the relay
     * fluctuating between healthy (<200 ms EOSE) and degraded (10-25 s EOSE,
     * sometimes never EOSE). 60 s pushes the timeout past every degraded
     * sample we've captured while still failing fast on real "no such event"
     * queries. Override per call via the second argument.
     */
    private static readonly DEFAULT_QUERY_TIMEOUT_MS;
    private queryEvents;
    private walletSubscriptionId;
    private chatSubscriptionId;
    private chatEoseHandlers;
    private chatEoseFired;
    private subscribeToEvents;
    private subscribeToTags;
    private decryptContent;
    /**
     * Strip known content prefixes (nostr-js-sdk compatibility)
     * Handles: payment_request:, token_transfer:, etc.
     */
    private stripContentPrefix;
    private ensureConnected;
    /**
     * Async version of ensureConnected — reconnects if the original transport
     * lost its WebSocket while subscriptions are suppressed (mux handles events).
     * Used by resolve methods which are always async.
     */
    private ensureConnectedForResolve;
    private ensureReady;
    private emitEvent;
    /**
     * Create a NIP-17 gift wrap with a custom inner rumor kind.
     * Replicates the three-layer NIP-59 envelope (rumor → seal → gift wrap)
     * because NIP17.createGiftWrap hardcodes kind 14 for the inner rumor.
     */
    private createCustomKindGiftWrap;
    /**
     * Create a NIP-17 gift wrap with a custom rumor kind.
     * Shared between NostrTransportProvider and MultiAddressTransportMux.
     */
    static createCustomKindGiftWrap(keyManager: NostrKeyManager, recipientPubkeyHex: string, content: string, rumorKind: number): Event;
}

/**
 * Price Provider Interface
 *
 * Platform-independent abstraction for fetching token market prices.
 * Does not extend BaseProvider — stateless HTTP client with internal caching.
 */

/**
 * Supported price provider platforms
 */
type PricePlatform = 'coingecko';
/**
 * Price data for a single token
 */
interface TokenPrice {
    /** Token name used by the price platform (e.g., "bitcoin") */
    readonly tokenName: string;
    /** Price in USD */
    readonly priceUsd: number;
    /** Price in EUR (if available) */
    readonly priceEur?: number;
    /** 24h price change percentage (if available) */
    readonly change24h?: number;
    /** Timestamp when this price was fetched */
    readonly timestamp: number;
}
/**
 * Price data provider
 *
 * Fetches current market prices for tokens. Implementations handle
 * caching internally to avoid excessive API calls.
 *
 * @example
 * ```ts
 * const provider = new CoinGeckoPriceProvider({ apiKey: 'CG-xxx' });
 * const prices = await provider.getPrices(['bitcoin', 'ethereum']);
 * console.log(prices.get('bitcoin')?.priceUsd); // 97500
 * ```
 */
interface PriceProvider {
    /** Platform identifier (e.g., 'coingecko') */
    readonly platform: PricePlatform;
    /**
     * Get prices for multiple tokens by their platform-compatible names
     * @param tokenNames - Array of token names (e.g., ['bitcoin', 'ethereum'])
     * @returns Map of token name to price data
     */
    getPrices(tokenNames: string[]): Promise<Map<string, TokenPrice>>;
    /**
     * Get price for a single token
     * @param tokenName - Token name (e.g., 'bitcoin')
     * @returns Token price (zero-price entry for tokens not listed on the platform), or null on network error with no cache
     */
    getPrice(tokenName: string): Promise<TokenPrice | null>;
    /**
     * Clear cached prices
     */
    clearCache(): void;
}

/**
 * UXF Transfer — `DeliveryStrategy` resolver (T.2.C).
 *
 * Given a `(DeliveryStrategy, carBytes)` pair, this module computes the
 * concrete delivery decision the sender will use:
 *
 *  - `{ kind: 'inline', carBase64 }` — bundle ships inside the Nostr event.
 *  - `{ kind: 'cid',    cid, shouldPin }` — bundle is pinned to IPFS, the
 *    sender publishes only the CID by reference.
 *
 * The resolver is a **pure decision function**. It does NOT publish events,
 * does NOT speak to IPFS directly, and does NOT touch the outbox. The
 * sender orchestrator (T.2.D.1) wires the actual pin call through the
 * injected `publishToIpfs` callback so this module can be unit-tested
 * without an IPFS dependency.
 *
 * Spec references:
 *  - §3.3.1 Per-call sender overrides (`DeliveryStrategy`), inline-cap
 *           clamp behavior, and the deterministic INVALID/clamp choice
 *           (W12).
 *  - §3.3.2 Delivery-completion semantics — informs `shouldPin`'s meaning
 *           (always `true` for CID branches because the CID-by-reference
 *           form requires the bundle to be retrievable to satisfy the
 *           sender-side delivered-state precondition).
 *  - §12.2  NIP-11 dynamic relay-cap discovery (deferred — see TODO below).
 *
 * Boundary with downstream pieces:
 *  - The actual IPFS publish lives behind `publishToIpfs` (injected). On
 *    rejection, the resolver propagates the rejection — auto-fallback
 *    from CID to inline is **NOT** the resolver's job; it belongs to the
 *    sender orchestrator's retry/relay-policy layer (T.2.D.1).
 *  - The base64-encoded CAR string is produced via `carBytesToBase64`
 *    from `uxf/transfer-payload.ts` (T.1.D) so this module does not
 *    duplicate the encoding rules.
 *
 * @packageDocumentation
 */

/**
 * Outcome of a successful `publishToIpfs` callback.
 *
 * The minimum surface the resolver needs is the CID; richer return shapes
 * (gateway list, pin status, ...) belong to the orchestrator. We keep this
 * an object literal (rather than a bare `string`) so callers can extend
 * the contract without breaking the resolver's signature.
 */
interface PublishToIpfsResult {
    /** CIDv1 base32 string identifying the published CAR. */
    readonly cid: string;
}
/**
 * Caller-supplied IPFS publisher. Receives the raw CAR bytes; resolves with
 * the CID once the bytes are pinned and retrievable.
 *
 * **Failure semantics**: any rejection propagates verbatim to the caller of
 * {@link resolveDelivery}. The resolver does NOT auto-fallback to inline on
 * IPFS failure — that fallback policy belongs to the sender orchestrator
 * (T.2.D.1), which has the relay context to decide whether retry is
 * appropriate.
 *
 * **CID-correspondence contract (issue #200, Phase 1).** The returned
 * `cid` MUST equal `extractCarRootCid(carBytes)` (the dag-cbor CID of
 * the CAR's single root block). The wire `payload.bundleCid` on
 * `uxf-cid` envelopes uses `extractCarRootCid(carBytes)`, and the
 * recipient fetches that CID against the gateway. A publisher whose
 * returned CID differs from `extractCarRootCid(carBytes)` is buggy:
 *  - In the obvious failure mode the publisher pinned the bytes under
 *    a different CID (e.g. a raw CID via `pinToIpfs(carBytes)`), and
 *    the recipient's gateway fetch for `bundleCid` 404s indefinitely.
 *  - In the subtle failure mode the publisher pinned the right blocks
 *    but lied about the CID — the recipient succeeds anyway but the
 *    publisher's contract is broken.
 *
 * Use {@link createUxfCarPublisher} (from `./ipfs-publisher`) to obtain
 * the canonical, contract-compliant publisher. Rolling your own with
 * `pinToIpfs(carBytes)` is the documented footgun — do not do that.
 */
type PublishToIpfsCallback = (carBytes: Uint8Array) => Promise<PublishToIpfsResult>;

interface GroupChatModuleConfig {
    /** Override relay URLs (default: from network config) */
    relays?: string[];
    /** Default message fetch limit (default: 50) */
    defaultMessageLimit?: number;
    /** Max previous message IDs in ordering tags (default: 3) */
    maxPreviousTags?: number;
    /** Reconnect delay in ms (default: 3000) */
    reconnectDelayMs?: number;
    /** Max reconnect attempts (default: 5) */
    maxReconnectAttempts?: number;
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
interface ComposingIndicator {
    readonly senderPubkey: string;
    readonly senderNametag?: string;
    readonly expiresIn: number;
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
 | 'storage:pointer-published'
/**
 * Issue #264 — emitted by the flush scheduler when it auto-merges
 * a detected monotonicity gap in place (previously this fired
 * POINTER_MONOTONICITY_VIOLATION on `storage:error` and aborted
 * the flush). Distinct from `storage:error` so operators see
 * auto-merges as routine convergence work, not alarms.
 *
 * `data` payload (see flush-scheduler.ts for the canonical shape):
 *   - `recoveredTokenIds: string[]`   token ids re-merged from
 *     `previousData` to satisfy the token-set invariant.
 *   - `recoveredTokenCount: number`
 *   - `mergedUnknownBundleCids: string[]`   foreign bundle CIDs
 *     inline-fetched and merged into the in-flight UXF package.
 *   - `mergedUnknownBundleCount: number`
 *   - `residualUnknownBundleCids: string[]`   foreign bundle CIDs
 *     that could not be fetched (network down, malformed CAR,
 *     etc.) — the flush continued without them; downstream
 *     convergence retries on the next flush.
 *   - `residualUnknownBundleCount: number`
 *   - `residualTokenMissingIds: string[]`   token ids the token-set
 *     check flagged but `previousData` could not provide (only
 *     possible when `previousData === null`).
 *   - `residualTokenMissingCount: number`
 *   - `recoveredOutboxIdsDroppedAsSent: string[]`   outbox-entry
 *     ids that the SENT-wins dedup removed during the
 *     `OperationalState` union — surfaced for operator audit.
 *   - `recoveredOutboxIdsDroppedAsSentCount: number`
 *   - `truncated: boolean`   true when any of the listed arrays
 *     were capped at 100 entries for log-volume control.
 *
 * Informational only. The flush continues to publish the
 * best-effort superset CAR regardless; residuals are addressed by
 * subsequent cross-device syncs detecting the same gap and
 * re-attempting the inline merge.
 */
 | 'storage:monotonicity-recovered'
/**
 * Issue #272 — emitted when the per-flush remote-durability
 * HEAD-verify leg (`verifyFlushDurability`), now run as a background
 * task detached from the synchronous flush completion path, fails
 * for a just-pinned bundle CID and/or snapshot CID.
 *
 * Local-durability is unaffected: the bundle CAR pin POST returned
 * 200, the OrbitDB bundle ref is written, and (when wired) the
 * snapshot publish call returned ok. What this event signals is that
 * the operator's IPFS gateway has not yet served the just-pinned
 * CID back via HEAD within the configured deadline (default 30s).
 * This is a gateway propagation property — not a receiver crash-
 * safety property — and does NOT close the at-least-once Nostr ack
 * gate. Distinct from `storage:error` (terminal fatal class).
 *
 * `data` carries `{ cid, snapshotCid?, code?, details? }`:
 *   - `cid`         the bundle CID whose HEAD-verify failed
 *   - `snapshotCid` the snapshot CID (when also verified)
 *   - `code`        the structured error code (e.g.,
 *                   `FLUSH_DURABILITY_TIMEOUT`)
 *   - `details`     the failed-leg detail array from
 *                   `verifyFlushDurability`
 *
 * Operator action: investigate operator Kubo gateway propagation
 * lag if this fires repeatedly for distinct CIDs. Single-shot fires
 * (a CID that eventually does propagate) are expected under normal
 * testnet contention and require no action.
 *
 * Before #272: this same failure threw inline and forced the
 * at-least-once gate's `awaitNextFlush` to reject, causing the
 * Nostr `since` cursor to refuse to advance and the inbound
 * TOKEN_TRANSFER event to replay on every reconnect. Each replay
 * triggered another flush, each flush re-hit the same HEAD-verify
 * timeout, producing a sustained busy-spin (134 replays for 14
 * unique event IDs in the §C.2 soak failure observed at
 * `integration/all-fixes` HEAD `6102d59`).
 */
 | 'storage:durability-deferred'
/**
 * PR #302 (issue #???): emitted by the pointer-layer lifecycle when
 * Phase 3 walkback skipped past one or more `CAR_TRANSIENT` versions
 * (slot EXISTS on-chain — proof verified + CID decoded — but no IPFS
 * gateway could serve the CAR bytes).
 *
 * Fired on both the recover path (cold-start / periodic poll
 * `recoverLatest()`) and the publish path (conflict-driven rediscovery
 * in `reconcileAndPublish()`). Also fired when ALL known anchor versions
 * are CAR_TRANSIENT and no VALID predecessor was found (the
 * `RecoverAllUnfetchableResult` case).
 *
 * `data` carries:
 *   - `skippedVersions: number[]`   versions walked past
 *   - `recoveredVersion?: number`   the VALID predecessor found
 *                                   (absent when all anchors unfetchable)
 *   - `path: 'recover' | 'publish'` the code path that fired the event
 *
 * Not a fatal alarm (`storage:error`). Operators should investigate
 * IPFS gateway health for the wallet's IPNS CIDs and consider
 * re-pinning the missing CARs from a backup or invoking
 * `acceptCarLoss(version)` to permanently acknowledge the data loss.
 */
 | 'storage:pointer-version-skipped-unfetchable';
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
 * File Storage Provider for Node.js
 * Stores wallet data in JSON files
 */

interface FileStorageProviderConfig {
    /** Directory to store wallet data */
    dataDir: string;
    /** File name for key-value data (default: 'wallet.json') */
    fileName?: string;
}
declare class FileStorageProvider implements StorageProvider {
    readonly id = "file-storage";
    readonly name = "File Storage";
    readonly type: "local";
    /**
     * Durability marker consumed by the aggregator-pointer FlagStore
     * (SPEC §7.1.3). Writes go through `fs.fsyncSync()` on a temp file
     * followed by an atomic rename, which is a POSIX-durable write. Any
     * re-ordering by the OS page cache is flushed by fsync before the
     * rename commits the new inode — readers observe either the prior
     * or new state, never a torn write.
     */
    readonly [DURABLE_STORAGE]: true;
    private dataDir;
    private filePath;
    private isTxtMode;
    private data;
    private status;
    private _identity;
    constructor(config: FileStorageProviderConfig | string);
    setIdentity(identity: FullIdentity): void;
    getIdentity(): FullIdentity | null;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getStatus(): ProviderStatus;
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    /**
     * Wave G.6: atomic multi-key write — staged into in-memory state,
     * then flushed once via the existing save() path which holds the
     * cross-process file lock for the entire snapshot rewrite. This
     * gives true all-or-nothing semantics across keys: either the file
     * rewrite succeeds and ALL entries are visible on next read, or
     * the rewrite fails and the on-disk file is unchanged (atomic
     * temp+rename).
     *
     * On in-memory error (rare; allocator), restores the previous
     * values for any keys we'd already mutated and re-throws.
     */
    /**
     * Wave J: per-instance setMany serialization. Without this, two
     * concurrent setMany calls on the same instance could interleave
     * snapshot/mutate/save in a way that A's rollback leaves B's
     * pending mutations exposed (or vice versa). Serializing the
     * entire snapshot+mutate+save+rollback critical section gives a
     * single-mutator invariant within the process.
     */
    private setManyChain;
    setMany(entries: ReadonlyArray<readonly [string, string]>): Promise<void>;
    private setManyInner;
    remove(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    keys(prefix?: string): Promise<string[]>;
    clear(prefix?: string): Promise<void>;
    saveTrackedAddresses(entries: TrackedAddressEntry[]): Promise<void>;
    loadTrackedAddresses(): Promise<TrackedAddressEntry[]>;
    /**
     * Get full storage key with address prefix for per-address keys
     */
    private getFullKey;
    /**
     * Steelman⁴³ critical: track which keys this process has mutated
     * since connect(), so save() can merge them ON TOP of the current
     * on-disk snapshot. Without this, two processes each holding their
     * own private snapshot would mutually overwrite the other's writes
     * (last-save-wins, intermediate keys lost).
     */
    private mutatedKeys;
    private removedKeys;
    private saveInFlight;
    private save;
    private saveInner;
}
declare function createFileStorageProvider(config: FileStorageProviderConfig | string): FileStorageProvider;

interface FileTokenStorageConfig {
    /** Directory to store token files */
    tokensDir: string;
}
declare class FileTokenStorageProvider implements TokenStorageProvider<TxfStorageDataBase> {
    readonly id = "file-token-storage";
    readonly name = "File Token Storage";
    readonly type: "local";
    private baseTokensDir;
    private status;
    private identity;
    constructor(config: FileTokenStorageConfig | string);
    setIdentity(identity: FullIdentity): void;
    /**
     * Get tokens directory for current address
     * Format: {baseTokensDir}/{addressId}/
     */
    private get tokensDir();
    initialize(): Promise<boolean>;
    shutdown(_options?: ShutdownOptions): Promise<void>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getStatus(): ProviderStatus;
    load(): Promise<LoadResult<TxfStorageDataBase>>;
    save(data: TxfStorageDataBase): Promise<SaveResult>;
    sync(localData: TxfStorageDataBase): Promise<SyncResult<TxfStorageDataBase>>;
    clear(): Promise<boolean>;
    private get historyPath();
    private readHistoryFile;
    private writeHistoryFile;
    addHistoryEntry(entry: HistoryRecord): Promise<void>;
    getHistoryEntries(): Promise<HistoryRecord[]>;
    hasHistoryEntry(dedupKey: string): Promise<boolean>;
    clearHistory(): Promise<void>;
    importHistoryEntries(entries: HistoryRecord[]): Promise<number>;
    /**
     * Create an independent instance for a different address.
     */
    createForAddress(): FileTokenStorageProvider;
}
declare function createFileTokenStorageProvider(config: FileTokenStorageConfig | string): FileTokenStorageProvider;

/**
 * Node.js Transport Exports
 * Re-exports shared transport with Node.js WebSocket
 */

/**
 * Create WebSocket factory for Node.js using 'ws' package
 */
declare function createNodeWebSocketFactory(): WebSocketFactory;
/**
 * Create NostrTransportProvider with Node.js WebSocket
 */
declare function createNostrTransportProvider(config: Omit<NostrTransportProviderConfig, 'createWebSocket'>): NostrTransportProvider;

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
 * Shared TrustBase Loader Logic
 * Common embedded trustbase data and base loader
 */

interface TrustBaseLoader {
    load(): Promise<unknown | null>;
}
/**
 * Base TrustBase loader with embedded fallback
 */
declare abstract class BaseTrustBaseLoader implements TrustBaseLoader {
    protected network: NetworkType;
    constructor(network?: NetworkType);
    /**
     * Try to load from external source (file, URL, etc.)
     * Override in subclass
     */
    protected abstract loadFromExternal(): Promise<unknown | null>;
    load(): Promise<unknown | null>;
}

/**
 * Node.js Oracle Exports
 * Re-exports shared oracle with Node.js-specific TrustBaseLoader
 */

/**
 * Node.js TrustBase loader - loads from file or uses embedded data
 */
declare class NodeTrustBaseLoader extends BaseTrustBaseLoader {
    private filePath?;
    constructor(filePathOrNetwork?: string | NetworkType);
    protected loadFromExternal(): Promise<unknown | null>;
}
/**
 * Create Node.js TrustBase loader
 */
declare function createNodeTrustBaseLoader(filePathOrNetwork?: string | NetworkType): TrustBaseLoader$1;
/**
 * Create UnicityAggregatorProvider with Node.js TrustBase loader
 */
declare function createUnicityAggregatorProvider(config: Omit<UnicityAggregatorProviderConfig, 'trustBaseLoader'> & {
    trustBasePath?: string;
    network?: NetworkType;
}): UnicityAggregatorProvider;
/** @deprecated Use createUnicityAggregatorProvider instead */
declare const createUnicityOracleProvider: typeof createUnicityAggregatorProvider;

/**
 * Shared Configuration Interfaces
 * Base types extended by platform-specific implementations
 */

/**
 * Base transport (Nostr) configuration
 * Supports extend/override pattern for relays
 */
interface BaseTransportConfig {
    /** Replace default relays entirely */
    relays?: string[];
    /** Add relays to network defaults (use with network preset) */
    additionalRelays?: string[];
    /** Connection timeout (ms) */
    timeout?: number;
    /** Auto-reconnect on disconnect */
    autoReconnect?: boolean;
    /** Enable debug logging */
    debug?: boolean;
}
/**
 * Base oracle (Aggregator) configuration
 */
interface BaseOracleConfig {
    /** Replace default aggregator URL (if not set, uses network default) */
    url?: string;
    /** API key for authentication */
    apiKey?: string;
    /** Request timeout (ms) */
    timeout?: number;
    /** Skip trust base verification (dev only) */
    skipVerification?: boolean;
    /** Enable debug logging */
    debug?: boolean;
}
/**
 * Node.js-specific oracle extensions
 */
interface NodeOracleExtensions {
    /** Path to trust base JSON file */
    trustBasePath?: string;
}
/**
 * L1 (ALPHA blockchain) configuration
 * Same for all platforms
 */
interface L1Config {
    /** Fulcrum WebSocket URL (if not set, uses network default) */
    electrumUrl?: string;
    /** Default fee rate in sat/byte */
    defaultFeeRate?: number;
    /** Enable vesting classification */
    enableVesting?: boolean;
}
/**
 * Base price provider configuration
 */
interface BasePriceConfig {
    /** Which price platform to use (default: 'coingecko') */
    platform?: PricePlatform;
    /** API key for the price platform (optional for free tiers) */
    apiKey?: string;
    /** Custom base URL (e.g., for CORS proxy in browser environments) */
    baseUrl?: string;
    /** Cache TTL in milliseconds (default: 60000) */
    cacheTtlMs?: number;
    /** Request timeout in milliseconds (default: 10000) */
    timeout?: number;
    /** Enable debug logging */
    debug?: boolean;
}
/**
 * Base market module configuration
 */
interface BaseMarketConfig {
    /** Market API base URL (default: https://market-api.unicity.network) */
    apiUrl?: string;
    /** Request timeout in ms (default: 30000) */
    timeout?: number;
}
/**
 * Base providers result
 * Common structure for all platforms
 */
interface BaseProviders {
    storage: StorageProvider;
    tokenStorage: TokenStorageProvider<TxfStorageDataBase>;
    transport: TransportProvider;
    oracle: OracleProvider;
    /** L1 configuration (for passing to Sphere.init). Pass null to disable L1 entirely. */
    l1?: L1Config | null;
    /** Price provider (optional — enables fiat value display) */
    price?: PriceProvider;
}

interface MarketModuleConfig {
    /** Market API base URL (default: https://market-api.unicity.network) */
    apiUrl?: string;
    /** Request timeout in ms (default: 30000) */
    timeout?: number;
}

/**
 * IPFS storage provider configuration.
 *
 * @deprecated The {@link IpfsStorageProvider} class this configures is
 * deprecated in favor of the Profile token-storage path (OrbitDB +
 * aggregator pointer + IPFS CAR pin/fetch). See `profile/factory.ts`
 * and `IpfsStorageProvider`'s JSDoc for the migration rationale.
 */
interface IpfsStorageConfig {
    /** Gateway URLs for HTTP API (defaults to Unicity dedicated nodes) */
    gateways?: string[];
    /** Content fetch timeout in ms (default: 15000) */
    fetchTimeoutMs?: number;
    /** IPNS resolution timeout in ms (default: 10000) */
    resolveTimeoutMs?: number;
    /** IPNS publish timeout in ms (default: 30000) */
    publishTimeoutMs?: number;
    /** Gateway connectivity test timeout in ms (default: 5000) */
    connectivityTimeoutMs?: number;
    /** IPNS record lifetime in ms (default: 99 years) */
    ipnsLifetimeMs?: number;
    /** IPNS cache TTL in ms (default: 60000) */
    ipnsCacheTtlMs?: number;
    /** Circuit breaker failure threshold (default: 3) */
    circuitBreakerThreshold?: number;
    /** Circuit breaker cooldown in ms (default: 60000) */
    circuitBreakerCooldownMs?: number;
    /** Known-fresh window in ms (default: 30000) */
    knownFreshWindowMs?: number;
    /** Enable debug logging (default: false) */
    debug?: boolean;
    /** WebSocket factory for IPNS push subscriptions (cross-platform) */
    createWebSocket?: WebSocketFactory;
    /** Override WebSocket URL (auto-derived from gateways if omitted) */
    wsUrl?: string;
    /** Fallback polling interval in ms when WS unavailable (default: 90000) */
    fallbackPollIntervalMs?: number;
    /** Debounce for push-triggered sync in ms (default: 500) */
    syncDebounceMs?: number;
    /** Debounce interval for background flush in ms (default: 2000) */
    flushDebounceMs?: number;
}

/**
 * Node.js Implementation
 * Providers for CLI/Node.js usage
 */

/**
 * Node.js transport configuration
 * Same as base (no Node.js-specific extensions)
 */
type NodeTransportConfig = BaseTransportConfig;
/**
 * Node.js oracle configuration
 * Extends base with trustBasePath for file-based trust base
 */
type NodeOracleConfig = BaseOracleConfig & NodeOracleExtensions;
/**
 * Node.js L1 configuration
 * Same as base
 */
type NodeL1Config = L1Config;
/**
 * Node.js IPFS sync configuration.
 *
 * @deprecated The IPNS-based mutable-pointer flow this config opts into
 * is superseded by the Profile token-storage path (OrbitDB + aggregator
 * pointer + IPFS CAR). See `createNodeProfileProviders` and the
 * `IpfsStorageProvider` JSDoc. This config remains functional for
 * backward compatibility.
 */
interface NodeIpfsSyncConfig {
    /** Enable IPFS sync (default: false). @deprecated — see {@link NodeIpfsSyncConfig}. */
    enabled?: boolean;
    /** IPFS storage provider configuration */
    config?: IpfsStorageConfig;
}
/** Node.js token sync configuration */
interface NodeTokenSyncConfig {
    /** IPFS sync backend */
    ipfs?: NodeIpfsSyncConfig;
}
interface NodeProvidersConfig {
    /** Network preset: mainnet, testnet, or dev */
    network?: NetworkType;
    /** Enable debug logging globally for all providers (default: false). Per-provider debug flags override this. */
    debug?: boolean;
    /** Directory for wallet data storage */
    dataDir?: string;
    /** Wallet file name (default: 'wallet.json') */
    walletFileName?: string;
    /** Directory for token files */
    tokensDir?: string;
    /** Transport (Nostr) configuration */
    transport?: NodeTransportConfig;
    /** Oracle (Aggregator) configuration */
    oracle?: NodeOracleConfig;
    /** L1 (ALPHA blockchain) configuration */
    l1?: NodeL1Config;
    /** Price provider configuration (optional — enables fiat value display) */
    price?: BasePriceConfig;
    /** Token sync backends configuration */
    tokenSync?: NodeTokenSyncConfig;
    /** Group chat (NIP-29) configuration. true = enable with defaults, object = custom config */
    groupChat?: {
        enabled?: boolean;
        relays?: string[];
    } | boolean;
    /** Market module configuration. true = enable with defaults, object = custom config */
    market?: BaseMarketConfig | boolean;
}
interface NodeProviders {
    storage: StorageProvider;
    tokenStorage: TokenStorageProvider<TxfStorageDataBase>;
    transport: TransportProvider;
    oracle: OracleProvider;
    /** L1 configuration (for passing to Sphere.init) */
    l1?: L1Config;
    /** Price provider (optional — enables fiat value display) */
    price?: PriceProvider;
    /** IPFS token storage provider (when tokenSync.ipfs.enabled is true) */
    ipfsTokenStorage?: TokenStorageProvider<TxfStorageDataBase>;
    /**
     * UXF bundle-CAR publisher for the `uxf-cid` Nostr delivery branch
     * (Issue #200 Phase 1 wiring). Built from the same IPFS gateway list
     * used by `ipfsTokenStorage` when `tokenSync.ipfs.enabled` is true.
     * Forward to `Sphere.init({...providers})` to enable production
     * CID-by-reference token delivery.
     */
    publishToIpfs?: PublishToIpfsCallback;
    /**
     * Issue #223 — recipient-side gateway list used to stream-fetch CARs
     * for incoming `kind: 'uxf-cid'` bundles. Same gateways `publishToIpfs`
     * uses, in the same order, so the sender's pin and the recipient's
     * fetch target the same network. Forward to
     * `Sphere.init({...providers})` so the auto-installed
     * {@link IngestWorkerPool} can ingest `uxf-cid` events; without it,
     * those events are silently dropped on receive.
     */
    cidFetchGateways?: ReadonlyArray<string>;
    /** Group chat config (resolved, for passing to Sphere.init) */
    groupChat?: GroupChatModuleConfig | boolean;
    /** Market module config (resolved, for passing to Sphere.init) */
    market?: MarketModuleConfig | boolean;
}
/**
 * Create all Node.js providers with default configuration
 *
 * @example
 * ```ts
 * // Simple - testnet with defaults
 * const providers = createNodeProviders({
 *   network: 'testnet',
 *   tokensDir: './tokens',
 * });
 *
 * // Full configuration
 * const providers = createNodeProviders({
 *   network: 'testnet',
 *   dataDir: './wallet-data',
 *   tokensDir: './tokens',
 *   transport: {
 *     additionalRelays: ['wss://my-relay.com'],
 *     debug: true,
 *   },
 *   oracle: {
 *     apiKey: 'my-api-key',
 *     trustBasePath: './trustbase.json',
 *   },
 *   l1: {
 *     enableVesting: true,
 *   },
 * });
 *
 * // Use with Sphere.init
 * const { sphere } = await Sphere.init({
 *   ...providers,
 *   autoGenerate: true,
 * });
 * ```
 */
declare function createNodeProviders(config?: NodeProvidersConfig): NodeProviders;

export { type BaseOracleConfig, type BaseProviders, type BaseTransportConfig, FileStorageProvider, type FileStorageProviderConfig, type FileTokenStorageConfig, FileTokenStorageProvider, type IWebSocket, type L1Config, type NodeIpfsSyncConfig, type NodeL1Config, type NodeOracleConfig, type NodeProviders, type NodeProvidersConfig, type NodeTokenSyncConfig, type NodeTransportConfig, NodeTrustBaseLoader, NostrTransportProvider, type NostrTransportProviderConfig, type TrustBaseLoader$1 as TrustBaseLoader, UnicityAggregatorProvider, type UnicityAggregatorProviderConfig, UnicityOracleProvider, type UnicityOracleProviderConfig, type WebSocketFactory, createFileStorageProvider, createFileTokenStorageProvider, createNodeProviders, createNodeTrustBaseLoader, createNodeWebSocketFactory, createNostrTransportProvider, createUnicityAggregatorProvider, createUnicityOracleProvider };
