# INSTANT_SPLIT Mode Implementation Plan

**Document Version:** 1.0
**Last Updated:** 2026-01-30
**Status:** Ready for Implementation

---

## Executive Summary

This document provides a comprehensive refactoring plan for implementing INSTANT_SPLIT mode based on TOKEN_INVENTORY_SPEC.md Section 15. INSTANT_SPLIT reduces token split latency from ~42 seconds to 2-3 seconds by applying the INSTANT_SEND pattern to splits: create all commitments upfront, deliver via Nostr immediately, and let recipients submit commitments and fetch proofs in the background.

**Key Statistics:**
- Critical path: 2-3 seconds (Nostr delivery only) vs ~42 seconds currently
- Commitments: 3 (burn + 2 mints) created upfront
- Recipients: 2 (payment recipient + sender for change)
- Background phases: Aggregator submission + parallel proof acquisition
- Recovery mechanisms: Sender recovery, recipient orphan recovery, split burn recovery

---

## 1. Type Definitions (InstantTransferTypes.ts)

### 1.1 New Interfaces to Add

#### SplitCommitmentBundle
```typescript
/**
 * Bundle of commitments for a split operation to be delivered via Nostr
 * Per TOKEN_INVENTORY_SPEC.md Section 15.2
 *
 * Contains all commitments (burn + 2 mints) created upfront, before submission.
 * Recipients will submit commitments and fetch proofs in background.
 */
export interface SplitCommitmentBundle {
  /** Unique identifier for this split operation */
  splitGroupId: string;

  /** Source token being split */
  sourceToken: {
    /** Token ID (immutable) */
    tokenId: string;

    /** Current state hash before split */
    currentStateHash: string;

    /** Burn commitment (unsubmitted) */
    burnCommitment: any; // BurnCommitment type from SDK
  };

  /** New tokens from split (payment + change) */
  newTokens: Array<{
    /** Token object (unfinalized, no inclusion proof) */
    token: Token;

    /** Mint commitment (unsubmitted) */
    mintCommitment: any; // MintCommitment type from SDK

    /** Recipient address for this token */
    recipientAddress: string;

    /** Role: payment to external recipient or change back to sender */
    role: 'PAYMENT' | 'CHANGE';
  }>;

  /** Creation timestamp */
  createdAt: number;

  /** Associated payment session for progress tracking */
  paymentSessionId?: string;
}
```

#### InstantSplitPayload
```typescript
/**
 * Nostr message payload for INSTANT_SPLIT token transfer
 * Per TOKEN_INVENTORY_SPEC.md Section 15.9
 *
 * Sent via kind 21066 (INSTANT_SPLIT_TOKEN)
 */
export interface InstantSplitPayload {
  /** Protocol version */
  version: '1.0';

  /** Split metadata */
  splitGroupId: string;
  role: 'PAYMENT' | 'CHANGE';

  /** Token data (unfinalized) */
  token: Token; // SDK Token object, no inclusion proof

  /** Commitment bundle for recipient to submit */
  commitmentBundle: {
    burn: any; // BurnCommitment from SDK
    mint: any; // MintCommitment from SDK
  };

  /** Sender info */
  senderPubkey: string;
  senderNametag?: string;
}
```

#### SplitPaymentSession
```typescript
/**
 * Extensions to PaymentSession for INSTANT_SPLIT tracking
 * Per TOKEN_INVENTORY_SPEC.md Section 15.8
 */
export interface SplitPaymentSession extends PaymentSession {
  /** Session type identifier */
  type: 'DIRECT_TRANSFER' | 'INSTANT_SPLIT';

  /** Split operation ID (when type === 'INSTANT_SPLIT') */
  splitGroupId?: string;

  /** Tokens in this split operation */
  splitTokens?: Array<{
    /** Token ID */
    tokenId: string;

    /** Role: PAYMENT or CHANGE */
    role: 'PAYMENT' | 'CHANGE';

    /** Token status in split lifecycle */
    status: 'PENDING' | 'NOSTR_CONFIRMED' | 'PROOF_ACQUIRED' | 'FAILED';

    /** Recipient address */
    recipientAddress: string;
  }>;
}
```

### 1.2 New Outbox Status Values

Add to `PaymentSessionStatus` type:
```typescript
export type PaymentSessionStatus =
  // Existing values...
  | 'INSTANT_SPLIT_PENDING'      // Split created, awaiting Nostr delivery
  | 'INSTANT_SPLIT_DELIVERED'    // Both tokens sent via Nostr
  | 'AWAITING_PROOFS'            // Commitments submitted, waiting for proofs
  | 'PARTIAL_PROOF'              // Some proofs acquired, others pending;
```

### 1.3 New Helper Functions

```typescript
/**
 * Create a split commitment bundle
 */
export function createSplitCommitmentBundle(params: {
  splitGroupId: string;
  sourceTokenId: string;
  currentStateHash: string;
  burnCommitment: any;
  paymentToken: Token;
  paymentMintCommitment: any;
  paymentRecipientAddress: string;
  changeToken: Token;
  changeMintCommitment: any;
  changeRecipientAddress: string;
  paymentSessionId?: string;
}): SplitCommitmentBundle {
  return {
    splitGroupId: params.splitGroupId,
    sourceToken: {
      tokenId: params.sourceTokenId,
      currentStateHash: params.currentStateHash,
      burnCommitment: params.burnCommitment,
    },
    newTokens: [
      {
        token: params.paymentToken,
        mintCommitment: params.paymentMintCommitment,
        recipientAddress: params.paymentRecipientAddress,
        role: 'PAYMENT',
      },
      {
        token: params.changeToken,
        mintCommitment: params.changeMintCommitment,
        recipientAddress: params.changeRecipientAddress,
        role: 'CHANGE',
      },
    ],
    createdAt: Date.now(),
    paymentSessionId: params.paymentSessionId,
  };
}

/**
 * Check if split is complete (all tokens Nostr-confirmed)
 * Per TOKEN_INVENTORY_SPEC.md Section 15.8
 */
export function isSplitSessionComplete(session: SplitPaymentSession): boolean {
  if (!session.splitTokens) return false;
  return session.splitTokens.every(t =>
    t.status !== 'PENDING' && t.status !== 'FAILED'
  );
}

/**
 * Get split progress metrics
 */
export function getSplitProgress(session: SplitPaymentSession): {
  total: number;
  nostrConfirmed: number;
  fullyConfirmed: number;
  percentComplete: number;
} {
  const tokens = session.splitTokens || [];
  return {
    total: tokens.length,
    nostrConfirmed: tokens.filter(t =>
      t.status === 'NOSTR_CONFIRMED' || t.status === 'PROOF_ACQUIRED'
    ).length,
    fullyConfirmed: tokens.filter(t => t.status === 'PROOF_ACQUIRED').length,
    percentComplete: tokens.length > 0
      ? Math.floor((tokens.filter(t => t.status === 'PROOF_ACQUIRED').length / tokens.length) * 100)
      : 0,
  };
}
```

---

## 2. TokenSplitExecutor.ts Modifications

### 2.1 Add New Option to `executeSplitPlan`

