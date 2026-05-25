import { CID } from 'multiformats';

/**
 * 32-byte SHA-256 content hash, hex-encoded (64 lowercase characters).
 * This is the universal address for any element in the pool.
 */
type ContentHash = string & {
    readonly __brand: 'ContentHash';
};
/**
 * Create a branded ContentHash from a raw hex string.
 * Validates length (64 chars), lowercase hex, and character set.
 */
declare function contentHash(hex: string): ContentHash;
/**
 * Well-known instance kinds. Extensible via string for future kinds.
 */
type UxfInstanceKind = 'default' | 'individual-proof' | 'consolidated-proof' | 'zk-proof' | 'full-history' | (string & {});
/**
 * Describes the version, lineage, and kind of every DAG element.
 * Serialized as the first field in every element's CBOR encoding.
 */
interface UxfElementHeader {
    /** Encoding format version (increments when serialization layout changes) */
    readonly representation: number;
    /** Protocol semantic version (fixed at element creation, governs validation rules) */
    readonly semantics: number;
    /** Instance kind identifier for selection during reassembly */
    readonly kind: UxfInstanceKind;
    /** Content hash of the previous instance in the chain, or null for the original */
    readonly predecessor: ContentHash | null;
}
/**
 * Discriminated union tag for element content types.
 * Each maps 1:1 to a structural node type in the token hierarchy.
 */
type UxfElementType = 'token-root' | 'genesis' | 'genesis-data' | 'transaction' | 'transaction-data' | 'inclusion-proof' | 'authenticator' | 'unicity-certificate' | 'predicate' | 'token-state' | 'token-coin-data' | 'smt-path' | 'pending-authenticator';
/**
 * Maps UxfElementType string tags to unsigned integer type IDs.
 * Values are taken from SPECIFICATION Section 2.1.
 *
 * 0x0b is intentionally absent — it was reserved in earlier drafts and is
 * not currently allocated. 0x0e is the new (#202) pending-authenticator
 * type, allocated to the next free slot after smt-path (0x0d).
 */
declare const ELEMENT_TYPE_IDS: Readonly<Record<UxfElementType, number>>;
/**
 * Content is the inline, non-reference data of an element.
 * Kept as a plain record for flexibility; each element type defines
 * its own content shape (see typed element interfaces below).
 */
type UxfElementContent = Readonly<Record<string, unknown>>;
/**
 * A single node in the content-addressed DAG.
 * Every element is independently hashable, storable, and addressable.
 */
interface UxfElement {
    /** Element header (version, kind, predecessor) */
    readonly header: UxfElementHeader;
    /** Discriminated type tag */
    readonly type: UxfElementType;
    /** Type-specific content (inline scalar data -- never child elements) */
    readonly content: UxfElementContent;
    /**
     * Ordered child references by role name.
     * Each value is a single ContentHash, an array of ContentHash, or null
     * (for nullable child references such as uncommitted transaction proofs).
     */
    readonly children: Readonly<Record<string, ContentHash | ContentHash[] | null>>;
}
interface TokenRootContent {
    readonly tokenId: string;
    readonly version: string;
}
interface TokenRootChildren {
    readonly genesis: ContentHash;
    readonly transactions: ContentHash[];
    readonly state: ContentHash;
    readonly nametags: ContentHash[];
}
/** All data lives in children; no inline content. */
type GenesisContent = Record<string, never>;
interface GenesisChildren {
    readonly data: ContentHash;
    readonly inclusionProof: ContentHash | null;
    readonly destinationState: ContentHash;
}
interface GenesisDataContent {
    readonly tokenId: string;
    readonly tokenType: string;
    readonly coinData: ReadonlyArray<readonly [string, string]>;
    readonly tokenData: string;
    readonly salt: string;
    readonly recipient: string;
    readonly recipientDataHash: string | null;
    /**
     * Reason for minting. Stored as opaque bytes to handle three cases:
     * - Regular mints: null
     * - Simple text reasons: UTF-8 encoded string bytes
     * - Split tokens: dag-cbor encoded ISplitMintReasonJson
     */
    readonly reason: Uint8Array | null;
}
/** All data lives in children; no inline content. */
type TransactionContent = Record<string, never>;
interface TransactionChildren {
    readonly sourceState: ContentHash;
    readonly data: ContentHash | null;
    readonly inclusionProof: ContentHash | null;
    readonly destinationState: ContentHash;
    readonly pendingAuthenticator?: ContentHash | null;
}
interface TransactionDataContent {
    readonly recipient: string;
    readonly salt: string;
    readonly recipientDataHash: string | null;
    readonly message: string | null;
    readonly nametagRefs: ContentHash[];
}
interface InclusionProofContent {
    readonly transactionHash: string;
}
interface InclusionProofChildren {
    readonly authenticator: ContentHash;
    readonly merkleTreePath: ContentHash;
    readonly unicityCertificate: ContentHash;
}
interface AuthenticatorContent {
    readonly algorithm: string;
    readonly publicKey: string;
    readonly signature: string;
    readonly stateHash: string;
}
interface SmtPathContent {
    readonly root: string;
    readonly segments: ReadonlyArray<{
        readonly data: string;
        readonly path: string;
    }>;
}
interface UnicityCertificateContent {
    /** Raw hex-encoded CBOR blob, stored opaquely */
    readonly raw: string;
}
interface PredicateContent {
    /** Hex-encoded CBOR predicate */
    readonly raw: string;
}
interface StateContent {
    readonly data: string | null;
    readonly predicate: string;
}
interface TokenCoinDataContent {
    readonly entries: ReadonlyArray<readonly [string, string]>;
}
/**
 * Maps tokenId -> root element hash.
 * The manifest is the entry point for reassembly.
 */
interface UxfManifest {
    /** tokenId (64- or 68-char hex; see TokenRootContent.tokenId) -> ContentHash of the token-root element */
    readonly tokens: ReadonlyMap<string, ContentHash>;
}
/**
 * Per-element instance chain metadata.
 */
interface InstanceChainEntry {
    /** Content hash of the newest (head) instance */
    readonly head: ContentHash;
    /** Ordered list from head -> original, with kind annotations */
    readonly chain: ReadonlyArray<{
        readonly hash: ContentHash;
        readonly kind: UxfInstanceKind;
    }>;
}
/**
 * The instance chain index.
 * Key: content hash of ANY element in any chain.
 * Value: the chain entry for that element's chain.
 */
type InstanceChainIndex = ReadonlyMap<ContentHash, InstanceChainEntry>;
/**
 * Strategy for selecting which instance to use during reassembly.
 */
type InstanceSelectionStrategy = {
    readonly type: 'latest';
} | {
    readonly type: 'original';
} | {
    readonly type: 'by-representation';
    readonly version: number;
} | {
    readonly type: 'by-kind';
    readonly kind: UxfInstanceKind;
    readonly fallback?: InstanceSelectionStrategy;
} | {
    readonly type: 'custom';
    readonly predicate: (element: UxfElement) => boolean;
    readonly fallback?: InstanceSelectionStrategy;
};
/** Default strategy: use the head (most recent) instance */
declare const STRATEGY_LATEST: InstanceSelectionStrategy;
declare const STRATEGY_ORIGINAL: InstanceSelectionStrategy;
/**
 * Package envelope metadata.
 */
