/**
 * Instant Transfer Types
 *
 * Spec Reference: TOKEN_INVENTORY_SPEC.md v3.5 - Sections 13 & 14
 *
 * Implements types for INSTANT_SEND and INSTANT_RECEIVE modes:
 * - INSTANT_SEND: Reduce send latency from 15-20s to 2-3s
 * - INSTANT_RECEIVE: Make received tokens visible immediately
 */

import type { Token } from '../data/model';

// ============================================
// Payment Session Types
// ============================================

/**
 * Status of a payment session through its lifecycle
 *
 * SEND Flow:
 * INITIATED -> COMMITMENT_CREATED -> NOSTR_DELIVERED -> (background: SUBMITTED -> PROOF_RECEIVED) -> COMPLETED
 *
 * RECEIVE Flow:
 * INITIATED -> TOKEN_RECEIVED -> FINALIZING -> COMPLETED
 */
export type PaymentSessionStatus =
  | 'INITIATED'           // Session created
  | 'COMMITMENT_CREATED'  // Transfer commitment ready (SEND)
  | 'SUBMITTED'           // Submitted to aggregator (SEND, background)
  | 'PROOF_RECEIVED'      // Inclusion proof received (SEND, background)
  | 'TOKEN_RECEIVED'      // Token received from Nostr (RECEIVE)
  | 'FINALIZING'          // Running finalization (RECEIVE)
  | 'NOSTR_DELIVERED'     // Token sent via Nostr (SEND)
  | 'COMPLETED'           // Fully completed
  | 'FAILED'              // Terminal failure
  | 'TIMED_OUT';          // Session exceeded deadline

/**
 * Direction of the payment session
 */
export type PaymentSessionDirection = 'SEND' | 'RECEIVE';

/**
 * Error codes specific to instant transfers
 */
export type PaymentSessionErrorCode =
  | 'NOSTR_DELIVERY_FAILED'      // Failed to send via Nostr
  | 'NOSTR_TIMEOUT'              // Nostr confirmation timed out
  | 'AGGREGATOR_SUBMIT_FAILED'   // Background aggregator submission failed (non-fatal for sender)
  | 'IPFS_SYNC_FAILED'           // Background IPFS sync failed (non-fatal)
  | 'TOKEN_FINALIZATION_FAILED'  // Recipient couldn't finalize token
  | 'PROOF_FETCH_FAILED'         // Recipient couldn't fetch proof
  | 'SESSION_TIMEOUT'            // Session exceeded deadline
  | 'UNKNOWN';

/**
 * Error details for a payment session
 */
export interface PaymentSessionError {
  code: PaymentSessionErrorCode;
  message: string;
  timestamp: number;
  recoverable: boolean;
  details?: Record<string, unknown>;
}

/**
 * Payment session tracking structure
 *
 * Per spec Section 13.4: PaymentSession tracks the instant transfer lifecycle
 */
export interface PaymentSession {
  /** Unique session identifier */
  id: string;

  /** Direction of transfer */
  direction: PaymentSessionDirection;

  /** Current status */
  status: PaymentSessionStatus;

  /** Timestamp when session was created */
  createdAt: number;

  /** Timestamp of last status update */
  updatedAt: number;

  /** Deadline for session completion (default: createdAt + 300_000 = 5 min) */
  deadline?: number;

  /** Error details if failed */
  error: PaymentSessionError | null;

  // ==========================================
  // SEND-specific fields (when direction === 'SEND')
  // ==========================================

  /** Source token ID being sent */
  sourceTokenId?: string;

  /** Recipient's human-readable nametag */
  recipientNametag?: string;

  /** Recipient's Nostr public key */
  recipientPubkey?: string;

  /** Amount being sent (BigInt as string) */
  amount?: string;

  /** Coin ID for the token type */
  coinId?: string;

  /** Hex-encoded salt used in commitment */
  salt?: string;

  /** Serialized transfer commitment */
  commitmentJson?: string;

  /** Nostr event ID after delivery */
  nostrEventId?: string;

  /** Associated outbox entry ID */
  outboxEntryId?: string;