**Current Signature:**
```typescript
async executeSplitPlan(
  plan: SplitPlan,
  recipientAddress: IAddress,
  signingService: SigningService,
  onTokenBurned: (uiId: string) => void,
  outboxContext?: {...},
  persistenceCallbacks?: SplitPersistenceCallbacks
): Promise<{...}>;
```

**New Signature:**
```typescript
async executeSplitPlan(
  plan: SplitPlan,
  recipientAddress: IAddress,
  signingService: SigningService,
  onTokenBurned: (uiId: string) => void,
  outboxContext?: {...},
  persistenceCallbacks?: SplitPersistenceCallbacks,
  /** New: Enable INSTANT_SPLIT mode (default: false) */
  instantMode?: boolean
): Promise<{
  tokensForRecipient: SdkToken<any>[];
  tokensKeptBySender: SdkToken<any>[];
  burnedTokens: any[];
  recipientTransferTxs: TransferTransaction[];
  outboxEntryIds: string[];
  splitGroupId?: string;

  // NEW: For INSTANT_SPLIT mode
  instantSplitBundle?: SplitCommitmentBundle;
  nostrDeliveryPending?: string[]; // Pubkeys to send to
}>;
```

### 2.2 Create New Method: `createSplitCommitmentBundleOnly`

```typescript
/**
 * Create all split commitments upfront without submission (for INSTANT_SPLIT mode)
 * Per TOKEN_INVENTORY_SPEC.md Section 15.3
 *
 * Steps:
 * 1. Validate source token
 * 2. Create burn commitment (unsubmitted)
 * 3. Create mint commitments (unsubmitted)
 * 4. Bundle all commitments
 * 5. Persist to outbox with status INSTANT_SPLIT_PENDING
 * 6. Return bundle and Nostr recipient list
 *
 * @returns {SplitCommitmentBundle, nostrRecipientPubkeys, outboxEntryIds}
 */
private async createSplitCommitmentBundleOnly(
  plan: SplitPlan,
  recipientAddress: IAddress,
  signingService: SigningService,
  uiTokenId: string,
  outboxContext?: {
    walletAddress: string;
    recipientNametag: string;
    recipientPubkey: string;
    ownerPublicKey: string;
  }
): Promise<{
  bundle: SplitCommitmentBundle;
  nostrRecipientPubkeys: Array<{ pubkey: string; role: 'PAYMENT' | 'CHANGE' }>;
  outboxEntryIds: string[];
  splitGroupId: string;
}> {
  // Implementation details in section 2.4
}
```

### 2.3 Modify `executeSingleTokenSplit` Logic

**Current Flow:**
1. Build split → burn commit → burn submit → burn proof
2. Mint recipents → mint submit → mint proof
3. Transfer to recipient → transfer submit → transfer proof

**INSTANT_SPLIT Flow (when `instantMode === true`):**
1. Build split → create all commitments (no submission)
2. Persist bundle to outbox
3. Return early with bundle and Nostr recipients
4. Skip phases 2-5 (submission, proof waiting, transfer)

**Implementation Pattern:**
```typescript
private async executeSingleTokenSplit(
  // ... existing params ...
  instantMode?: boolean
): Promise<SplitTokenResult> {
  // ... existing validation ...

  const splitGroupId = crypto.randomUUID();

  // Build split and create burn
  const burnCommitment = await split.createBurnCommitment(burnSalt, signingService);

  // Create mint commitments
  const mintCommitments = await this.createMintCommitments(...);

  // INSTANT_SPLIT: Early return after commitment creation
  if (instantMode) {
    const bundle = await this.createSplitCommitmentBundleOnly(...);

    // Return early - do NOT submit to aggregator or wait for proofs
    return {
      bundle,
      nostrRecipientPubkeys: [...],
      earlyReturn: true,
    };
  }

  // Normal flow: submit and wait for proofs
  // ... existing logic ...
}
```

### 2.4 Implementation Details: `createSplitCommitmentBundleOnly`

```typescript
private async createSplitCommitmentBundleOnly(
  plan: SplitPlan,
  recipientAddress: IAddress,
  signingService: SigningService,
  uiTokenId: string,
  outboxContext?: {
    walletAddress: string;
    recipientNametag: string;
    recipientPubkey: string;
    ownerPublicKey: string;
  }
): Promise<{
  bundle: SplitCommitmentBundle;
  nostrRecipientPubkeys: Array<{ pubkey: string; role: 'PAYMENT' | 'CHANGE' }>;
  outboxEntryIds: string[];
  splitGroupId: string;
}> {
  const tokenIdHex = Buffer.from(plan.tokenToSplit.sdkToken.id.bytes).toString('hex');
  console.log(`🔪 [INSTANT_SPLIT] Creating commitment bundle for ${tokenIdHex.slice(0, 8)}...`);

  // 1. Verify source token is unspent
  const sourceTokenSpentKey = `${tokenIdHex}:${currentStateHash}`;
  if (this.isTokenSpent(sourceTokenSpentKey)) {
    throw new Error('Source token already spent - cannot split');
  }

  // 2. Get sender address for change token
  const senderAddressRef = await UnmaskedPredicateReference.create(
    plan.tokenToSplit.sdkToken.type,
    signingService.algorithm,
    signingService.publicKey,
    HashAlgorithm.SHA256
  );
  const senderAddress = await senderAddressRef.toAddress();

  // 3. Create burn commitment
  const burnSalt = await sha256(`${tokenIdHex}_burn_salt`);
  const burnCommitment = await split.createBurnCommitment(burnSalt, signingService);
  console.log(`🔥 [INSTANT_SPLIT] Burn commitment created: ${burnCommitment.requestId}`);

  // 4. Create mint commitments (without submission)
  const recipientMintData = await MintTransactionData.create(...);
  const recipientMintCommitment = await MintCommitment.create(recipientMintData);

  const changeMintData = await MintTransactionData.create(...);
  const changeMintCommitment = await MintCommitment.create(changeMintData);

  console.log(`✨ [INSTANT_SPLIT] Mint commitments created (2 total)`);

  // 5. Reconstruct tokens (unfinalized)
  const paymentToken = await this.createAndVerifyToken(
    { commitment: recipientMintCommitment, tokenId: recipientTokenId, salt: recipientSalt },
    signingService,
    'INSTANT_SPLIT Payment Token'
  );

  const changeToken = await this.createAndVerifyToken(
    { commitment: changeMintCommitment, tokenId: senderTokenId, salt: senderSalt },
    signingService,
    'INSTANT_SPLIT Change Token'
  );

  // 6. Create commitment bundle
  const splitGroupId = crypto.randomUUID();
  const currentStateHash = await plan.tokenToSplit.sdkToken.state.calculateHash();

  const bundle: SplitCommitmentBundle = {
    splitGroupId,
    sourceToken: {
      tokenId: plan.tokenToSplit.sdkToken.id,
      currentStateHash: currentStateHash.toJSON(),
      burnCommitment,
    },
    newTokens: [
      {
        token: paymentToken,
        mintCommitment: recipientMintCommitment,
        recipientAddress: recipientAddress.address,
        role: 'PAYMENT',
      },
      {
        token: changeToken,
        mintCommitment: changeMintCommitment,
        recipientAddress: senderAddress.address,
        role: 'CHANGE',
      },
    ],
    createdAt: Date.now(),
  };

  // 7. Persist to outbox
  let outboxEntryIds: string[] = [];
  if (outboxContext) {
    const outboxRepo = OutboxRepository.getInstance();
    outboxRepo.setCurrentAddress(outboxContext.walletAddress);

    // Create outbox entry for the bundle
    const bundleEntry = createOutboxEntry(
      'INSTANT_SPLIT',
      uiTokenId,
      outboxContext.recipientNametag,
      outboxContext.recipientPubkey,
      JSON.stringify({ ...recipientAddress.toJSON() }),
      plan.splitAmount.toString(),
      Buffer.from(plan.coinId).toString('hex'),
      Buffer.from(burnSalt).toString('hex'),
      JSON.stringify(plan.tokenToSplit.sdkToken.toJSON()),
      JSON.stringify(bundle) // Store entire bundle
    );

    bundleEntry.status = 'INSTANT_SPLIT_PENDING';
    outboxRepo.addEntry(bundleEntry);
    outboxEntryIds.push(bundleEntry.id);

    console.log(`📤 [INSTANT_SPLIT] Outbox entry created: ${bundleEntry.id.slice(0, 8)}`);
  }

  // 8. Return bundle with Nostr recipient list
  return {
    bundle,
    nostrRecipientPubkeys: [
      { pubkey: outboxContext?.recipientPubkey || '', role: 'PAYMENT' },
      { pubkey: outboxContext?.ownerPublicKey || '', role: 'CHANGE' },
    ],
    outboxEntryIds,
    splitGroupId,
  };
}
```