interface UxfEnvelope {
    /** UXF format version (e.g., '1.0.0') */
    readonly version: string;
    /** Creation timestamp (Unix seconds since epoch) */
    readonly createdAt: number;
    /** Last modification timestamp (Unix seconds since epoch) */
    readonly updatedAt: number;
    /** Optional human-readable description */
    readonly description?: string;
    /** Optional creator identity (chainPubkey) */
    readonly creator?: string;
}
/**
 * Secondary indexes for O(1) lookups.
 */
interface UxfIndexes {
    /** tokenType (hex) -> Set<tokenId> */
    readonly byTokenType: ReadonlyMap<string, ReadonlySet<string>>;
    /** coinId -> Set<tokenId> */
    readonly byCoinId: ReadonlyMap<string, ReadonlySet<string>>;
    /** stateHash -> tokenId (current state only) */
    readonly byStateHash: ReadonlyMap<string, string>;
}
/**
 * The complete UXF bundle.
 * This is the top-level data structure for all operations.
 *
 * Note: `pool` is typed as a Map for the type definition layer.
 * The ElementPool class (WU-04) wraps this with mutation methods.
 */
interface UxfPackageData {
    readonly envelope: UxfEnvelope;
    readonly manifest: UxfManifest;
    readonly pool: ReadonlyMap<ContentHash, UxfElement>;
    readonly instanceChains: InstanceChainIndex;
    readonly indexes: UxfIndexes;
}
/**
 * Abstract storage adapter for persisting UXF packages.
 * Platform implementations live in impl/browser/ and impl/nodejs/.
 */
interface UxfStorageAdapter {
    /** Save the full package state. */
    save(pkg: UxfPackageData): Promise<void>;
    /** Load a previously saved package, or null if none exists. */
    load(): Promise<UxfPackageData | null>;
    /** Delete the stored package. */
    clear(): Promise<void>;
}
/**
 * A single issue found during package verification.
 */
interface UxfVerificationIssue {
    readonly code: string;
    readonly message: string;
    readonly tokenId?: string;
    readonly elementHash?: ContentHash;
}
/**
 * Result of verifying structural integrity of a UXF package.
 */
interface UxfVerificationResult {
    readonly valid: boolean;
    readonly errors: ReadonlyArray<UxfVerificationIssue>;
    readonly warnings: ReadonlyArray<UxfVerificationIssue>;
    readonly stats: {
        readonly tokensChecked: number;
        readonly elementsChecked: number;
        readonly orphanedElements: number;
        readonly instanceChainsChecked: number;
    };
}
/**
 * Diff result type representing the minimal delta between two packages.
 */
interface UxfDelta {
    /** Elements present in target but not in source */
    readonly addedElements: ReadonlyMap<ContentHash, UxfElement>;
    /** Element hashes present in source but not in target */
    readonly removedElements: ReadonlySet<ContentHash>;
    /** Manifest entries added or changed */
    readonly addedTokens: ReadonlyMap<string, ContentHash>;
    /** Token IDs removed from manifest */
    readonly removedTokens: ReadonlySet<string>;
    /** Instance chain entries added */
    readonly addedChainEntries: ReadonlyMap<ContentHash, InstanceChainEntry>;
}

/**
 * UXF error codes covering all failure modes in the UXF module.
 */
type UxfErrorCode = 'INVALID_HASH' | 'MISSING_ELEMENT' | 'TOKEN_NOT_FOUND' | 'STATE_INDEX_OUT_OF_RANGE' | 'TYPE_MISMATCH' | 'INVALID_INSTANCE_CHAIN' | 'DUPLICATE_TOKEN' | 'SERIALIZATION_ERROR' | 'VERIFICATION_FAILED' | 'CYCLE_DETECTED' | 'INVALID_PACKAGE' | 'INVALID_INPUT' | 'LIMIT_EXCEEDED' | 'NOT_IMPLEMENTED';
/**
 * Structured error for all UXF operations.
 * Formats as `[UXF:<CODE>] <message>` for easy log filtering.
 */
declare class UxfError extends Error {
    readonly code: UxfErrorCode;
    readonly cause?: unknown;
    constructor(code: UxfErrorCode, message: string, cause?: unknown);
}

/**
 * UXF Content Hash Computation (WU-03)
 *
 * Implements deterministic content hashing for UXF elements per
 * SPECIFICATION Section 4 and DOMAIN-CONSTRAINTS Section 2.
 *
 * Hash = SHA-256( dag-cbor( { header, type, content, children } ) )
 *
 * All hex-encoded byte fields are converted to Uint8Array before CBOR
 * encoding so that dag-cbor serializes them as CBOR bstr, not tstr.
 */

/**
 * Convert a lowercase hex string to a Uint8Array.
 * Each pair of hex characters becomes one byte.
 */
declare function hexToBytes(hex: string): Uint8Array;
/**
 * Prepare element content for deterministic CBOR hashing.
 *
 * Converts hex-encoded byte fields to Uint8Array so that dag-cbor
 * encodes them as CBOR bstr instead of tstr. Fields that are semantically
 * strings (version, recipient, algorithm, coinData entries, message, kind)
 * are left as-is.
 *
 * Special handling:
 * - SmtPath `segments[].data`: hex -> bytes (or null -> null)
 * - SmtPath `segments[].path`: decimal bigint string -> 32-byte big-endian
 *   Uint8Array (CBOR bstr). @ipld/dag-cbor does NOT support CBOR tag 2
 *   bignum; encode as fixed-width bstr per SPEC CDDL `segments [* [bstr, bstr]]`.
 * - `reason` in GenesisDataContent: already Uint8Array | null, pass through
 * - null values: pass through for CBOR null encoding
 */
declare function prepareContentForHashing(type: UxfElementType, content: Record<string, unknown>): Record<string, unknown>;
/**
 * Convert all ContentHash hex strings in children to Uint8Array so that
 * dag-cbor encodes them as CBOR bstr (raw 32-byte hash values).
 *
 * Handles:
 * - Single ContentHash -> Uint8Array
 * - Array of ContentHash -> Array of Uint8Array
 * - null -> null (CBOR null)
 */
declare function prepareChildrenForHashing(children: Record<string, ContentHash | ContentHash[] | null>): Record<string, Uint8Array | Uint8Array[] | null>;
/**
 * Compute the content hash of a UXF element.
 *
 * Builds the canonical 4-key CBOR map:
 * ```
 * {
 *   header: [representation, semantics, kind, predecessor],
 *   type:   <integer type ID>,
 *   content: <prepared content>,
 *   children: <prepared children>
 * }
 * ```
 *
 * The map is encoded with dag-cbor (deterministic CBOR per RFC 8949
 * Section 4.2.1) and hashed with SHA-256.
 *
 * @param element - The UXF element to hash
 * @returns A branded ContentHash (64-char lowercase hex)
 */