  // ==========================================
  // Background lane status (SEND)
  // ==========================================

  /** Background aggregator submission status */
  aggregatorStatus?: 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED';

  /** Background IPFS sync status */
  ipfsStatus?: 'PENDING' | 'SYNCED' | 'FAILED';

  // ==========================================
  // RECEIVE-specific fields (when direction === 'RECEIVE')
  // ==========================================

  /** Source Nostr event ID */
  sourceEventId?: string;

  /** Sender's Nostr public key */
  senderPubkey?: string;

  /** Serialized received token JSON (before finalization) */
  receivedTokenJson?: string;

  /** Finalized UI token */
  finalizedToken?: Token;
}

// ============================================
// Transfer Progress Events
// ============================================

/**
 * Stages of transfer progress for UI updates
 */
export type TransferProgressStage =
  | 'SESSION_CREATED'
  | 'COMMITMENT_READY'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'BACKGROUND_AGGREGATOR'
  | 'BACKGROUND_IPFS'
  | 'DONE'
  | 'ERROR';

/**
 * Progress event emitted during instant transfer
 */
export interface TransferProgressEvent {
  paymentSessionId: string;
  stage: TransferProgressStage;
  timestamp: number;
  message: string;
  payload?: Record<string, unknown>;
}

/**
 * Emit a transfer progress event for UI updates
 * @param event - Progress event to emit
 */
export function emitTransferProgress(event: TransferProgressEvent): void {
  window.dispatchEvent(new CustomEvent('transfer-progress', { detail: event }));
}

/**
 * Subscribe to transfer progress events
 * @param callback - Callback to invoke on progress
 * @returns Cleanup function to unsubscribe
 */
export function subscribeToTransferProgress(
  callback: (event: TransferProgressEvent) => void
): () => void {
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<TransferProgressEvent>;
    callback(customEvent.detail);
  };

  window.addEventListener('transfer-progress', handler);
  return () => window.removeEventListener('transfer-progress', handler);
}

// ============================================
// Instant Send Types
// ============================================

/**
 * Result of an instant send operation
 */
export interface InstantSendResult {
  /** Payment session ID for tracking */
  sessionId: string;

  /** Whether Nostr delivery succeeded (critical path) */
  nostrDelivered: boolean;

  /** Nostr event ID (if delivered) */
  nostrEventId?: string;

  /** Time taken for critical path (Nostr delivery) in ms */
  criticalPathDurationMs: number;

  /** Whether background aggregator submission started */
  aggregatorSubmissionStarted: boolean;

  /** Whether background IPFS sync started */
  ipfsSyncStarted: boolean;
}

/**
 * Options for instant send operation
 */
export interface InstantSendOptions {
  /** Enable instant mode (default: true) */
  instant?: boolean;

  /** Timeout for Nostr delivery confirmation in ms (default: 30000) */
  nostrTimeoutMs?: number;

  /** Skip background aggregator submission (for testing) */
  skipBackgroundAggregator?: boolean;

  /** Skip background IPFS sync (for testing) */
  skipBackgroundIpfs?: boolean;
}

// ============================================
// Instant Receive Types
// ============================================

/**
 * Pending IPFS sync entry for 3-phase receive model
 *
 * Per spec Section 13.20: Phase 2 tracks tokens pending IPFS confirmation
 */
export interface PendingIpfsSyncEntry {
  /** Token ID saved to localStorage */
  tokenId: string;

  /** Nostr event ID (to mark as processed after IPFS confirms) */
  nostrEventId: string;

  /** Timestamp when saved to localStorage */
  savedAt: number;

  /** Number of IPFS sync attempts */
  syncAttempts: number;

  /** Last sync error (if any) */
  lastSyncError?: string;
}

// ============================================
// INSTANT_SPLIT Types (Section 15)
// ============================================

/**
 * Split payment session for tracking token split transfers
 * Similar to PaymentSession but tracks the multi-phase split operation
 */
export interface SplitPaymentSession {
  /** Unique session identifier */
  id: string;

  /** Direction (always 'SEND' for split operations) */
  direction: 'SEND';