### 2.5 Modify Return Type Extension

```typescript
interface SplitTokenResult {
  tokenForRecipient: SdkToken<any>;
  tokenForSender: SdkToken<any>;
  recipientTransferTx: TransferTransaction;
  outboxEntryId?: string;
  splitGroupId?: string;

  // NEW for INSTANT_SPLIT
  instantSplitBundle?: SplitCommitmentBundle;
  nostrRecipientPubkeys?: Array<{ pubkey: string; role: 'PAYMENT' | 'CHANGE' }>;
  instantModeEarlyReturn?: boolean;
}
```

---

## 3. NostrService.ts Modifications

### 3.1 Add New Event Kind Constant

```typescript
// Add to top of file with other kind definitions
const INSTANT_SPLIT_TOKEN_KIND = 21066; // Per TOKEN_INVENTORY_SPEC.md Section 15.9
```

### 3.2 Add `sendInstantSplitToken` Method

```typescript
/**
 * Send a token via INSTANT_SPLIT mode to recipient
 * Per TOKEN_INVENTORY_SPEC.md Section 15.3
 *
 * Sends unfinalized token with commitment bundle for recipient to submit.
 *
 * @param recipientPubkey - Recipient's Nostr public key (or sender's for change)
 * @param payload - InstantSplitPayload to send
 * @returns Event ID from Nostr relay
 */
async sendInstantSplitToken(
  recipientPubkey: string,
  payload: InstantSplitPayload
): Promise<string> {
  if (!this.client) await this.start();

  try {
    const payloadJson = JSON.stringify(payload);

    console.log(`📤 [INSTANT_SPLIT] Sending to ${recipientPubkey.slice(0, 8)}... (role: ${payload.role})`);

    // Use SDK's TokenTransferProtocol to encrypt and send
    const eventId = await this.client?.sendTokenTransfer(
      recipientPubkey,
      payloadJson,
      {
        amount: undefined, // No amount metadata for INSTANT_SPLIT
        symbol: undefined,
      }
    );

    if (!eventId) {
      throw new Error('Failed to send INSTANT_SPLIT token - no event ID returned');
    }

    console.log(`✅ [INSTANT_SPLIT] Sent to ${recipientPubkey.slice(0, 8)} - event ${eventId.slice(0, 8)}`);
    return eventId;
  } catch (error) {
    console.error(`❌ [INSTANT_SPLIT] Failed to send:`, error);
    throw error;
  }
}
```

### 3.3 Add Handler in `subscribeToPrivateEvents`

```typescript
/**
 * Add to existing subscription setup:
 * Subscribe to INSTANT_SPLIT tokens (kind 21066)
 */
private subscribeToPrivateEvents(publicKey: string) {
  // ... existing code ...

  // NEW: Subscribe to INSTANT_SPLIT tokens
  const splitFilter = new Filter();
  splitFilter.kinds = [INSTANT_SPLIT_TOKEN_KIND];
  splitFilter["#p"] = [publicKey];
  splitFilter.since = lastSync;

  this.client.subscribe(splitFilter, {
    onEvent: (event) => this.handleSubscriptionEvent(event, true),
    onEndOfStoredEvents: () => {
      console.log("End of stored INSTANT_SPLIT events");
    },
  });
}
```

### 3.4 Add Handler in `handleIncomingEvent`

```typescript
/**
 * Add to handleIncomingEvent switch statement:
 */
private async handleIncomingEvent(event: Event): Promise<{ success: boolean; token?: UiToken }> {
  // ... existing cases ...

  if (event.kind === INSTANT_SPLIT_TOKEN_KIND) {
    console.log("Received INSTANT_SPLIT token");
    const tokens = await this.handleInstantSplitToken(event);
    return { success: tokens && tokens.length > 0, token: tokens?.[0] };
  }

  // ... rest of function ...
}
```

### 3.5 Implement `handleInstantSplitToken`

```typescript
/**
 * Handle incoming INSTANT_SPLIT token from Nostr
 * Per TOKEN_INVENTORY_SPEC.md Section 15.4
 *
 * Decrypts payload and queues for background submission + proof fetching
 *
 * @returns Array of UI tokens saved to localStorage
 */
private async handleInstantSplitToken(event: Event): Promise<UiToken[]> {
  try {
    const keyManager = await this.getKeyManager();
    if (!keyManager) {
      console.error("KeyManager is undefined for INSTANT_SPLIT decryption");
      return [];
    }

    // Decrypt using TokenTransferProtocol (supports general encrypted tokens)
    const payloadJson = await TokenTransferProtocol.parseTokenTransfer(
      event,
      keyManager
    );

    let payload: InstantSplitPayload;
    try {
      payload = JSON.parse(payloadJson);
    } catch (parseErr) {
      console.error("Failed to parse INSTANT_SPLIT payload:", parseErr);
      return [];
    }

    // Validate payload structure
    if (!payload.token || !payload.commitmentBundle || !payload.splitGroupId) {
      console.error("Invalid INSTANT_SPLIT payload - missing required fields");
      return [];
    }

    console.log(`📦 [INSTANT_SPLIT] Received from ${payload.senderPubkey.slice(0, 8)} (role: ${payload.role})`);

    // Phase 1: Save token immediately to localStorage (unconfirmed)
    const uiToken = await this.saveReceivedToken(payload.token, payload.senderPubkey);
    if (!uiToken) {
      return [];
    }

    console.log(`💾 [INSTANT_SPLIT] Token ${uiToken.id.slice(0, 8)} saved immediately`);

    // Phase 2: Queue for background commitment submission + proof fetching
    try {
      const { InventoryBackgroundLoopsManager } = await import("./InventoryBackgroundLoops");
      const loopsManager = InventoryBackgroundLoopsManager.getInstance(this.identityManager);

      if (!loopsManager.isReady()) {
        await loopsManager.initialize();
      }

      const splitQueue = loopsManager.getSplitCommitmentQueue();
      if (splitQueue) {
        // Queue the commitment bundle for background processing
        await splitQueue.queueSplitCommitmentBundle({
          splitGroupId: payload.splitGroupId,
          role: payload.role,
          token: uiToken,
          commitmentBundle: payload.commitmentBundle,
          senderPubkey: payload.senderPubkey,
          timestamp: Date.now(),
        });

        console.log(`📥 [INSTANT_SPLIT] Queued for background submission`);
      }
    } catch (err) {
      console.error("Failed to queue INSTANT_SPLIT for background processing:", err);
      // Continue - token is saved locally anyway
    }

    return [uiToken];
  } catch (error) {
    console.error("Failed to handle INSTANT_SPLIT token:", error);
    return [];
  }
}
```