declare function computeElementHash(element: UxfElement): ContentHash;

/**
 * Content-addressed element pool and garbage collection.
 *
 * The ElementPool is the canonical in-memory store for all UxfElements.
 * Elements are keyed by their SHA-256 content hash, ensuring automatic
 * deduplication: identical logical elements share a single entry.
 *
 * @module uxf/element-pool
 */

/**
 * Content-addressed element store.
 * All elements across all tokens share a single pool.
 */
declare class ElementPool {
    /** hash -> element. The canonical store. */
    private readonly elements;
    /** Number of elements in the pool. */
    get size(): number;
    /** Check if an element with the given hash exists. */
    has(hash: ContentHash): boolean;
    /** Get element by hash, or undefined if not present. */
    get(hash: ContentHash): UxfElement | undefined;
    /**
     * Insert an element into the pool.
     * Computes the content hash via {@link computeElementHash} and deduplicates:
     * if an element with the same hash already exists, this is a no-op.
     *
     * @returns The content hash of the element.
     */
    put(element: UxfElement): ContentHash;
    /**
     * Remove an element by hash.
     *
     * @returns true if the element was present and removed, false otherwise.
     */
    delete(hash: ContentHash): boolean;
    /** Iterate all [hash, element] pairs. */
    entries(): IterableIterator<[ContentHash, UxfElement]>;
    /** Iterate all content hashes in the pool. */
    hashes(): IterableIterator<ContentHash>;
    /** Iterate all elements in the pool. */
    values(): IterableIterator<UxfElement>;
    /**
     * Export the pool's contents as a ReadonlyMap.
     * Returns the internal Map directly (no copy) for efficient read access.
     */
    toMap(): ReadonlyMap<ContentHash, UxfElement>;
    /**
     * Create an ElementPool pre-populated from a Map.
     *
     * Steelman²⁸ warning: previously copied by reference (no re-hashing),
     * silently trusting caller-supplied keys. A caller passing a corrupt
     * map (key=0xdead but element hashes to 0xbeef) would propagate that
     * trust violation into every downstream operation. To preserve
     * backward compat for the hot path, fromMap still does NOT re-hash
     * by default — but callers crossing trust boundaries should call
     * fromMapVerified() instead, which re-hashes every entry.
     */
    static fromMap(map: ReadonlyMap<ContentHash, UxfElement>): ElementPool;
    /**
     * Steelman²⁸ warning: hash-verifying variant of fromMap. Use this when
     * accepting an external pool (post-deserialize, peer-replicated,
     * test fixture, etc.). Throws VERIFICATION_FAILED on any key/element
     * mismatch.
     */
    static fromMapVerified(map: ReadonlyMap<ContentHash, UxfElement>): ElementPool;
}
/**
 * Recursively walk the DAG rooted at {@link hash}, marking every reachable
 * element (including instance chain peers) into {@link reachable}.
 *
 * The walk is depth-first. If a hash has already been visited it is skipped,
 * preventing infinite loops in the presence of shared sub-DAGs.
 *
 * For each visited element:
 * 1. The hash itself is added to the reachable set.
 * 2. If the hash participates in an instance chain, ALL hashes in that chain
 *    are added to the reachable set (and their elements are walked).
 * 3. Every child reference (single hash, array of hashes, or null) is
 *    recursively walked.
 *
 * @param pool            The element pool to read from.
 * @param hash            The starting content hash.
 * @param instanceChains  The instance chain index for chain expansion.
 * @param reachable       Accumulator set -- mutated in place.
 */
declare function walkReachable(pool: ElementPool | ReadonlyMap<ContentHash, UxfElement>, hash: ContentHash, instanceChains: InstanceChainIndex, reachable: Set<ContentHash>): void;
/**
 * Mark-and-sweep garbage collection over a UXF package.
 *
 * 1. **Mark** -- walk from every manifest root through the full DAG
 *    (including instance chain expansions) to build the set of reachable
 *    element hashes.
 * 2. **Sweep** -- delete every element in the pool that is NOT reachable.
 * 3. **Prune** -- remove instance chain index entries whose hashes were
 *    removed.
 *
 * The function mutates `pkg.pool` and `pkg.instanceChains` in place.
 *
 * @param pkg  The package to garbage-collect. Its pool and instanceChains
 *             are mutated (cast from their Readonly types).
 * @returns The set of content hashes that were removed.
 */
declare function collectGarbage(pkg: UxfPackageData): Set<ContentHash>;

/**
 * Instance Chain Management (WU-05)
 *
 * Implements instance chain operations per ARCHITECTURE Section 3.3
 * and SPECIFICATION Section 7.
 *
 * Instance chains are singly-linked lists of semantically equivalent
 * element versions, linked via the `predecessor` header field. The chain
 * index maps every hash in a chain to a shared InstanceChainEntry,
 * enabling O(1) head lookup from any point.
 *
 * @module uxf/instance-chain
 */

/**
 * Mutable variant of InstanceChainIndex for internal use.
 * The public API uses ReadonlyMap; internally we need mutation.
 */
type MutableInstanceChainIndex = Map<ContentHash, InstanceChainEntry>;
/**
 * Create an empty mutable instance chain index.
 */
declare function createInstanceChainIndex(): MutableInstanceChainIndex;
/**
 * Append a new instance to an existing element's instance chain.
 *
 * If no chain exists yet for `originalHash`, a new chain of length 2
 * is created (original + newInstance). If a chain already exists, the
 * new instance is prepended as the new head.
 *
 * Per SPEC 7.2:
 * - Rule 1: newInstance must have the same element type as the original.
 * - Rule 2: newInstance.header.predecessor must equal the current chain head.
 * - Rule 3: newInstance.header.semantics must be >= predecessor's semantics.
 * - Rule 7: Instance chain index is updated so all hashes point to
 *   the same updated InstanceChainEntry.
 *
 * @param pool          The element pool (newInstance is inserted here).
 * @param index         Mutable instance chain index to update.
 * @param originalHash  Content hash of the original element (must be in pool).
 * @param newInstance   The new instance element to add.
 * @returns Content hash of the newly added instance.
 */
declare function addInstance(pool: ElementPool, index: MutableInstanceChainIndex, originalHash: ContentHash, newInstance: UxfElement): ContentHash;
/**
 * Select an instance from a chain according to the given strategy.
 *
 * Per SPEC 7.4:
 * - `latest`:  Return the chain head (O(1)).
 * - `original`: Return the tail (last element in chain array).
 * - `by-kind`: Walk head-to-tail for matching kind; fallback if not found.
 * - `by-representation`: Walk head-to-tail for matching representation version.
 * - `custom`: Walk head-to-tail applying predicate; fallback if not found.
 *
 * @param chainEntry  The instance chain entry to search.
 * @param strategy    The selection strategy.
 * @param pool        The element pool (needed for custom/by-representation lookups).
 * @returns Content hash of the selected instance.
 */