  /** Source token ID being split */
  sourceTokenId: string;

  /** Payment amount (sent to recipient) */
  paymentAmount: string;

  /** Change amount (kept by sender) */
  changeAmount: string;

  /** Recipient's human-readable nametag */
  recipientNametag?: string;

  /** Recipient's Nostr public key */
  recipientPubkey?: string;

  /** Phase tracking for split operation */
  phases: {
    /** Burn phase status */
    burn: 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED';
    /** Mints phase status (parallel submission) */
    mints: 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'PARTIAL' | 'FAILED';
    /** Transfer phase status (INSTANT_SEND) */
    transfer: 'PENDING' | 'NOSTR_DELIVERED' | 'CONFIRMED' | 'FAILED';
  };

  /** Timing information for performance tracking */
  timing: {
    burnStartedAt?: number;
    burnConfirmedAt?: number;
    mintsStartedAt?: number;
    mintsConfirmedAt?: number;
    nostrDeliveredAt?: number;
  };

  /** Payment token ID (after mint) */
  paymentTokenId?: string;

  /** Change token ID (after mint) */
  changeTokenId?: string;

  /** Split group ID (links all outbox entries) */
  splitGroupId?: string;

  /** Creation timestamp */
  createdAt: number;

  /** Last update timestamp */
  updatedAt: number;
}

// ============================================
// Sender Recovery Types (Section 14)
// ============================================

/**
 * Result of sender recovery operation
 */
export interface SenderRecoveryResult {
  /** Number of tokens successfully recovered */
  tokensRecovered: number;

  /** Number of tokens skipped (already in Sent folder) */
  tokensSkipped: number;

  /** Errors encountered during recovery */
  errors: SenderRecoveryError[];

  /** Total Nostr events scanned */
  eventsScanned: number;

  /** Duration of recovery operation in ms */
  durationMs: number;
}

/**
 * Error during sender recovery
 */
export interface SenderRecoveryError {
  nostrEventId: string;
  error: string;
  timestamp: number;
}

/**
 * Options for sender recovery
 */
export interface SenderRecoveryOptions {
  /** Unix timestamp to start scanning from (default: 30 days ago) */
  since?: number;

  /** Maximum number of events to scan (default: 100) */
  limit?: number;

  /** Relays to query (default: configured Nostr relays) */
  relays?: string[];
}

// ============================================
// Nostr Delivery Queue Extensions
// ============================================

/**
 * Extended entry for instant send delivery queue
 */
export interface InstantSendQueueEntry {
  /** Entry ID */
  id: string;

  /** Outbox entry ID (for tracking) */
  outboxEntryId: string;

  /** Recipient Nostr public key */
  recipientPubkey: string;

  /** Recipient nametag */
  recipientNametag?: string;

  /** Payload JSON to send */
  payloadJson: string;

  /** Associated payment session ID */
  paymentSessionId: string;

  /** Serialized commitment (for background aggregator) */
  commitmentJson?: string;

  /** Retry count */
  retryCount: number;

  /** Creation timestamp */
  createdAt: number;

  /** Nostr event ID (after delivery) */
  nostrEventId?: string;

  /** Completion timestamp */
  completedAt?: number;

  /** Backoff until timestamp */
  backoffUntil?: number;