---

## 4. PaymentSessionManager.ts Extensions

### 4.1 Support SplitPaymentSession Type

**Modification to `createSession` method:**
```typescript
/**
 * Add parameter to createSession:
 */
createSession(params: CreateSessionParams & {
  /** Session type: DIRECT_TRANSFER or INSTANT_SPLIT */
  type?: 'DIRECT_TRANSFER' | 'INSTANT_SPLIT';

  /** For INSTANT_SPLIT: split group ID */
  splitGroupId?: string;

  /** For INSTANT_SPLIT: tokens involved in split */
  splitTokens?: Array<{
    tokenId: string;
    role: 'PAYMENT' | 'CHANGE';
    recipientAddress: string;
  }>;
}): PaymentSession {
  const session = createPaymentSession({...params});

  // Add INSTANT_SPLIT extensions if type specified
  if (params.type === 'INSTANT_SPLIT') {
    (session as SplitPaymentSession).type = 'INSTANT_SPLIT';
    (session as SplitPaymentSession).splitGroupId = params.splitGroupId;
    (session as SplitPaymentSession).splitTokens = params.splitTokens?.map(t => ({
      ...t,
      status: 'PENDING',
    }));
  }

  return session;
}
```

### 4.2 Add Split-Specific Status Updates

```typescript
/**
 * Update split token status within a INSTANT_SPLIT session
 * Per TOKEN_INVENTORY_SPEC.md Section 15.8
 */
updateSplitTokenStatus(
  sessionId: string,
  tokenId: string,
  status: 'PENDING' | 'NOSTR_CONFIRMED' | 'PROOF_ACQUIRED' | 'FAILED'
): void {
  const session = this.sessions.get(sessionId) as SplitPaymentSession;
  if (!session || session.type !== 'INSTANT_SPLIT') return;

  const token = session.splitTokens?.find(t => t.tokenId === tokenId);
  if (!token) return;

  token.status = status;
  session.updatedAt = Date.now();

  // Check if session complete (all tokens Nostr-confirmed)
  const allConfirmed = session.splitTokens?.every(t =>
    t.status !== 'PENDING' && t.status !== 'FAILED'
  );

  if (allConfirmed && session.status !== 'COMPLETED') {
    this.advancePhase(sessionId, 'COMPLETED');
  }

  this.notifyListeners(sessionId, session);
}

/**
 * Get split progress
 */
getSplitProgress(sessionId: string): {
  total: number;
  nostrConfirmed: number;
  fullyConfirmed: number;
} | null {
  const session = this.sessions.get(sessionId) as SplitPaymentSession;
  if (!session?.splitTokens) return null;

  return {
    total: session.splitTokens.length,
    nostrConfirmed: session.splitTokens.filter(t =>
      t.status === 'NOSTR_CONFIRMED' || t.status === 'PROOF_ACQUIRED'
    ).length,
    fullyConfirmed: session.splitTokens.filter(t =>
      t.status === 'PROOF_ACQUIRED'
    ).length,
  };
}
```

---

## 5. InventoryBackgroundLoops.ts Modifications

### 5.1 Add New Queue Classes

#### SplitCommitmentQueue

```typescript
/**
 * Queues split commitment bundles for background submission + proof fetching
 * Per TOKEN_INVENTORY_SPEC.md Section 15.4
 *
 * Flow:
 * 1. Recipient receives INSTANT_SPLIT_TOKEN event via Nostr
 * 2. Token saved to localStorage immediately
 * 3. Commitment bundle queued to this queue
 * 4. Background: submit burn first, then mints in parallel
 * 5. Background: fetch proofs in parallel
 * 6. Attach proofs to tokens and update localStorage
 */
export class SplitCommitmentQueue {
  private queue: Array<{
    splitGroupId: string;
    role: 'PAYMENT' | 'CHANGE';
    token: Token;
    commitmentBundle: {
      burn: any;
      mint: any;
    };
    senderPubkey: string;
    timestamp: number;
  }> = [];

  private isProcessing = false;
  private config: LoopConfig;
  private identityManager: IdentityManager;

  constructor(identityManager: IdentityManager, config: LoopConfig = DEFAULT_LOOP_CONFIG) {
    this.identityManager = identityManager;
    this.config = config;
  }

  /**
   * Queue a split commitment bundle for processing
   */
  async queueSplitCommitmentBundle(item: {
    splitGroupId: string;
    role: 'PAYMENT' | 'CHANGE';
    token: Token;
    commitmentBundle: { burn: any; mint: any };
    senderPubkey: string;
    timestamp: number;
  }): Promise<void> {
    this.queue.push(item);
    console.log(`📤 [SplitQueue] Queued ${item.role} token (queue size: ${this.queue.length})`);

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue().catch(err => {
        console.error('❌ [SplitQueue] Processing error:', err);
      });
    }
  }

  /**
   * Process queued commitments
   * Implements TOKEN_INVENTORY_SPEC.md Section 15.4 Phases 2-3
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) continue;

      try {
        await this.processSplitCommitmentBundle(item);
      } catch (err) {
        console.error(`❌ [SplitQueue] Failed to process ${item.role} token:`, err);
        // Requeue for retry with exponential backoff
        setTimeout(() => {
          this.queue.push(item);
        }, Math.min(30000, (item.timestamp - Date.now()) * 2));
      }

      // Yield to event loop
      await new Promise(r => setTimeout(r, 100));
    }

    this.isProcessing = false;
  }

  /**
   * Process single split commitment bundle
   * Per TOKEN_INVENTORY_SPEC.md Section 15.4 Steps 2-3
   */
  private async processSplitCommitmentBundle(item: {
    splitGroupId: string;
    role: 'PAYMENT' | 'CHANGE';
    token: Token;
    commitmentBundle: { burn: any; mint: any };
    senderPubkey: string;
    timestamp: number;
  }): Promise<void> {
    const { splitGroupId, role, commitmentBundle } = item;
    console.log(`📤 [SplitQueue] Processing ${role} token from split ${splitGroupId.slice(0, 8)}`);

    const client = ServiceProvider.stateTransitionClient;

    try {
      // Phase 2: Submit commitments (burn first, mints in parallel)
      console.log(`📤 [SplitQueue] Submitting burn commitment...`);
      const burnRes = await client.submitMintCommitment(commitmentBundle.burn);

      if (burnRes.status !== 'SUCCESS' && burnRes.status !== 'REQUEST_ID_EXISTS') {
        throw new Error(`Burn submission failed: ${burnRes.status}`);
      }

      console.log(`📤 [SplitQueue] Submitting mint commitment...`);
      const mintRes = await client.submitMintCommitment(commitmentBundle.mint);

      if (mintRes.status !== 'SUCCESS' && mintRes.status !== 'REQUEST_ID_EXISTS') {
        throw new Error(`Mint submission failed: ${mintRes.status}`);
      }

      // Phase 3: Fetch proofs in parallel
      console.log(`⏳ [SplitQueue] Fetching proofs...`);
      const { waitInclusionProofWithDevBypass } = await import('../../../../utils/devTools');

      const [burnProof, mintProof] = await Promise.all([
        waitInclusionProofWithDevBypass(commitmentBundle.burn, 60000),
        waitInclusionProofWithDevBypass(commitmentBundle.mint, 60000),
      ]);

      console.log(`✅ [SplitQueue] Proofs acquired for ${role} token`);

      // Update token with proofs and save to localStorage
      // This requires token modification API from SDK
      // Implementation depends on SDK capabilities

      // Emit event to notify completion
      window.dispatchEvent(new CustomEvent('split-proof-acquired', {
        detail: { splitGroupId, role, tokenId: item.token.id },
      }));
    } catch (err) {
      console.error(`❌ [SplitQueue] Processing failed for ${role}:`, err);
      throw err;
    }
  }
}
```