declare function selectInstance(chainEntry: InstanceChainEntry, strategy: InstanceSelectionStrategy, pool: ElementPool): ContentHash;
/**
 * Resolve a content hash to its element, applying instance selection
 * if the hash participates in an instance chain.
 *
 * Per ARCHITECTURE Section 3.3:
 * 1. Check if hash is in the instance chain index.
 * 2. If found, select instance per strategy and return that element.
 * 3. If not found, return the element directly from pool.
 * 4. Throw MISSING_ELEMENT if not in pool.
 *
 * @param pool            The element pool.
 * @param hash            The content hash to resolve.
 * @param instanceChains  The instance chain index.
 * @param strategy        The instance selection strategy.
 * @returns The resolved UxfElement.
 */
declare function resolveElement(pool: ElementPool, hash: ContentHash, instanceChains: InstanceChainIndex, strategy: InstanceSelectionStrategy): UxfElement;
/**
 * Merge instance chains from a source index into a target index.
 *
 * Per Decision 6 (branching):
 * - If one chain is a prefix of the other, keep the longer chain.
 * - If chains diverge (different heads, neither is prefix), keep both
 *   heads as sibling entries in the target index.
 * - If target has no chain for the element, add the source chain.
 *
 * @param target      Mutable target index (mutated in place).
 * @param source      Source index to merge from.
 * @param targetPool  The target element pool (for element lookups).
 */
declare function mergeInstanceChains(target: MutableInstanceChainIndex, source: InstanceChainIndex, targetPool: ElementPool): void;
/**
 * Remove entries from the instance chain index whose hashes are in
 * the removed set. If a chain's head is removed, the chain entry
 * is updated or removed entirely.
 *
 * @param index         Mutable instance chain index (mutated in place).
 * @param removedHashes Set of content hashes that have been removed from the pool.
 */
declare function pruneInstanceChains(index: MutableInstanceChainIndex, removedHashes: Set<ContentHash>): void;
/**
 * Rebuild the instance chain index from scratch by scanning all elements
 * in the pool for non-null predecessor fields.
 *
 * Per SPEC 5.5: "can be rebuilt by following predecessor links."
 *
 * Algorithm:
 * 1. Scan all elements, record predecessor -> successor relationships.
 * 2. Find chain tails (elements with null predecessor that are predecessors
 *    of other elements, or elements that appear as predecessors).
 * 3. Walk from each tail to head, building chain entries.
 * 4. Map all hashes in each chain to the same entry.
 *
 * @param pool  The element pool to scan.
 * @returns A new mutable instance chain index.
 */
declare function rebuildInstanceChainIndex(pool: ElementPool): MutableInstanceChainIndex;

/**
 * Token Deconstruction (WU-06)
 *
 * Decomposes ITokenJson tokens into content-addressed DAG elements,
 * inserting them into an ElementPool. Each helper creates UxfElement
 * objects bottom-up and returns the ContentHash of the element placed
 * in the pool.
 *
 * The input type is `unknown` to support both ITokenJson (canonical)
 * and TxfToken (sphere-sdk) shapes with runtime detection.
 *
 * @module uxf/deconstruct
 */

/**
 * Deconstruct a token into content-addressed DAG elements in the pool.
 *
 * Accepts `unknown` input (supports both ITokenJson and TxfToken-like shapes)
 * with runtime validation. Placeholder tokens and pending finalization stubs
 * are rejected.
 *
 * @param pool  The element pool to insert elements into.
 * @param token The token to deconstruct (ITokenJson or compatible shape).
 * @returns The ContentHash of the token-root element.
 * @throws UxfError with code INVALID_PACKAGE if the token is invalid.
 */
declare function deconstructToken(pool: ElementPool, token: unknown): ContentHash;

/**
 * Token Reassembly (WU-07)
 *
 * Converts content-addressed DAG elements back into self-contained
 * ITokenJson-shaped plain objects. Reassembly is the inverse of
 * deconstruction (WU-06).
 *
 * Every element fetched from the pool is re-hashed and compared against
 * the expected content hash (Decision 7). A visited-hash set detects
 * cycles (Decision 8).
 *
 * @module uxf/assemble
 */

/**
 * Reassemble a token from the element pool by looking up its root hash
 * in the manifest.
 *
 * @param pool           The element pool containing all DAG elements.
 * @param manifest       Token manifest mapping tokenId to root hash.
 * @param tokenId        The token ID to reassemble.
 * @param instanceChains Instance chain index for version selection.
 * @param strategy       Instance selection strategy (default: latest).
 * @returns A plain object matching the ITokenJson shape.
 */
declare function assembleToken(pool: ElementPool, manifest: UxfManifest, tokenId: string, instanceChains: InstanceChainIndex, strategy?: InstanceSelectionStrategy): unknown;
/**
 * Reassemble a token directly from its root hash in the pool.
 * Used for nametag sub-DAGs whose root hashes are stored in parent
 * token-root children but may not have their own manifest entries.
 *
 * @param pool           The element pool.
 * @param rootHash       Content hash of the token-root element.
 * @param instanceChains Instance chain index.
 * @param strategy       Instance selection strategy (default: latest).
 * @returns A plain object matching the ITokenJson shape.
 */
declare function assembleTokenFromRoot(pool: ElementPool, rootHash: ContentHash, instanceChains: InstanceChainIndex, strategy?: InstanceSelectionStrategy): unknown;
/**
 * Reassemble a token at a specific historical state.
 *
 * - stateIndex=0: genesis only, no transactions. State is the genesis
 *   destination state.
 * - stateIndex=N: genesis + first N transactions. State is the
 *   destination state of transaction N-1 (the Nth transaction).
 *
 * Nametags are included in full regardless of stateIndex.
 *
 * @param pool           The element pool.
 * @param manifest       Token manifest.
 * @param tokenId        The token ID.
 * @param stateIndex     The historical state index (0 = genesis).
 * @param instanceChains Instance chain index.
 * @param strategy       Instance selection strategy (default: latest).
 * @returns A plain object matching the ITokenJson shape at the given state.
 */
declare function assembleTokenAtState(pool: ElementPool, manifest: UxfManifest, tokenId: string, stateIndex: number, instanceChains: InstanceChainIndex, strategy?: InstanceSelectionStrategy): unknown;

/**
 * UXF Package Verification (WU-09)
 *
 * Implements structural integrity verification per ARCHITECTURE Section 8.4
 * and SPECIFICATION Section 7.3.
 *
 * Checks performed:
 * 1. Manifest root existence in pool
 * 2. Child reference resolution (all refs point to existing pool entries)
 * 3. Content hash integrity (re-hash every element, compare to pool key)
 * 4. DAG cycle detection (track visited during traversal per token subgraph)
 * 5. Instance chain validation (type consistency, linear sequence, predecessor linkage)
 * 6. Orphaned element detection (warning, not error)
 *
 * @module uxf/verify
 */

/**
 * Verify structural integrity of a UXF package.
 *
 * Performs comprehensive checks on the package structure and returns
 * a result with errors, warnings, and statistics. The package is
 * considered valid if there are zero errors.
 *
 * @param pkg - The UXF package to verify.
 * @returns Verification result with errors, warnings, and stats.
 */
declare function verify(pkg: UxfPackageData): UxfVerificationResult;