  /** Last error message */
  lastError?: string;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Create a new payment session
 */
export function createPaymentSession(params: {
  direction: PaymentSessionDirection;
  sourceTokenId?: string;
  recipientNametag?: string;
  recipientPubkey?: string;
  amount?: string;
  coinId?: string;
  salt?: string;
  deadlineMs?: number;
}): PaymentSession {
  const now = Date.now();
  const deadlineMs = params.deadlineMs ?? 300_000; // 5 minutes default

  return {
    id: crypto.randomUUID(),
    direction: params.direction,
    status: 'INITIATED',
    createdAt: now,
    updatedAt: now,
    deadline: now + deadlineMs,
    error: null,
    sourceTokenId: params.sourceTokenId,
    recipientNametag: params.recipientNametag,
    recipientPubkey: params.recipientPubkey,
    amount: params.amount,
    coinId: params.coinId,
    salt: params.salt,
  };
}

/**
 * Check if a payment session has timed out
 */
export function isPaymentSessionTimedOut(session: PaymentSession): boolean {
  if (!session.deadline) return false;
  return Date.now() > session.deadline;
}

/**
 * Check if a payment session is in a terminal state
 */
export function isPaymentSessionTerminal(session: PaymentSession): boolean {
  return session.status === 'COMPLETED' ||
         session.status === 'FAILED' ||
         session.status === 'TIMED_OUT';
}

/**
 * Create a payment session error
 */
export function createPaymentSessionError(
  code: PaymentSessionErrorCode,
  message: string,
  recoverable: boolean = false,
  details?: Record<string, unknown>
): PaymentSessionError {
  return {
    code,
    message,
    timestamp: Date.now(),
    recoverable,
    details,
  };
}

// ============================================
// INSTANT_SPLIT V4 Types (True Nostr-First Split - Dev Mode Only)
// ============================================

/**
 * Bundle payload for INSTANT_SPLIT V4 (Dev Mode Only - True Nostr-First Split)
 *
 * V4 achieves near-zero sender latency (~0.3s) by:
 * 1. Creating ALL commitments locally BEFORE any aggregator submission
 * 2. Persisting via Nostr FIRST
 * 3. Then submitting ALL to aggregator in background
 *
 * Key insight: The aggregator only sees HASHES - it doesn't validate SplitMintReason content.
 * In dev mode, we create mint commitments with reason=null, so the hash doesn't depend on burn proof.
 *
 * NOTE: V4 only works in dev mode. Production requires V5 with proper SplitMintReason.
 *
 * Flow:
 * 1. Sender: create burn commitment (don't submit)
 * 2. Sender: create mint commitments with reason=null (don't submit)
 * 3. Sender: create transfer commitment from mint data (don't submit)
 * 4. Sender: package bundle → send via Nostr → SUCCESS (~0.3s total!)
 * 5. Sender (background): submit burn → wait proof → submit mints → submit transfer
 * 6. Recipient: submit burn (idempotent) → wait proof → submit mint → wait proof →
 *              submit transfer → wait proof → finalize
 */
export interface InstantSplitBundleV4 {
  /** Bundle version - V4 is true Nostr-first (dev mode only) */
  version: '4.0';

  /** Bundle type identifier */
  type: 'INSTANT_SPLIT';

  /**
   * Burn commitment JSON (NOT transaction - no proof yet!)
   * Both sender and recipient submit this to aggregator.
   */
  burnCommitment: string;

  /** Recipient's MintTransactionData JSON (they recreate commitment and submit) */
  recipientMintData: string;

  /**
   * Pre-created TransferCommitment JSON (recipient submits and waits for proof)
   * Created from mint data WITHOUT any proofs.
   */
  transferCommitment: string;

  /** Payment amount (display metadata) */
  amount: string;

  /** Coin ID hex */
  coinId: string;

  /** Token type hex */
  tokenTypeHex: string;

  /** Split group ID for recovery correlation */
  splitGroupId: string;

  /** Sender's pubkey for acknowledgment */
  senderPubkey: string;

  /** Salt for recipient predicate creation (hex) */
  recipientSaltHex: string;

  /** Salt for transfer commitment creation (hex) */
  transferSaltHex: string;
}

// ============================================
// INSTANT_SPLIT V5 Types (Production Mode)
// ============================================

/**
 * Bundle payload for INSTANT_SPLIT V5 (Production Mode)
 *
 * V5 achieves ~2.3s sender latency while working with production aggregators:
 * 1. Create burn commitment, submit to aggregator
 * 2. Wait for burn inclusion proof (~2s - unavoidable)
 * 3. Create mint commitments with proper SplitMintReason (requires burn proof)
 * 4. Create transfer commitment from mint data (no mint proof needed)
 * 5. Package bundle → send via Nostr → SUCCESS (~2.3s total!)
 * 6. Background: submit mints, wait for proofs, save change token, sync IPFS
 *
 * Key difference from V4: V5 includes burn TRANSACTION (with proof) instead of burn commitment.
 * This enables SDK to create proper SplitMintReason that production aggregators require.
 *
 * Security: Burn is proven on-chain before mints can be created, preventing double-spend.
 */
export interface InstantSplitBundleV5 {
  /** Bundle version - V5 is production mode (proper SplitMintReason) */
  version: '5.0';