### 5.2 Add Queue to InventoryBackgroundLoopsManager

```typescript
export class InventoryBackgroundLoopsManager {
  // ... existing fields ...

  private splitCommitmentQueue: SplitCommitmentQueue | null = null;

  // ... existing methods ...

  /**
   * Get or create split commitment queue
   */
  getSplitCommitmentQueue(): SplitCommitmentQueue {
    if (!this.splitCommitmentQueue) {
      this.splitCommitmentQueue = new SplitCommitmentQueue(
        this.identityManager,
        this.config
      );
    }
    return this.splitCommitmentQueue;
  }

  /**
   * Cleanup in shutdown
   */
  private async cleanupLoops(): Promise<void> {
    // ... existing cleanup ...
    // No additional cleanup needed for split queue
  }
}
```

---

## 6. New Files to Create

### 6.1 SplitCommitmentService.ts

**Location:** `/home/vrogojin/sphere/src/components/wallet/L3/services/SplitCommitmentService.ts`

**Purpose:** Manage split commitment submission and proof fetching lifecycle

```typescript
/**
 * Split Commitment Service
 *
 * Manages background submission of split commitments to aggregator and
 * proof acquisition for both payment and change tokens.
 *
 * Per TOKEN_INVENTORY_SPEC.md Section 15.4 (Recipient Flow)
 */

import type { SplitCommitmentBundle } from '../types/InstantTransferTypes';
import { ServiceProvider } from './ServiceProvider';
import { PaymentSessionManager } from './PaymentSessionManager';

export class SplitCommitmentService {
  private static instance: SplitCommitmentService;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): SplitCommitmentService {
    if (!SplitCommitmentService.instance) {
      SplitCommitmentService.instance = new SplitCommitmentService();
    }
    return SplitCommitmentService.instance;
  }

  /**
   * Submit split commitments to aggregator
   * Per TOKEN_INVENTORY_SPEC.md Section 15.4 Phase 2
   *
   * Order: burn first, then mints in parallel
   */
  async submitSplitCommitments(bundle: SplitCommitmentBundle): Promise<{
    burnRequestId: string;
    mintRequestIds: string[];
  }> {
    const client = ServiceProvider.stateTransitionClient;

    console.log(`📤 [SplitCommit] Submitting commitments for split ${bundle.splitGroupId.slice(0, 8)}`);

    try {
      // Submit burn first (required before mints)
      console.log(`📤 [SplitCommit] Submitting burn commitment...`);
      const burnRes = await client.submitBurnCommitment(bundle.sourceToken.burnCommitment);

      if (burnRes.status !== 'SUCCESS' && burnRes.status !== 'REQUEST_ID_EXISTS') {
        throw new Error(`Burn submission failed: ${burnRes.status}`);
      }

      const burnRequestId = burnRes.requestId;

      // Submit both mints in parallel
      console.log(`📤 [SplitCommit] Submitting mint commitments (parallel)...`);
      const mintResults = await Promise.allSettled(
        bundle.newTokens.map(nt =>
          client.submitMintCommitment(nt.mintCommitment)
        )
      );

      const mintRequestIds: string[] = [];
      for (let i = 0; i < mintResults.length; i++) {
        const result = mintResults[i];
        if (result.status === 'rejected') {
          throw new Error(`Mint ${i} submission failed: ${result.reason}`);
        }

        const { status, requestId } = result.value;
        if (status !== 'SUCCESS' && status !== 'REQUEST_ID_EXISTS') {
          throw new Error(`Mint ${i} submission failed: ${status}`);
        }

        mintRequestIds.push(requestId);
      }

      console.log(`✅ [SplitCommit] All commitments submitted`);

      return { burnRequestId, mintRequestIds };
    } catch (err) {
      console.error(`❌ [SplitCommit] Submission failed:`, err);
      throw err;
    }
  }

  /**
   * Fetch proofs for split commitments
   * Per TOKEN_INVENTORY_SPEC.md Section 15.4 Phase 3
   *
   * Fetches burn proof first, then mint proofs in parallel
   */
  async fetchSplitProofs(requestIds: {
    burn: string;
    mints: string[];
  }): Promise<{
    burnProof: any;
    mintProofs: any[];
  }> {
    console.log(`⏳ [SplitCommit] Fetching proofs...`);

    const { waitInclusionProofWithDevBypass } = await import('../../../../utils/devTools');

    try {
      // Fetch burn proof first
      console.log(`⏳ [SplitCommit] Fetching burn proof...`);
      const burnProof = await waitInclusionProofWithDevBypass(
        { requestId: requestIds.burn },
        60000
      );

      // Fetch mint proofs in parallel
      console.log(`⏳ [SplitCommit] Fetching mint proofs (parallel)...`);
      const mintProofs = await Promise.all(
        requestIds.mints.map(id =>
          waitInclusionProofWithDevBypass({ requestId: id }, 60000)
        )
      );

      console.log(`✅ [SplitCommit] All proofs acquired`);

      return { burnProof, mintProofs };
    } catch (err) {
      console.error(`❌ [SplitCommit] Proof acquisition failed:`, err);
      throw err;
    }
  }

  /**
   * Complete split operation by attaching proofs and updating tokens
   * Per TOKEN_INVENTORY_SPEC.md Section 15.4 Phase 3
   */
  async completeSplitWithProofs(
    bundle: SplitCommitmentBundle,
    proofs: { burnProof: any; mintProofs: any[] }
  ): Promise<void> {
    console.log(`💾 [SplitCommit] Completing split with proofs...`);

    // Implementation depends on SDK's proof attachment API
    // This is a placeholder for the actual implementation

    // 1. Attach proofs to tokens
    // 2. Update localStorage with finalized tokens
    // 3. Emit completion event
    // 4. Update payment session status

    window.dispatchEvent(new CustomEvent('split-completed', {
      detail: { splitGroupId: bundle.splitGroupId },
    }));

    console.log(`✅ [SplitCommit] Split completed with proofs`);
  }
}
```