/**
 * UXF Diff and Delta Operations (WU-10)
 *
 * Implements diff and delta operations per ARCHITECTURE Section 8.5.
 *
 * - `diff(source, target)` computes the minimal delta to transform source into target.
 * - `applyDelta(pkg, delta)` mutates a package by applying a delta.
 *
 * @module uxf/diff
 */

/**
 * Compute the minimal delta between two UXF packages.
 *
 * The delta describes the changes needed to transform `source` into `target`:
 * - `addedElements`: elements in target's pool but not in source's pool.
 * - `removedElements`: element hashes in source's pool but not in target's pool.
 * - `addedTokens`: manifest entries in target but not in source, or with a
 *    different root hash.
 * - `removedTokens`: token IDs in source's manifest but not in target's.
 * - `addedChainEntries`: instance chain entries in target but not in source.
 *
 * @param source - The source (baseline) package.
 * @param target - The target package.
 * @returns The minimal delta from source to target.
 */
declare function diff(source: UxfPackageData, target: UxfPackageData): UxfDelta;
/**
 * Apply a delta to a UXF package, mutating it in place.
 *
 * Operations:
 * 1. Add all `addedElements` to the pool.
 * 2. Remove all `removedElements` from the pool.
 * 3. Add/update manifest entries from `addedTokens`.
 * 4. Remove manifest entries for `removedTokens`.
 * 5. Merge instance chain entries from `addedChainEntries`.
 *
 * Edge cases are handled gracefully:
 * - addedElements that already exist in the pool are no-ops (content-addressed dedup).
 * - removedElements that don't exist in the pool are no-ops.
 *
 * @param pkg - The package to mutate.
 * @param delta - The delta to apply.
 */
declare function applyDelta(pkg: UxfPackageData, delta: UxfDelta): void;

/**
 * UXF JSON Serialization (WU-11)
 *
 * Implements JSON serialization per ARCHITECTURE Section 6.2
 * and SPECIFICATION Sections 5.8, 6b.
 *
 * - packageToJson: serialize UxfPackageData to a JSON string
 * - packageFromJson: deserialize a JSON string back to UxfPackageData
 *
 * Conventions (SPEC 6b.1):
 * - Binary fields: lowercase hex strings
 * - Content hashes: 64-char lowercase hex
 * - Element type in JSON: integer type ID, NOT string tag
 * - Null values: JSON null
 * - Empty arrays: []
 * - Field names: camelCase
 * - Map types (ReadonlyMap) serialized as plain objects
 * - Set types (ReadonlySet) serialized as arrays
 *
 * @module uxf/json
 */

/**
 * Serialize the complete UXF package to a JSON string.
 *
 * JSON structure (SPEC 5.8):
 * ```json
 * {
 *   "uxf": "1.0.0",
 *   "metadata": { ... },
 *   "manifest": { "<tokenId>": "<rootHash>", ... },
 *   "instanceChainIndex": { "<hash>": { "head", "chain" }, ... },
 *   "indexes": { "byTokenType", "byCoinId", "byStateHash" },
 *   "elements": { "<hash>": { "header", "type", "content", "children" }, ... }
 * }
 * ```
 *
 * @param pkg - The UXF package data to serialize.
 * @returns A JSON string representation.
 */
declare function packageToJson(pkg: UxfPackageData): string;
/**
 * Deserialize a UXF package from a JSON string.
 *
 * Validates structure and throws SERIALIZATION_ERROR on malformed input.
 * Content hash strings are validated via the branded contentHash() constructor.
 *
 * @param json - The JSON string to parse.
 * @returns The reconstructed UxfPackageData.
 * @throws UxfError with code SERIALIZATION_ERROR on malformed input.
 */
declare function packageFromJson(json: string): UxfPackageData;

/**
 * UXF IPLD/CAR Serialization (WU-12)
 *
 * Implements IPLD block export, CID computation, and CARv1 import/export
 * per ARCHITECTURE Sections 6.3-6.4 and SPECIFICATION Section 6c.
 *
 * Key concepts:
 * - Each UxfElement maps to one IPLD block (dag-cbor encoded, CIDv1)
 * - The CID multihash digest is identical to the UXF content hash (both SHA-256)
 * - Child references use raw 32-byte hash bytes (CBOR bstr) in IPLD form —
 *   the SAME canonical form used for content hashing. This means
 *   `sha256(elementBytes) === ContentHash digest === CID.multihash.digest`
 *   for every element block. This self-consistency is the design choice
 *   that powers issue #213 Option C: per-block IPFS dedup with no
 *   aggregator break and no on-disk migration. The receiver-side walker
 *   in `profile/ipfs-client.ts` (`walkUxfElement`) reconstructs CID
 *   references from Uint8Array children via `contentHashBytesToCid`.
 * - Legacy bundles encoded children as CBOR Tag 42 CID links;
 *   `decodeIpldChildren` accepts BOTH forms for backward compatibility
 *   with in-flight bundles produced before #213.
 * - CAR root is the envelope block CID (which contains a CID link to the manifest)
 *
 * @module uxf/ipld
 */

/**
 * Convert a ContentHash hex string to a CIDv1 (dag-cbor, sha2-256).
 *
 * The CID encodes:
 * - version: 1
 * - codec: dag-cbor (0x71)
 * - hash function: sha2-256 (0x12)
 * - digest: the 32-byte hash from the ContentHash
 */
declare function contentHashToCid(hash: ContentHash): CID;
/**
 * Extract the SHA-256 digest from a CID and return as a ContentHash.
 *
 * @throws UxfError if the CID does not use sha2-256 hashing.
 */
declare function cidToContentHash(cid: CID): ContentHash;
/**
 * Compute the CIDv1 for a UXF element.
 *
 * Uses the same canonical dag-cbor encoding and SHA-256 hash as
 * computeElementHash, so the CID's multihash digest is identical
 * to the UXF content hash (SPEC 6c.1).
 *
 * @param element - The UXF element.
 * @returns CIDv1 with dag-cbor codec and sha2-256 hash.
 */
declare function computeCid(element: UxfElement): CID;
/**
 * Encode a UXF element as an IPLD block.
 *
 * Issue #213 (Option C): the IPLD bytes are the SAME canonical form used
 * for content hashing — children encoded as raw 32-byte hash bytes
 * (CBOR bstr), not Tag 42 CID links. This makes the block
 * self-consistent: `sha256(bytes) === cid.multihash.digest`, so Kubo's
 * `dag/put` re-derives the same CID we publish under and per-block IPFS
 * dedup works correctly (a future bundle sharing 90% of its sub-elements
 * shares 90% of its pinned blocks).
 *
 * ContentHash semantics are unchanged: the hash canonical form and the
 * IPLD canonical form are now identical, so `computeElementHash(element)`
 * remains stable across the #213 transition. No aggregator break, no
 * on-disk migration.
 *
 * Receiver-side: a generic CBOR-Tag-42 walker (`collectCidLinks`) will
 * NOT discover Uint8Array children. The UXF-aware walker
 * (`profile/ipfs-client.ts:walkUxfElement`) converts each
 * Uint8Array child back into a CID via `contentHashBytesToCid` to
 * traverse the DAG. Generic dag-cbor blocks (envelope, manifest, lean
 * snapshot blocks) continue to use CID links and the generic walker.
 *
 * @param element - The UXF element.
 * @returns An object with `cid` (CIDv1) and `bytes` (dag-cbor encoded block).
 */