  /** Bundle type identifier */
  type: 'INSTANT_SPLIT';

  /**
   * Burn TRANSACTION JSON (WITH inclusion proof!)
   * V5 sends the proven burn transaction so recipient can verify burn completed.
   */
  burnTransaction: string;

  /**
   * Recipient's MintTransactionData JSON (contains proper SplitMintReason in V5)
   * The SplitMintReason references the burn transaction.
   */
  recipientMintData: string;

  /**
   * Pre-created TransferCommitment JSON (recipient submits and waits for proof)
   * Created from mint data WITHOUT any proofs.
   */
  transferCommitment: string;

  /** Payment amount (display metadata) */
  amount: string;

  /** Coin ID hex */
  coinId: string;

  /** Token type hex */
  tokenTypeHex: string;

  /** Split group ID for recovery correlation */
  splitGroupId: string;

  /** Sender's pubkey for acknowledgment */
  senderPubkey: string;

  /** Salt for recipient predicate creation (hex) */
  recipientSaltHex: string;

  /** Salt for transfer commitment creation (hex) */
  transferSaltHex: string;

  /**
   * Serialized TokenState JSON for the intermediate minted token.
   *
   * In V5, the mint is to sender's address first, then transferred to recipient.
   * The recipient needs this state to reconstruct the minted token before applying transfer.
   * Without this, the recipient can't create a matching predicate (they don't have sender's signing key).
   */
  mintedTokenStateJson: string;
}

/**
 * Union type for all InstantSplit bundle versions
 */
export type InstantSplitBundle = InstantSplitBundleV4 | InstantSplitBundleV5;

/**
 * Type guard to check if an object is an InstantSplitBundle (V4 or V5)
 */
export function isInstantSplitBundle(obj: unknown): obj is InstantSplitBundle {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const bundle = obj as Record<string, unknown>;

  // Check common fields
  if (bundle.type !== 'INSTANT_SPLIT') return false;
  if (typeof bundle.recipientMintData !== 'string') return false;
  if (typeof bundle.transferCommitment !== 'string') return false;
  if (typeof bundle.amount !== 'string') return false;
  if (typeof bundle.coinId !== 'string') return false;
  if (typeof bundle.splitGroupId !== 'string') return false;
  if (typeof bundle.senderPubkey !== 'string') return false;
  if (typeof bundle.recipientSaltHex !== 'string') return false;
  if (typeof bundle.transferSaltHex !== 'string') return false;

  // Version-specific checks
  if (bundle.version === '4.0') {
    // V4 has burnCommitment (no proof)
    return typeof bundle.burnCommitment === 'string';
  } else if (bundle.version === '5.0') {
    // V5 has burnTransaction (with proof) and mintedTokenStateJson
    return typeof bundle.burnTransaction === 'string' &&
           typeof bundle.mintedTokenStateJson === 'string';
  }

  return false;
}

/**
 * Type guard to check if bundle is V4 (dev mode)
 */
export function isInstantSplitBundleV4(obj: unknown): obj is InstantSplitBundleV4 {
  return isInstantSplitBundle(obj) && obj.version === '4.0';
}

/**
 * Type guard to check if bundle is V5 (production mode)
 */
export function isInstantSplitBundleV5(obj: unknown): obj is InstantSplitBundleV5 {
  return isInstantSplitBundle(obj) && obj.version === '5.0';
}

/**
 * Result from processing an INSTANT_SPLIT bundle
 */
export interface InstantSplitProcessResult {
  /** Whether processing succeeded */
  success: boolean;

  /** The finalized token (if successful) */
  token?: import('../data/model').Token;

  /** Error message (if failed) */
  error?: string;

  /** Processing duration in ms */
  durationMs: number;
}