### 6.2 SplitRecoveryService.ts

**Location:** `/home/vrogojin/sphere/src/components/wallet/L3/services/SplitRecoveryService.ts`

**Purpose:** Recover split operations from orphaned bundles and failed submissions

```typescript
/**
 * Split Recovery Service
 *
 * Handles recovery scenarios:
 * 1. Recipient orphaned splits (bundles not submitted yet)
 * 2. Split burn recovery (burn succeeded but all mints failed)
 * 3. Partial proof acquisition (some proofs missing)
 *
 * Per TOKEN_INVENTORY_SPEC.md Section 15.6
 */

import type { SplitCommitmentBundle } from '../types/InstantTransferTypes';
import { ServiceProvider } from './ServiceProvider';
import { SplitCommitmentService } from './SplitCommitmentService';

export class SplitRecoveryService {
  private static instance: SplitRecoveryService;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): SplitRecoveryService {
    if (!SplitRecoveryService.instance) {
      SplitRecoveryService.instance = new SplitRecoveryService();
    }
    return SplitRecoveryService.instance;
  }

  /**
   * Recover orphaned split bundles on app startup
   * Per TOKEN_INVENTORY_SPEC.md Section 15.6.2
   *
   * Detects bundles in INSTANT_SPLIT_PENDING or AWAITING_PROOFS status
   * and resumes from current state
   */
  async recoverOrphanedSplits(): Promise<{
    recovered: number;
    failed: number;
  }> {
    console.log(`🔄 [SplitRecovery] Scanning for orphaned splits...`);

    // Implementation:
    // 1. Load outbox entries with status INSTANT_SPLIT_PENDING or AWAITING_PROOFS
    // 2. For each entry:
    //    a. Check burn submission status
    //    b. If not submitted: submit all
    //    c. If submitted, check mint status
    //    d. If not submitted: submit mints
    //    e. Check proof status
    //    f. If not acquired: fetch proofs
    // 3. Return recovery statistics

    let recovered = 0;
    let failed = 0;

    try {
      // Load orphaned splits from outbox
      // const orphans = await loadOutboxEntries({...});

      // for (const entry of orphans) {
      //   try {
      //     await this.recoverSingleSplit(entry);
      //     recovered++;
      //   } catch (err) {
      //     console.error(`❌ Failed to recover split:`, err);
      //     failed++;
      //   }
      // }
    } catch (err) {
      console.error(`❌ [SplitRecovery] Recovery failed:`, err);
    }

    console.log(`✅ [SplitRecovery] Recovered: ${recovered}, Failed: ${failed}`);
    return { recovered, failed };
  }

  /**
   * Recover single orphaned split
   * Per TOKEN_INVENTORY_SPEC.md Section 15.6.2
   */
  private async recoverSingleSplit(bundle: SplitCommitmentBundle): Promise<void> {
    const { splitGroupId } = bundle;
    console.log(`🔄 [SplitRecovery] Recovering split ${splitGroupId.slice(0, 8)}`);

    // Implementation:
    // 1. Check burn commitment status
    // 2. If not submitted: submit burn + mints
    // 3. If submitted: check mints
    // 4. If mints not submitted: submit mints
    // 5. Check proofs
    // 6. If proofs not acquired: fetch proofs
    // 7. Update outbox and localStorage
  }

  /**
   * Handle split burn recovery (burn succeeded but all mints failed)
   * Per TOKEN_INVENTORY_SPEC.md Section 15.6.3
   */
  async recoverSplitBurnFailure(
    bundle: SplitCommitmentBundle,
    reason: string
  ): Promise<{
    action: string;
    recoveryMintCreated: boolean;
  }> {
    console.log(`🔥 [SplitRecovery] Handling burn recovery: ${reason}`);

    // Implementation:
    // 1. Verify burn was included (burned)
    // 2. Create recovery mint for total failed amount
    // 3. Submit recovery mint with unlimited retries
    // 4. Mark split as PARTIALLY_RECOVERED
    // 5. Notify user

    return {
      action: 'RECOVERY_MINT_CREATED',
      recoveryMintCreated: true,
    };
  }
}
```

---

## 7. Existing Service Modifications

### 7.1 SenderRecoveryService.ts Extensions

**File:** `/home/vrogojin/sphere/src/components/wallet/L3/services/SenderRecoveryService.ts`

**Add Method:**
```typescript
/**
 * Recover INSTANT_SPLIT tokens from Nostr
 * Per TOKEN_INVENTORY_SPEC.md Section 15.6.1
 *
 * Queries Nostr for INSTANT_SPLIT events sent by wallet
 * and recovers both payment and change tokens
 */
async recoverInstantSplitTokens(options: RecoveryOptions): Promise<{
  paymentTokensRecovered: number;
  changeTokensRecovered: number;
  errors: SenderRecoveryError[];
}> {
  console.log(`🔄 [SenderRecovery] Scanning for INSTANT_SPLIT tokens...`);

  const INSTANT_SPLIT_TOKEN_KIND = 21066;
  const identity = await this.identityManager.getCurrentIdentity();
  if (!identity) throw new Error('No identity for recovery');

  try {
    // Query Nostr for INSTANT_SPLIT events
    const events = await this.nostrService.queryEvents({
      authors: [identity.publicKey],
      kinds: [INSTANT_SPLIT_TOKEN_KIND],
      since: options.since || (Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60),
      limit: options.limit || 100,
      relays: options.relays,
    });

    console.log(`📥 Found ${events.length} INSTANT_SPLIT events`);

    let paymentTokensRecovered = 0;
    let changeTokensRecovered = 0;
    const errors: SenderRecoveryError[] = [];

    for (const event of events) {
      try {
        const payload: InstantSplitPayload = await this.decryptPayload(event);

        if (payload.role === 'PAYMENT') {
          // Add to Sent folder (token was sent)
          await this.addToSentFolder(payload.token, {
            splitGroupId: payload.splitGroupId,
            role: 'PAYMENT',
          });
          paymentTokensRecovered++;
        } else if (payload.role === 'CHANGE') {
          // Add to Active folder (change token received)
          await this.addToActiveFolder(payload.token, {
            splitGroupId: payload.splitGroupId,
            role: 'CHANGE',
          });
          changeTokensRecovered++;
        }
      } catch (err) {
        errors.push({
          nostrEventId: event.id,
          error: err instanceof Error ? err.message : String(err),
          timestamp: Date.now(),
        });
      }
    }

    console.log(`✅ [SenderRecovery] INSTANT_SPLIT recovery: ${paymentTokensRecovered} payment + ${changeTokensRecovered} change`);

    return {
      paymentTokensRecovered,
      changeTokensRecovered,
      errors,
    };
  } catch (err) {
    console.error(`❌ [SenderRecovery] INSTANT_SPLIT recovery failed:`, err);
    throw err;
  }
}
```

### 7.2 OutboxRecoveryService.ts Extensions

**File:** `/home/vrogojin/sphere/src/components/wallet/L3/services/OutboxRecoveryService.ts`