declare function elementToIpldBlock(element: UxfElement): {
    cid: CID;
    bytes: Uint8Array;
};
/**
 * Export the entire UXF package as a CARv1 byte stream.
 *
 * Root: CID of the package envelope block.
 * Block ordering (SPEC 6c.4):
 * 1. Envelope block (root)
 * 2. Manifest block
 * 3. BFS traversal of each token root's DAG
 * 4. Shared elements appear once at first reference position
 *
 * @param pkg - The UXF package data to export.
 * @returns The complete CAR bytes.
 */
declare function exportToCar(pkg: UxfPackageData): Promise<Uint8Array>;
/**
 * Import a UXF package from a CARv1 byte stream.
 *
 * Reads the root CID (envelope), decodes envelope and manifest,
 * then iterates all remaining blocks as elements.
 * CID links in children are converted back to ContentHash hex strings.
 *
 * @param car - The CAR bytes to import.
 * @returns The reconstructed UxfPackageData.
 * @throws UxfError on invalid CAR structure.
 */
declare function importFromCar(car: Uint8Array): Promise<UxfPackageData>;

/**
 * UxfPackage Class (WU-08)
 *
 * The primary public interface wrapping UxfPackageData with a fluent,
 * mutation-friendly API. Methods mutate in place and return `this`
 * for chaining (builder pattern).
 *
 * Also exports free functions (functional API) that operate on raw
 * UxfPackageData for consumers who prefer a functional style.
 *
 * @module uxf/UxfPackage
 */

/**
 * The primary public interface for UXF operations.
 * Wraps UxfPackageData with a fluent, mutation-friendly API.
 */
declare class UxfPackage {
    private data;
    private constructor();
    /**
     * Create a new empty package.
     */
    static create(options?: {
        description?: string;
        creator?: string;
    }): UxfPackage;
    /**
     * Load from storage adapter.
     */
    static open(storage: UxfStorageAdapter): Promise<UxfPackage>;
    /**
     * Deserialize from JSON.
     */
    static fromJson(json: string): UxfPackage;
    /**
     * Deserialize from CAR bytes.
     */
    static fromCar(car: Uint8Array): Promise<UxfPackage>;
    /**
     * Deconstruct a token and add to the package.
     * If the token already exists, its manifest entry is updated to the new root.
     */
    ingest(token: unknown): this;
    /**
     * Batch ingest multiple tokens.
     */
    ingestAll(tokens: unknown[]): this;
    /**
     * Reassemble a token at its latest state.
     * @returns Self-contained object matching the ITokenJson shape.
     */
    assemble(tokenId: string, strategy?: InstanceSelectionStrategy): unknown;
    /**
     * Reassemble at a specific historical state.
     * stateIndex=0 -> genesis only. stateIndex=N -> genesis + first N transactions.
     */
    assembleAtState(tokenId: string, stateIndex: number, strategy?: InstanceSelectionStrategy): unknown;
    /**
     * Assemble all tokens in the manifest.
     */
    assembleAll(strategy?: InstanceSelectionStrategy): Map<string, unknown>;
    /**
     * Remove a token from the manifest.
     * Elements are NOT garbage-collected automatically -- call gc() explicitly.
     */
    removeToken(tokenId: string): this;
    /**
     * List all token IDs in the manifest.
     */
    tokenIds(): string[];
    /**
     * Check if a token exists in the manifest.
     */
    hasToken(tokenId: string): boolean;
    /**
     * Get the number of transactions for a token.
     * Resolves the token root element and returns its transactions array length.
     */
    transactionCount(tokenId: string): number;
    /**
     * Append a new instance to an element's instance chain.
     */
    addInstance(originalHash: ContentHash, newInstance: UxfElement): this;
    /**
     * Phase 2 -- throws NOT_IMPLEMENTED in Phase 1.
     */
    consolidateProofs(tokenId: string, txRange: [number, number]): void;
    /**
     * Merge another package into this one.
     * Elements are deduplicated by content hash.
     * Manifest entries from the other package are added (or overwritten if tokenId collides).
     *
     * Wave G.3: optionally accepts `verifiedProofs` — a set of inclusion-
     * proof element ContentHashes that the caller has cryptographically
     * verified (typically via `OracleProvider.verifyInclusionProof`).
     * When supplied, Rule 4 enrichment activates: same-core-different-
     * proof tx pairs are lifted into a synthetic token-root only when
     * at least one side's proof appears in the verified set. When
     * omitted, falls back to the conservative pre-G.3 `divergent`
     * resolution for any pairwise hash mismatch.
     */
    merge(other: UxfPackage, opts?: {
        verifiedProofs?: ReadonlySet<string>;
    }): this;
    /**
     * Wave I.5: build the `verifiedProofs` set for a Rule 4-enabled
     * merge by walking the inclusion-proof elements in this package
     * AND in `other` (the merge candidate), assembling each into the
     * SDK JSON shape, and asking the supplied `verifier` to validate.
     *
     * Returns the set of ContentHashes whose proofs verified
     * cryptographically. Suitable for passing to `merge(other, {
     * verifiedProofs })` to activate Rule 4 enrichment.
     *
     * The verifier callback is the `OracleProvider.verifyInclusionProof`
     * signature; supplied as a callback rather than the full provider
     * so this module stays decoupled from the oracle types.
     *
     * Failures (verifier throws, proof element malformed, etc.) are
     * treated as "not verified" — the resulting set is conservative.
     */
    computeVerifiedProofs(other: UxfPackage, verifier: (input: {
        proofJson: unknown;
        transactionHash: string;
        proofHash?: string;
    }) => Promise<boolean>): Promise<Set<string>>;
    /**
     * Compute the minimal delta between this package and another.
     */
    diff(other: UxfPackage): UxfDelta;
    /**
     * Apply a delta to this package.
     */
    applyDelta(delta: UxfDelta): this;
    /**
     * Garbage-collect unreachable elements.
     * Returns the number of elements removed.
     */
    gc(): number;
    /**
     * Verify structural integrity of the package.
     */
    verify(): UxfVerificationResult;
    /**
     * Filter tokens by predicate.
     */
    filterTokens(predicate: (tokenId: string, rootElement: UxfElement) => boolean): string[];
    /**
     * Get tokens by coin ID (uses index).
     */
    tokensByCoinId(coinId: string): string[];
    /**
     * Get tokens by token type (uses index).
     */
    tokensByTokenType(tokenType: string): string[];
    /**
     * Serialize to JSON string.
     */
    toJson(): string;
    /**
     * Export as CARv1 bytes.
     */
    toCar(): Promise<Uint8Array>;
    /**
     * Save to storage adapter.
     */
    save(storage: UxfStorageAdapter): Promise<void>;
    /** Number of tokens in manifest. */
    get tokenCount(): number;
    /** Number of elements in pool. */
    get elementCount(): number;
    /**
     * Estimated byte size (rough estimate based on element count).
     * Each element is roughly 500 bytes on average when CBOR-encoded.
     */
    get estimatedSize(): number;
    /** Get the underlying data (read-only). */
    get packageData(): Readonly<UxfPackageData>;
}
/**
 * Deconstruct a token and add it to the package.
 * Updates manifest and secondary indexes.
 */