**Add Support:**
```typescript
/**
 * Add to recovery workflow to handle INSTANT_SPLIT entries
 */
async recoverOutboxEntry(entry: OutboxEntry): Promise<void> {
  // Add case for INSTANT_SPLIT status
  if (entry.status === 'INSTANT_SPLIT_PENDING') {
    // Delegate to SplitRecoveryService
    const splitRecovery = SplitRecoveryService.getInstance();
    const bundle = JSON.parse(entry.commitmentJson) as SplitCommitmentBundle;
    await splitRecovery.recoverSingleSplit(bundle);
  } else if (entry.status === 'AWAITING_PROOFS') {
    // Continue proof acquisition
    const splitRecovery = SplitRecoveryService.getInstance();
    const bundle = JSON.parse(entry.commitmentJson) as SplitCommitmentBundle;
    // Fetch proofs and update
  }

  // ... existing logic ...
}
```

---

## 8. Test Files to Create/Modify

### 8.1 TokenSplitExecutor.test.ts

**Location:** `/home/vrogojin/sphere/tests/unit/components/wallet/L3/services/TokenSplitExecutor.test.ts`

**Add Tests:**
```typescript
describe('TokenSplitExecutor - INSTANT_SPLIT Mode', () => {
  describe('executeSplitPlan with instantMode=true', () => {
    it('should create commitment bundle without submission', async () => {
      // Test that commitments are created but not submitted
      // Test that bundle is persisted to outbox
      // Test that return includes bundle and Nostr recipients
    });

    it('should return early without waiting for proofs', async () => {
      // Test that no proof waiting occurs
      // Test that execution completes in < 1 second
    });

    it('should handle sender's change token identically to payment', async () => {
      // Test that change token role is 'CHANGE'
      // Test that sender address is set correctly
    });
  });

  describe('createSplitCommitmentBundleOnly', () => {
    it('should create burn and mint commitments', async () => {
      // Test burn commitment creation
      // Test both mint commitments
    });

    it('should persist bundle to outbox with INSTANT_SPLIT_PENDING status', async () => {
      // Test outbox entry creation
      // Test status is INSTANT_SPLIT_PENDING
    });

    it('should validate source token is unspent', async () => {
      // Test error on already-spent token
    });
  });
});
```

### 8.2 NostrService.test.ts

**Add Tests:**
```typescript
describe('NostrService - INSTANT_SPLIT', () => {
  describe('sendInstantSplitToken', () => {
    it('should send payload via Nostr with correct structure', async () => {
      // Test payload encryption and delivery
    });

    it('should return event ID from relay', async () => {
      // Test event ID extraction
    });
  });

  describe('handleInstantSplitToken', () => {
    it('should save token immediately to localStorage', async () => {
      // Test immediate persistence
    });

    it('should queue commitment bundle for background processing', async () => {
      // Test queue addition
    });

    it('should handle both PAYMENT and CHANGE roles', async () => {
      // Test role-specific handling
    });
  });
});
```

### 8.3 SplitCommitmentService.test.ts (New)

**Location:** `/home/vrogojin/sphere/tests/unit/components/wallet/L3/services/SplitCommitmentService.test.ts`

```typescript
describe('SplitCommitmentService', () => {
  describe('submitSplitCommitments', () => {
    it('should submit burn first, then mints in parallel', async () => {
      // Test submission order
      // Test parallel mint submission
    });

    it('should handle REQUEST_ID_EXISTS idempotently', async () => {
      // Test idempotent handling
    });

    it('should throw on submission failure', async () => {
      // Test error handling
    });
  });

  describe('fetchSplitProofs', () => {
    it('should fetch burn proof first', async () => {
      // Test burn proof fetch order
    });

    it('should fetch mint proofs in parallel', async () => {
      // Test parallel proof fetch
    });

    it('should timeout after 60 seconds', async () => {
      // Test timeout behavior
    });
  });

  describe('completeSplitWithProofs', () => {
    it('should attach proofs to tokens', async () => {
      // Test proof attachment
    });

    it('should update localStorage with finalized tokens', async () => {
      // Test localStorage update
    });
  });
});
```

### 8.4 SplitRecoveryService.test.ts (New)

**Location:** `/home/vrogojin/sphere/tests/unit/components/wallet/L3/services/SplitRecoveryService.test.ts`

```typescript
describe('SplitRecoveryService', () => {
  describe('recoverOrphanedSplits', () => {
    it('should detect splits in INSTANT_SPLIT_PENDING status', async () => {
      // Test detection
    });

    it('should resume from current submission state', async () => {
      // Test state detection and resumption
    });

    it('should return recovery statistics', async () => {
      // Test return value structure
    });
  });

  describe('recoverSplitBurnFailure', () => {
    it('should create recovery mint when burn succeeded', async () => {
      // Test recovery mint creation
    });

    it('should submit recovery mint with unlimited retries', async () => {
      // Test unlimited retry behavior
    });
  });
});
```

---

## 9. Implementation Order and Dependencies

### Phase 1: Foundation (Days 1-2)
1. **InstantTransferTypes.ts** - Add type definitions
   - SplitCommitmentBundle
   - InstantSplitPayload
   - Helper functions
   - Outbox status values

2. **PaymentSessionManager.ts** - Add INSTANT_SPLIT support
   - Accept type parameter in createSession
   - Add split-specific update methods
   - Test: PaymentSessionManager

### Phase 2: Core Sender Flow (Days 3-5)
3. **TokenSplitExecutor.ts** - Add INSTANT_SPLIT execution
   - Modify executeSplitPlan signature
   - Add createSplitCommitmentBundleOnly method
   - Add instantMode parameter handling
   - Test: TokenSplitExecutor

4. **NostrService.ts** - Add INSTANT_SPLIT delivery
   - Add sendInstantSplitToken method
   - Add INSTANT_SPLIT_TOKEN_KIND constant
   - Test: NostrService

### Phase 3: Core Recipient Flow (Days 6-8)
5. **InventoryBackgroundLoops.ts** - Add SplitCommitmentQueue
   - Create SplitCommitmentQueue class
   - Integrate with InventoryBackgroundLoopsManager
   - Add queue getter method

6. **SplitCommitmentService.ts** - Create new file
   - submitSplitCommitments method
   - fetchSplitProofs method
   - completeSplitWithProofs method
   - Test: SplitCommitmentService

7. **NostrService.ts** - Add recipient handling
   - handleInstantSplitToken method
   - Subscribe to INSTANT_SPLIT_TOKEN_KIND
   - Integration with background loops

### Phase 4: Recovery Mechanisms (Days 9-10)
8. **SplitRecoveryService.ts** - Create new file
   - recoverOrphanedSplits method
   - recoverSingleSplit method
   - recoverSplitBurnFailure method
   - Test: SplitRecoveryService

9. **SenderRecoveryService.ts** - Extend existing
   - Add recoverInstantSplitTokens method
   - Handle INSTANT_SPLIT role-specific recovery

10. **OutboxRecoveryService.ts** - Extend existing
    - Add INSTANT_SPLIT_PENDING handling
    - Add AWAITING_PROOFS handling

### Phase 5: Integration & Testing (Days 11-13)
11. Write comprehensive integration tests
12. Create UI components for progress display
13. Performance benchmarking and optimization
14. Edge case testing

---

## 10. Risk Assessment

### HIGH RISK
1. **Commitment Bundle Atomicity**
   - Risk: Partial delivery (payment sent, change not sent)
   - Mitigation: Queue change token send immediately after payment; retry on failure
   - Test: Multiple Nostr delivery failure scenarios