declare function ingest(pkg: UxfPackageData, token: unknown): void;
/**
 * Batch ingest multiple tokens.
 *
 * Steelman³⁰/³¹: wrap the pool ONCE for the whole batch (O(N) SHA-256
 * calls instead of O(N²)) AND defer manifest + index mutations until
 * AFTER syncPool. This fixes two F.35 regressions:
 *
 *   (a) Index breakage: updateIndexesForToken reads from pkg.pool,
 *       which doesn't have the new elements until syncPool runs.
 *       Pre-syncPool calls silently no-op'd, leaving byCoinId /
 *       byTokenType / byStateHash empty after batch ingest. None of
 *       the 38 UxfPackage tests asserted post-batch index content,
 *       so the regression shipped silently.
 *
 *   (b) Atomicity: manifest mutations during the loop made a partial
 *       failure leave the manifest pointing at rootHashes that DO NOT
 *       exist in the pool yet. Now: collect (tokenId, rootHash) pairs
 *       in a local list; commit pool + manifest + indexes only after
 *       the loop completes.
 */
declare function ingestAll(pkg: UxfPackageData, tokens: unknown[]): void;
/**
 * Remove a token from the manifest and all indexes.
 * Does NOT garbage-collect elements.
 */
declare function removeToken(pkg: UxfPackageData, tokenId: string): void;
/**
 * Merge another package's elements and manifest into this one.
 *
 * For each element in source.pool, re-hash via computeElementHash() and
 * verify the hash matches its key before inserting (Decision 7).
 * Manifest entries from source are added (or overwritten if tokenId collides).
 * Instance chains are merged per Decision 6.
 * Secondary indexes are rebuilt from scratch.
 *
 * ------------------------------------------------------------------
 * Per-token atomicity contract
 * ------------------------------------------------------------------
 *
 * The merge is **per-token atomic** rather than whole-merge atomic:
 *   - Whole-bundle pool verification (Decision 7) is a fast-fail
 *     gate. If ANY source pool element fails its hash re-check, the
 *     entire merge aborts and target state is unchanged — a corrupt
 *     pool is a whole-bundle integrity failure and cannot be
 *     localised to a single tokenId.
 *   - Once the pool verifies, each source manifest entry is
 *     processed independently. If `resolveTokenRoot` throws for
 *     tokenId N (e.g. `computeElementHash` rejects a malformed
 *     child inside a Rule 4 synthetic rebuild), the failure is
 *     logged via `logger.warn('UxfPackage', …)` citing tokenId +
 *     error, and iteration CONTINUES for the remaining tokenIds.
 *     One poisoned entry must not deny the user their good tokens.
 *
 * Implementation:
 *   1. Stage the pool-verify pass into a proposed-inserts map
 *      without touching target.pool.
 *   2. Build a temporary "virtual pool" (target.pool ∪ stagedPool)
 *      that the resolver can read through, without any commits.
 *   3. For each source manifest entry: invoke the resolver, stage
 *      its manifest write + any Rule 4 synthetic root insert. Skip
 *      on throw.
 *   4. Apply all staged writes to target.pool and target.manifest
 *      atomically (synchronous Map.set calls — no I/O inside the
 *      apply phase).
 *
 * Pool-rollback policy for partially-merged tokens:
 *
 *   Source pool elements are retained even when the owning source
 *   manifest entry was skipped on a resolver throw. Rationale:
 *     - The pool is content-addressed. Duplicate keys are no-ops;
 *       unused pool growth is bounded at roughly ~500 bytes per
 *       orphaned element and removed by `gc()` on demand.
 *     - Transaction / state / predicate elements authored for a
 *       skipped tokenId may be legitimately referenced by a
 *       surviving tokenId's instance chain (shared nametag tokens,
 *       shared predicates). A reachability-aware rollback would
 *       have to re-implement `walkReachable` + set arithmetic on
 *       the staged inserts — needless complexity for cheap bloat.
 *     - GC is already the documented contract for pruning
 *       unreachable elements after `removeToken` / partial imports.
 *
 * Multi-source (3+ candidate) refactor note (W3):
 *
 *   `resolveTokenRoot`'s `divergent` outcome is whole-set when
 *   candidates ≥ 3: if any pair diverges the whole tokenId falls
 *   into `divergent`. Today mergePkg is strictly 2-candidate
 *   (existingRoot + incomingRoot) so this is latent. A future
 *   multi-source JOIN (merging K ≥ 2 source bundles in one pass)
 *   should either (a) fold sources pairwise with this 2-candidate
 *   resolver, accepting that pairwise JOIN is not associative for
 *   the `divergent` case, or (b) extend the resolver to return a
 *   compatibility partition and pick the majority class. Leave the
 *   refactor — just documenting.
 */
declare function mergePkg(target: UxfPackageData, source: UxfPackageData, verifiedProofs?: ReadonlySet<string>): void;

/**
 * Phase 2 -- throws NOT_IMPLEMENTED in Phase 1.
 */
declare function consolidateProofs(_pkg: UxfPackageData, _tokenId: string, _txRange: [number, number]): void;

/**
 * UXF Storage Adapters (WU-13)
 *
 * Platform-specific storage implementations for persisting UXF packages.
 *
 * - InMemoryUxfStorage: trivial in-memory adapter for testing/ephemeral use
 * - KvUxfStorageAdapter: delegates to a key-value StorageProvider interface
 *
 * @module uxf/storage-adapters
 */

/**
 * Minimal key-value storage interface.
 * Compatible with sphere-sdk's StorageProvider and any similar KV store.
 */
interface KvStorage {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
}
/**
 * Simple in-memory storage adapter for testing and ephemeral use.
 * Stores a deep clone of UxfPackageData via JSON round-trip.
 */
declare class InMemoryUxfStorage implements UxfStorageAdapter {
    private data;
    save(pkg: UxfPackageData): Promise<void>;
    load(): Promise<UxfPackageData | null>;
    clear(): Promise<void>;
}
/**
 * Adapter that stores UXF package data via an existing key-value
 * StorageProvider interface by serializing the package as JSON.
 *
 * This avoids creating new platform-specific storage implementations
 * for simple use cases. The entire package is stored under a single key.
 */
declare class KvUxfStorageAdapter implements UxfStorageAdapter {
    private readonly storage;
    private readonly key;
    constructor(storage: KvStorage, key?: string);
    save(pkg: UxfPackageData): Promise<void>;
    load(): Promise<UxfPackageData | null>;
    clear(): Promise<void>;
}

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
 * UXF Inter-Wallet Transfer — wire-format encode/decode helpers (T.1.D).
 *
 * Bridges between in-memory {@link UxfTransferPayload} values (from
 * `types/uxf-transfer.ts`) and the JSON byte string published as Nostr
 * `TOKEN_TRANSFER` event content. The encoder is byte-deterministic so
 * tooling can hash/cache envelopes; the decoder is paranoid against any
 * malformed input shape.
 *
 * Spec references:
 *  - §3.1   Envelope JSON shape (kind/version/mode/bundleCid/...).
 *  - §3.2   `kind: 'uxf-car'` — inline CAR via base64.
 *  - §3.3   `kind: 'uxf-cid'` — CID-by-reference.
 *  - §3.3.1 Per-call delivery overrides (clamp behavior in `limits.ts`).
 *  - §3.4   Legacy wire shapes (TXF, V6, V5/V4, SDK) — pass-through.
 *  - §5.0   Concurrency — decoders MUST NOT block; throw or return.
 *
 * **Boundary with `pkg.verify()` (T.3.A)**: the encoder DOES NOT compute
 * a CAR-root-CID match check (`bundleCid === extractCarRootCid(carBytes)`)
 * because (a) the encoder accepts a pre-built `UxfTransferPayload` value
 * whose authoring layer is responsible for that consistency, and (b)
 * cryptographic verification of CAR contents is uniformly delegated to
 * `pkg.verify()`. Callers that need the consistency check explicitly
 * MUST run `extractCarRootCid` themselves and cross-reference.
 *
 * @packageDocumentation
 */

/**
 * Serialize a {@link UxfTransferPayload} to its canonical Nostr-content
 * JSON form (§3.1).
 *
 * **Determinism**. Object keys are emitted in a fixed canonical order —
 * not alphabetical, but the order specified by §3.1 (kind, version, mode,
 * bundleCid, tokenIds, memo, sender, then kind-specific fields). This
 * matches the spec's example, makes the on-the-wire diff readable, and
 * gives byte-equal output for byte-equal inputs across runs and across
 * Node engines.
 *
 * Legacy payloads are pass-through: the function recognizes them
 * structurally via the absence of `kind` and serializes them with a
 * recursive deterministic re-keying so two equivalent legacy payloads
 * produce the same wire bytes.
 *
 * @param payload The fully-formed payload to serialize. The caller is
 *                responsible for upstream consistency (e.g.,
 *                `bundleCid === extractCarRootCid(carBytes)`).
 * @returns Canonical JSON string ready for transport.
 *
 * @throws {SphereError} `BUNDLE_REJECTED_MALFORMED_ENVELOPE` if the input
 *         fails {@link isUxfTransferPayload} — the encoder refuses to
 *         emit a structurally-invalid envelope (defense-in-depth against
 *         a bug upstream).
 */
declare function encodeTransferPayload(payload: UxfTransferPayload): string;
declare function decodeTransferPayload(content: string): UxfTransferPayload;
/**
 * Convenience wrapper around {@link decodeTransferPayload} for callers
 * that hold a raw Nostr event content string. Currently a thin alias —
 * `NostrTransportProvider.decryptContent()` already strips the
 * `token_transfer:` content prefix BEFORE handing the payload to
 * downstream code, so by the time decoder code runs, the input is plain
 * JSON. This wrapper exists so future revisions can introduce an outer
 * envelope (signed wrapper, NIP-44 metadata, ...) without touching every
 * call site — only this function's body changes.
 *
 * @see decodeTransferPayload
 */
declare function decodeNostrEventContent(eventContent: string): UxfTransferPayload;
/**
 * Parse `carBytes` as a CARv1 file and return its single root CID as a
 * CIDv1 base32 string (multibase prefix `b`).
 *
 * **Hard rule**: single-root only. Multi-root CARs are explicitly
 * rejected per Wave G.5 / §5.2 #1. Empty-roots CARs are also rejected
 * (the protocol is strict about the canonical bundle identity binding
 * to exactly one root).
 *
 * @param carBytes Raw CARv1 bytes (header + at least one block).
 * @returns The root CID as a CIDv1 base32 string (e.g.,
 *          `bafy2bzace...`).
 *
 * @throws {SphereError} `BUNDLE_REJECTED_INVALID_CAR` if the bytes don't
 *         parse as a CAR (truncated, malformed varints, unknown framing).
 * @throws {SphereError} `BUNDLE_REJECTED_MULTI_ROOT` if the CAR has zero
 *         or more than one root.
 */
declare function extractCarRootCid(carBytes: Uint8Array): Promise<string>;
/**
 * Encode raw CAR bytes as the `carBase64` string used in `uxf-car`
 * payloads. Uses `Buffer.toString('base64')` for cross-platform
 * consistency (the SDK already polyfills `Buffer` in browser builds).
 */
declare function carBytesToBase64(carBytes: Uint8Array): string;
/**
 * Decode the `carBase64` field of a `uxf-car` payload back into raw
 * bytes. Strict-mode base64: rejects non-base64 characters.
 *
 * @throws {SphereError} `BUNDLE_REJECTED_MALFORMED_ENVELOPE` if the
 *         input contains characters outside the base64 alphabet, or if
 *         decoding to bytes fails for any other reason.
 */
declare function carBase64ToBytes(carBase64: string): Uint8Array;

export { type AuthenticatorContent, type ContentHash, ELEMENT_TYPE_IDS, ElementPool, type GenesisChildren, type GenesisContent, type GenesisDataContent, InMemoryUxfStorage, type InclusionProofChildren, type InclusionProofContent, type InstanceChainEntry, type InstanceChainIndex, type InstanceSelectionStrategy, KvUxfStorageAdapter, type MutableInstanceChainIndex, type PredicateContent, STRATEGY_LATEST, STRATEGY_ORIGINAL, type SmtPathContent, type StateContent, type TokenCoinDataContent, type TokenRootChildren, type TokenRootContent, type TransactionChildren, type TransactionContent, type TransactionDataContent, type UnicityCertificateContent, type UxfDelta, type UxfElement, type UxfElementContent, type UxfElementHeader, type UxfElementType, type UxfEnvelope, UxfError, type UxfErrorCode, type UxfIndexes, type UxfInstanceKind, type UxfManifest, UxfPackage, type UxfPackageData, type UxfStorageAdapter, type UxfVerificationIssue, type UxfVerificationResult, addInstance, applyDelta, assembleToken, assembleTokenAtState, assembleTokenFromRoot, carBase64ToBytes, carBytesToBase64, cidToContentHash, collectGarbage, computeCid, computeElementHash, consolidateProofs, contentHash, contentHashToCid, createInstanceChainIndex, decodeNostrEventContent, decodeTransferPayload, deconstructToken, diff, elementToIpldBlock, encodeTransferPayload, exportToCar, extractCarRootCid, hexToBytes, importFromCar, ingest, ingestAll, mergePkg as merge, mergeInstanceChains, packageFromJson, packageToJson, prepareChildrenForHashing, prepareContentForHashing, pruneInstanceChains, rebuildInstanceChainIndex, removeToken, resolveElement, selectInstance, verify, walkReachable };