2. **Proof Acquisition Timeout**
   - Risk: Tokens stuck in PENDING_PROOF state indefinitely
   - Mitigation: Unlimited retry with exponential backoff; manual recovery UI
   - Test: Aggregator unavailability scenarios

3. **Orphaned Bundle Recovery**
   - Risk: Browser crash during background submission
   - Mitigation: Outbox persistence with clear status transitions
   - Test: Power failure / browser crash simulation

### MEDIUM RISK
1. **Proof Attachment to Tokens**
   - Risk: SDK may not support mutable proof attachment
   - Mitigation: Verify SDK capabilities upfront; may need custom token reconstruction
   - Test: SDK proof attachment API availability

2. **Split Burn Recovery**
   - Risk: Creating recovery mint when burn status unclear
   - Mitigation: Strict aggregator status check before recovery mint
   - Test: Aggregator state consistency scenarios

3. **Cross-Device Sync**
   - Risk: Orphaned splits on Device A visible on Device B
   - Mitigation: IPFS sync of split bundles; conflict resolution
   - Test: Multi-device INSTANT_SPLIT scenarios

### LOW RISK
1. **Type Compatibility**
   - Risk: SDK type changes
   - Mitigation: Use `any` types for commitments; encapsulate SDK interactions
   - Test: SDK version compatibility

2. **Nostr Event Deduplication**
   - Risk: Receiving same INSTANT_SPLIT event twice
   - Mitigation: Existing deduplication in NostrService handles this
   - Test: Relay resync scenarios

---

## 11. Success Metrics

### Performance Targets
- **Critical Path (Sender):** 2-3 seconds (Nostr delivery only)
  - Measure: Time from split initiation to UI completion
  - Target: Achieve parity with INSTANT_SEND (1.5-2x faster than standard split)

- **Background Completion:** < 60 seconds (submission + proof acquisition)
  - Measure: Time from Nostr delivery to proof acquisition completion
  - Target: 90% of splits complete proofs within 30 seconds

### Reliability Targets
- **Sender Delivery Success:** 99%+
  - Both payment and change tokens must reach Nostr relay
  - Target: < 0.5% failure rate

- **Recipient Proof Acquisition:** 99.5%+
  - Target: < 0.5% of splits fail to acquire all proofs
  - Recovery via manual retry should bring 99.9% success rate

- **Recovery Coverage:** 100%
  - All orphaned splits must be recoverable via background recovery
  - All failed splits must have clear recovery path

### UX Targets
- **Visible Balance Latency:** < 500ms
  - Token should appear in UI before Nostr ACK
  - Target: Instant appearance (save to localStorage before Nostr send)

- **Progress Feedback:** Real-time updates during background phases
  - UI shows "Sending...", "Confirming payment...", "Confirming change..."
  - Target: < 1s between status updates

---

## 12. Future Enhancements

1. **Batch Splits:** Send multiple splits in single Nostr message
2. **Partial Splits:** Handle splits to multiple recipients in single operation
3. **Proof Caching:** Cache frequently-accessed proofs for faster repeated operations
4. **Offline Support:** Queue splits locally and send when connection restores
5. **Split History:** Permanent record of all split operations (audit trail)

---

## Appendix A: File Summary

| File | Type | Status | Lines | Purpose |
|------|------|--------|-------|---------|
| InstantTransferTypes.ts | Modify | Phase 1 | +150 | Type definitions for INSTANT_SPLIT |
| TokenSplitExecutor.ts | Modify | Phase 2 | +200 | Add commitment bundle creation |
| NostrService.ts | Modify | Phase 2-3 | +300 | Add INSTANT_SPLIT send/receive |
| PaymentSessionManager.ts | Modify | Phase 1 | +100 | Support split tracking |
| InventoryBackgroundLoops.ts | Modify | Phase 3 | +200 | Add SplitCommitmentQueue |
| SplitCommitmentService.ts | Create | Phase 3 | ~250 | Commitment submission + proof fetch |
| SplitRecoveryService.ts | Create | Phase 4 | ~200 | Recovery mechanisms |
| SenderRecoveryService.ts | Modify | Phase 4 | +80 | Add INSTANT_SPLIT recovery |
| OutboxRecoveryService.ts | Modify | Phase 4 | +50 | Handle split recovery |
| TokenSplitExecutor.test.ts | Modify | Phase 5 | +150 | Add INSTANT_SPLIT tests |
| NostrService.test.ts | Modify | Phase 5 | +100 | Add INSTANT_SPLIT tests |
| SplitCommitmentService.test.ts | Create | Phase 5 | ~200 | Test commitment submission |
| SplitRecoveryService.test.ts | Create | Phase 5 | ~150 | Test recovery mechanisms |

**Total New/Modified Code:** ~1,900 lines of TypeScript

---

## Appendix B: Key Constants

```typescript
// Nostr event kinds
const INSTANT_SPLIT_TOKEN_KIND = 21066;

// Outbox entry statuses
const SPLIT_STATUSES = {
  INSTANT_SPLIT_PENDING: 'INSTANT_SPLIT_PENDING',
  INSTANT_SPLIT_DELIVERED: 'INSTANT_SPLIT_DELIVERED',
  AWAITING_PROOFS: 'AWAITING_PROOFS',
  PARTIAL_PROOF: 'PARTIAL_PROOF',
  COMPLETED: 'COMPLETED',
};

// Timeouts
const PROOF_FETCH_TIMEOUT_MS = 60000; // 60 seconds per proof
const SESSION_TIMEOUT_MS = 300000;     // 5 minutes for entire split
const PROOF_RETRY_INTERVAL_MS = 2000;  // 2 seconds between retries

// Recovery
const MAX_SUBMISSION_RETRIES = 10;
const RECOVERY_BACKOFF_MAX_MS = 60000; // 60 seconds max backoff
```

---

## Appendix C: Key Data Structures

### Outbox Entry for INSTANT_SPLIT
```typescript
interface OutboxEntry {
  id: string;
  type: 'INSTANT_SPLIT';
  status: 'INSTANT_SPLIT_PENDING' | 'AWAITING_PROOFS' | 'COMPLETED';

  // Commitment bundle (serialized)
  commitmentJson: string; // SplitCommitmentBundle

  // Submission tracking
  burnRequestId?: string;
  mintRequestIds?: string[];

  // Proof tracking
  burnProof?: string; // Serialized inclusion proof
  mintProofs?: string[];

  // Metadata
  splitGroupId: string;
  createdAt: number;
  updatedAt: number;
}
```

### Payment Session for INSTANT_SPLIT
```typescript
interface SplitPaymentSession extends PaymentSession {
  type: 'INSTANT_SPLIT';
  splitGroupId: string;

  splitTokens: Array<{
    tokenId: string;
    role: 'PAYMENT' | 'CHANGE';
    status: 'PENDING' | 'NOSTR_CONFIRMED' | 'PROOF_ACQUIRED' | 'FAILED';
    recipientAddress: string;
  }>;
}
```

---

**Document End**

This plan is comprehensive and ready for implementation. Begin with Phase 1 (Foundation) and proceed sequentially through each phase, ensuring tests pass before moving to the next phase.
