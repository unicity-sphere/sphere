# Token Split Performance Analysis

**Date:** 2026-01-29
**Context:** Single token transfers are fast with INSTANT_SEND mode (~2-3s), but token splits are slow (10+ seconds).
**Goal:** Identify bottlenecks and optimization opportunities to achieve INSTANT_SEND-like performance for splits.

---

## Executive Summary

Token splits currently take **10-15 seconds** vs. **2-3 seconds** for single token INSTANT_SEND transfers. The primary bottlenecks are:

1. **Sequential aggregator round-trips** (burn + 2 mints + transfer = 4 network calls)
2. **Synchronous proof waiting** (3 `waitInclusionProof` calls block execution)
3. **IPFS sync between operations** (pre-transfer sync blocks final delivery)
4. **No INSTANT_SEND mode for splits** (splits don't use commitment-first delivery)

**Optimization potential:** 70-85% reduction in latency by applying INSTANT_SEND principles to splits.

---

## Current Split Flow Architecture

### Phase Overview (TokenSplitExecutor.executeSingleTokenSplit)

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: BURN (Sequential)                                   │
│ ├─ Create burn commitment                      ~10ms         │
│ ├─ Submit to aggregator                        ~200-500ms    │
│ └─ Wait for inclusion proof                    ~2-5s         │
│                                                 TOTAL: ~2.5s  │
├─────────────────────────────────────────────────────────────┤
│ PHASE 2: MINT (Hybrid Sequential/Parallel)                   │
│ ├─ Submit mint commitments SEQUENTIALLY        ~400-1000ms   │
│ │  └─ 2 mints × ~200-500ms each                              │
│ ├─ Wait for proofs IN PARALLEL                 ~2-5s         │
│ └─ Persist tokens sequentially                 ~50-100ms     │
│                                                 TOTAL: ~3-6s  │
├─────────────────────────────────────────────────────────────┤
│ PHASE 3: PRE-TRANSFER IPFS SYNC                              │
│ └─ BLOCKING sync to IPFS                       ~1-3s         │
│                                                 TOTAL: ~1-3s  │
├─────────────────────────────────────────────────────────────┤
│ PHASE 4: TRANSFER (Sequential)                               │
│ ├─ Create transfer commitment                  ~10ms         │
│ ├─ Submit to aggregator                        ~200-500ms    │
│ └─ Wait for inclusion proof                    ~2-5s         │
│                                                 TOTAL: ~2.5s  │
├─────────────────────────────────────────────────────────────┤
│ PHASE 5: NOSTR DELIVERY                                      │
│ └─ Send via Nostr (after all phases complete)  ~50-200ms     │
└─────────────────────────────────────────────────────────────┘

TOTAL TIME: 9-17 seconds (typical: ~12s)
```

**Critical Path Analysis:**
- **Aggregator round-trips:** 4 operations × 2-5s each = **8-20s** (dominates!)
- **IPFS sync:** Blocking operation = **1-3s**
- **Nostr delivery:** Delayed until Phase 5 = **user waits entire flow**

---

## Comparison: INSTANT_SEND vs. Split Flow

### INSTANT_SEND Flow (executeInstantSend - WalletContext.tsx:949)

```typescript
// Phase A: Create commitment (~10ms)
const transferCommitment = await TransferCommitment.create(...);

// Phase B: Persist to outbox (~1ms)
outboxRepo.addEntry(outboxEntry);

// Phase C: Create payment session (~1ms)
sessionManager.createSession(...);

// Phase D: Build Nostr payload (~5ms)
const payload = JSON.stringify({ sourceToken, transferTx: commitment });

// Phase E: Queue for Nostr delivery (~10ms)
deliveryQueue.queueForDelivery(queueEntry);
// USER SEES SUCCESS HERE! (~30-50ms total)

// BACKGROUND (fire-and-forget):
// - Aggregator submission (async)
// - IPFS sync (async)
// - Proof retrieval (async)
```

**Key Characteristics:**
1. **Commitment-first:** Create commitment immediately, don't wait for aggregator
2. **Nostr-first:** Deliver to recipient immediately via Nostr
3. **Fire-and-forget:** Aggregator and IPFS happen in background
4. **Recipient submits:** Recipient submits commitment to aggregator if sender fails
5. **User latency:** 30-50ms (vs. 12s for splits!)

### Split Flow (executeSingleTokenSplit - TokenSplitExecutor.ts:187)

```typescript
// BURN
const burnCommitment = await split.createBurnCommitment(...);
await client.submitTransferCommitment(burnCommitment);        // BLOCKING
const burnInclusionProof = await waitInclusionProof(...);     // BLOCKING 2-5s

// MINT (sequential submissions)
for (const commitment of mintCommitments) {
  await client.submitMintCommitment(commitment);              // BLOCKING × 2
}
// Then parallel proof wait
const proofResults = await Promise.allSettled(...);           // BLOCKING 2-5s

// IPFS SYNC (pre-transfer checkpoint)
await onPreTransferSync();                                    // BLOCKING 1-3s

// TRANSFER
const transferCommitment = await TransferCommitment.create(...);
await client.submitTransferCommitment(transferCommitment);    // BLOCKING
const transferProof = await waitInclusionProof(...);          // BLOCKING 2-5s

// NOSTR (finally!)
await nostrService.sendTokenTransfer(recipientPubkey, payload);
```

**Key Differences:**
1. **Aggregator-first:** All operations wait for aggregator before Nostr
2. **Synchronous proofs:** 3× `waitInclusionProof` blocks execution (6-15s total!)
3. **IPFS checkpoint:** Blocking sync before final transfer
4. **User waits:** User sees loading for entire 12s flow

---

## Detailed Bottleneck Analysis

### 1. Sequential Aggregator Round-Trips (CRITICAL)

**Location:** `TokenSplitExecutor.executeSingleTokenSplit` lines 310, 474, 682

**Current Implementation:**
```typescript
// Step 1: BURN (wait for proof)
await client.submitTransferCommitment(burnCommitment);
const burnProof = await waitInclusionProofWithDevBypass(burnCommitment); // 2-5s

// Step 2: MINT (wait for proofs)
for (commitment of mintCommitments) {
  await client.submitMintCommitment(commitment);
}
const proofResults = await Promise.allSettled(
  preparedMints.map(m => waitInclusionProofWithDevBypass(m.commitment)) // 2-5s parallel
);

// Step 3: TRANSFER (wait for proof)
await client.submitTransferCommitment(transferCommitment);
const transferProof = await waitInclusionProofWithDevBypass(transferCommitment); // 2-5s
```

**Bottleneck:**
- 3 separate `waitInclusionProof` calls = **6-15 seconds** of blocking waits
- Each call polls aggregator every 1s for up to 60s timeout
- User cannot proceed until all proofs received

**Impact:** **50-70% of total latency**

---

### 2. Blocking IPFS Sync Checkpoint (HIGH IMPACT)

**Location:** `TokenSplitExecutor.executeSingleTokenSplit` line 617, called from `WalletContext.tsx` line 798

**Current Implementation:**
```typescript
// CRITICAL: Sync to IPFS BEFORE transfer
if (persistenceCallbacks?.onPreTransferSync) {
  const syncSuccess = await persistenceCallbacks.onPreTransferSync(); // 1-3s BLOCKING
  if (!syncSuccess) {
    console.warn("Pre-transfer IPFS sync failed - continuing");
  }
}
```

**Called from:**
```typescript
// WalletContext.tsx:798
onPreTransferSync: async () => {
  const result = await inventorySync({
    address: identity.address,
    publicKey: identity.publicKey,
    ipnsName: identity.ipnsName,
    skipExtendedVerification: true,
  });
  return result.status === 'SUCCESS' || result.status === 'PARTIAL_SUCCESS';
}
```

**Bottleneck:**
- Blocking call to `inventorySync` takes **1-3 seconds**
- Happens AFTER mints (which are already persisted) but BEFORE transfer
- Purpose: Ensure minted tokens backed up before final transfer
- User waits for IPFS network I/O (DHT, Helia operations)

**Impact:** **10-20% of total latency**

---

### 3. No Commitment-First Architecture (ARCHITECTURAL)

**Location:** Split flow doesn't use INSTANT_SEND mode

**Issue:** Splits follow traditional flow:
1. Submit to aggregator first
2. Wait for proof
3. Then send to recipient

**INSTANT_SEND approach (not used for splits):**
1. Create commitment locally
2. Send commitment to recipient immediately via Nostr
3. Recipient submits to aggregator (or sender does in background)
4. User sees success in <100ms

**Why not applied to splits?**
- Split operations have dependencies (burn → mint → transfer)
- Current code assumes sequential proof retrieval is required
- No recovery mechanism for partial split failures with commitment-first

**Impact:** **Conceptual - could enable 10× speedup**

---

### 4. Token Split Calculation Overhead (LOW IMPACT)

**Location:** `TokenSplitCalculator.calculateOptimalSplit` (TokenSplitCalculator.ts:22)

**Current Implementation:**
```typescript
async calculateOptimalSplit(
  availableTokens: Token[],
  targetAmount: bigint,
  targetCoinIdHex: string
): Promise<SplitPlan | null> {
  // 1. Parse all candidate tokens (10-50ms for 10 tokens)
  for (const t of availableTokens) {
    const parsed = JSON.parse(t.jsonData);
    const sdkToken = await SdkToken.fromJSON(parsed);
    candidates.push({ sdkToken, amount: realAmount, uiToken: t });
  }

  // 2. Try to find exact match (1ms)
  const exactMatch = candidates.find(t => t.amount === targetAmount);

  // 3. Try combinations (1-10ms for size 2-5)
  for (let size = 2; size <= maxCombinationSize; size++) {
    const combo = this.findCombinationOfSize(candidates, targetAmount, size);
  }

  // 4. Greedy selection (1ms)
  // Select tokens until split needed
}
```

**Bottleneck:**
- `SdkToken.fromJSON()` for every token = **O(n)** where n = token count
- Combination search is **O(n^k)** but k ≤ 5 so acceptable
- Typically **10-50ms** for 10-20 tokens

**Impact:** **<1% of total latency** (negligible)

---

### 5. Memory and Computation Overhead (LOW IMPACT)

**Split Executor Memory Usage:**
```typescript
// Prepared mints array (2 items × ~5KB each = 10KB)
const preparedMints: PreparedMint[] = [];

// Minted tokens info (2 items × ~5KB each = 10KB)
const mintedTokensInfo: MintedTokenInfo[] = [];

// SDK token objects (3 tokens × ~10KB each = 30KB)
// - Source token
// - Recipient token (before transfer)
// - Sender change token
```

**Total Memory:** ~50KB per split operation

**CPU Usage:**
- Commitment creation: ~10ms each (4 commitments = 40ms)
- State hash calculations: ~5ms each (multiple times)
- JSON serialization: ~5ms per token

**Impact:** **<5% of total latency** (negligible)

---

## Root Cause Summary

| Bottleneck | Latency | % of Total | Severity | Optimizable? |
|------------|---------|------------|----------|--------------|
| Sequential aggregator waits (3× waitInclusionProof) | 6-15s | 50-70% | CRITICAL | YES |
| Blocking IPFS sync checkpoint | 1-3s | 10-20% | HIGH | YES |
| No INSTANT_SEND mode for splits | N/A | Architectural | CRITICAL | YES |
| Sequential mint submissions | 0.4-1s | 5-10% | MEDIUM | YES |
| Token split calculation | 10-50ms | <1% | LOW | NO |
| Memory/CPU overhead | 50ms | <5% | LOW | NO |

**Primary Root Cause:** Lack of commitment-first architecture for split operations

---

## Optimization Recommendations

### Priority 1: INSTANT_SEND Mode for Splits (70-85% speedup)

**Goal:** Apply INSTANT_SEND principles to split operations

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│ PHASE A: CREATE ALL COMMITMENTS (SYNCHRONOUS)                │
│ ├─ Burn commitment                             ~10ms         │
│ ├─ Mint commitment #1 (change)                 ~10ms         │
│ ├─ Mint commitment #2 (recipient pre-transfer) ~10ms         │
│ └─ Transfer commitment                         ~10ms         │
│                                                 TOTAL: ~40ms  │
├─────────────────────────────────────────────────────────────┤
│ PHASE B: PERSIST TO OUTBOX (SYNCHRONOUS)                     │
│ └─ Save all commitments to localStorage       ~5ms           │
├─────────────────────────────────────────────────────────────┤
│ PHASE C: NOSTR DELIVERY (SYNCHRONOUS)                        │
│ └─ Send split package to recipient            ~50-100ms      │
│     - Burn commitment                                         │
│     - Mint commitments                                        │
│     - Transfer commitment                                     │
│                                                               │
│ 🎯 USER SEES SUCCESS HERE! (~100-200ms)                      │
├─────────────────────────────────────────────────────────────┤
│ BACKGROUND LANES (FIRE-AND-FORGET):                          │
│                                                               │
│ Lane 1: Aggregator Submission                                │
│ ├─ Submit burn commitment                     async          │
│ ├─ Wait for burn proof                        async          │
│ ├─ Submit mint commitments (parallel)         async          │
│ ├─ Wait for mint proofs (parallel)            async          │
│ ├─ Submit transfer commitment                 async          │
│ └─ Wait for transfer proof                    async          │
│                                                               │
│ Lane 2: IPFS Sync                                            │
│ └─ Sync change token to IPFS                  async          │
│                                                               │
│ Lane 3: Recovery Monitoring                                  │
│ └─ Track payment session status                async          │
└─────────────────────────────────────────────────────────────┘
```

**Implementation Steps:**

1. **Create Split Package** (~40ms):
   ```typescript
   // Create ALL commitments upfront (no aggregator calls yet)
   const burnCommitment = await split.createBurnCommitment(...);
   const mintCommitments = await split.createSplitMintCommitments(...);
   const transferCommitment = await TransferCommitment.create(...);
   ```

2. **Persist to Outbox** (~5ms):
   ```typescript
   // Save all commitments for recovery
   const splitGroup = {
     groupId: crypto.randomUUID(),
     burnCommitment: burnCommitment.toJSON(),
     mintCommitments: mintCommitments.map(m => m.toJSON()),
     transferCommitment: transferCommitment.toJSON(),
     status: 'PENDING_DELIVERY'
   };
   outboxRepo.createSplitGroup(splitGroup);
   ```

3. **Send Split Package via Nostr** (~50-100ms):
   ```typescript
   // Recipient gets everything needed to self-execute
   const payload = {
     sourceToken: sourceToken.toJSON(),
     burnCommitment: burnCommitment.toJSON(),
     mintCommitments: mintCommitments.map(m => m.toJSON()),
     transferCommitment: transferCommitment.toJSON(),
     recipientTokenIndex: 1, // Which mint is for recipient
   };
   await nostrService.sendTokenTransfer(recipientPubkey, JSON.stringify(payload));
   ```

4. **Background Aggregator Submission** (fire-and-forget):
   ```typescript
   // Queue for background processing (via InventoryBackgroundLoops)
   deliveryQueue.queueSplitForAggregatorSubmission({
     splitGroupId,
     burnCommitment,
     mintCommitments,
     transferCommitment,
     maxRetries: 3
   });
   ```

5. **Recipient Submission Path** (fallback):
   ```typescript
   // If sender fails, recipient can submit commitments themselves
   // Recipient waits for burn proof, then submits mints, then submits transfer
   // This enables trustless delivery (recipient doesn't depend on sender)
   ```

**Expected Speedup:**
- User-perceived latency: **100-200ms** (vs. 12s = **98% reduction**)
- Total operation time: Still ~12s but **in background**
- Critical path: Commitment creation + Nostr delivery only

**Challenges:**
1. **Mint dependencies:** Mints require burn proof (SDK validation)
   - **Solution:** Send commitments to recipient, recipient waits for burn proof
2. **Partial failures:** What if burn succeeds but mints fail?
   - **Solution:** Recipient can re-submit mints (idempotent via REQUEST_ID_EXISTS)
3. **Recipient trust:** Recipient must trust commitments are valid
   - **Solution:** SDK validation on recipient side before accepting
4. **Recovery complexity:** More failure modes to handle
   - **Solution:** Leverage existing OutboxRecoveryService patterns

---

### Priority 2: Parallelize Independent Operations (30-40% speedup)

**Current Sequential Operations:**
```typescript
// These operations have NO dependencies but run sequentially
await client.submitTransferCommitment(burnCommitment);     // 200-500ms
const burnProof = await waitInclusionProof(burnCommitment); // 2-5s

// Could start mint submissions immediately after burn submission!
```

**Optimization:**
```typescript
// Submit burn and start waiting for proof
const burnSubmitPromise = client.submitTransferCommitment(burnCommitment);
const burnProofPromise = burnSubmitPromise.then(() =>
  waitInclusionProof(burnCommitment)
);

// While burn is being processed, prepare mints
const mintCommitments = await split.createSplitMintCommitments(...);

// Wait for burn to complete before submitting mints (SDK requirement)
await burnProofPromise;

// Submit mints in parallel (already done - line 520)
const mintSubmissions = await Promise.all(
  preparedMints.map(m => client.submitMintCommitment(m.commitment))
);

// Wait for mint proofs in parallel (already done - line 520)
const proofResults = await Promise.allSettled(
  preparedMints.map(m => waitInclusionProof(m.commitment))
);
```

**Expected Speedup:**
- Overlap burn proof wait with mint preparation: **~500ms saved**
- Already parallelized: Mint proof waiting (good!)

---

### Priority 3: Remove Blocking IPFS Sync (10-20% speedup)

**Current Implementation:**
```typescript
// BLOCKING sync before transfer
await onPreTransferSync(); // 1-3s
```

**Optimization A: Make IPFS sync non-blocking**
```typescript
// Fire-and-forget sync (tokens already in localStorage)
onPreTransferSync().catch(err => {
  console.warn('IPFS sync failed, but tokens are safe in localStorage:', err);
});

// Continue with transfer immediately
const transferCommitment = await TransferCommitment.create(...);
```

**Rationale:**
- Tokens are already persisted to localStorage by `onTokenMinted` (line 565)
- IPFS sync is for backup/recovery, not critical path
- User's tokens are safe even if IPFS sync fails
- Can retry IPFS sync in background loop

**Optimization B: Sync to IPFS in background after Nostr delivery**
```typescript
// Nostr delivery first (user sees success)
await nostrService.sendTokenTransfer(...);

// Then sync to IPFS asynchronously
queueIpfsSync({
  address: identity.address,
  tokens: [changeToken],
  priority: 'MEDIUM'
});
```

**Expected Speedup:**
- Remove 1-3s from critical path = **~15% reduction**

---

### Priority 4: Optimize Mint Submissions (5-10% speedup)

**Current Implementation:**
```typescript
// Sequential submissions (line 467)
for (const prepared of preparedMints) {
  await client.submitMintCommitment(commitment); // 200-500ms each
}
```

**Why Sequential?**
- Comment: "preserves atomicity" (line 463)
- Concern: If one fails, don't want partial state

**Optimization: Optimistic Parallel with Rollback**
```typescript
// Submit both mints in parallel
const submissions = await Promise.allSettled([
  client.submitMintCommitment(mintCommitments[0]),
  client.submitMintCommitment(mintCommitments[1])
]);

// Check for failures
if (submissions.some(s => s.status === 'rejected')) {
  // Rollback: Can't un-submit, but can mark as failed and not proceed
  throw new Error('Mint submission failed');
}
```

**Expected Speedup:**
- Save 200-500ms by submitting 2 mints in parallel
- Risk: Both might fail, but that's acceptable (operation already failed)

**Note:** Current code already parallelizes proof waiting (line 520), which is the bigger win!

---

### Priority 5: SDK-Level Optimizations (FUTURE)

**Investigate SDK bottlenecks:**

1. **waitInclusionProof polling interval:**
   - Current: Polls every 1s (SDK default)
   - Could: Use exponential backoff or WebSocket for push notifications

2. **Trust base verification overhead:**
   - Current: Full Merkle proof verification on every proof
   - Could: Cache recent trust base states

3. **Aggregator response time:**
   - Current: 2-5s for inclusion proof
   - Could: Investigate aggregator-side optimizations

**Expected Speedup:**
- SDK changes could reduce proof wait from 2-5s to 1-2s = **~30% improvement**
- Requires coordination with SDK maintainers

---

## Recommended Implementation Plan

### Phase 1: Quick Wins (1-2 days, 15-20% speedup)

1. **Remove blocking IPFS sync** (Priority 3)
   - Change `await onPreTransferSync()` to fire-and-forget
   - Add IPFS sync to background queue after Nostr delivery
   - Expected: **-1.5s**

2. **Parallelize mint submissions** (Priority 4)
   - Submit 2 mints in parallel instead of sequentially
   - Expected: **-0.4s**

**Total Phase 1 Speedup:** 12s → **~10s** (17% improvement)

---

### Phase 2: INSTANT_SEND for Splits (2-3 weeks, 70-85% speedup)

1. **Design Split Package Protocol**
   - Define payload structure for Nostr delivery
   - Specify recipient submission flow
   - Design recovery mechanisms

2. **Implement Commitment-First Split Executor**
   - Create all commitments upfront (no aggregator calls)
   - Persist to outbox for recovery
   - Send via Nostr immediately

3. **Background Aggregator Submission**
   - Extend `InventoryBackgroundLoops` with split support
   - Queue split groups for background processing
   - Handle failures with retry logic

4. **Recipient-Side Split Finalization**
   - Parse split package from Nostr
   - Submit burn commitment if needed
   - Wait for burn proof
   - Submit mint commitments
   - Wait for mint proofs
   - Finalize transfer

5. **Recovery & Error Handling**
   - Extend `OutboxRecoveryService` for split operations
   - Handle partial failures (burn OK, mints fail, etc.)
   - Implement timeout and retry logic

**Total Phase 2 Speedup:** 12s → **0.1-0.2s** user-perceived (98% improvement)

---

### Phase 3: SDK Optimizations (FUTURE)

1. Work with SDK team to optimize `waitInclusionProof`
2. Investigate aggregator performance improvements
3. Implement WebSocket push notifications for proofs

---

## Risk Assessment

### INSTANT_SEND for Splits Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Recipient can't submit commitments | Medium | High | Fallback to sender background submission |
| Partial split failure (burn OK, mints fail) | Low | High | OutboxRecoveryService can detect and recover |
| Network partition during split | Low | Medium | Both sender and recipient can retry independently |
| Invalid commitments sent via Nostr | Very Low | Medium | SDK validation on recipient side |
| Recovery complexity increases | High | Medium | Comprehensive testing + clear documentation |

**Overall Risk:** MEDIUM - Benefits outweigh risks with proper testing

---

## Performance Testing Plan

### Baseline Measurements (Current Split Flow)

**Test Cases:**
1. Small split (10 UNI → 3 UNI send, 7 UNI change)
2. Large split (1000 UNI → 999 UNI send, 1 UNI change)
3. Multiple tokens available (5 tokens → pick 1 to split)

**Metrics:**
- Time to Nostr delivery (user-perceived latency)
- Time to aggregator submission
- Time to IPFS sync
- Total end-to-end time
- Memory usage
- CPU usage

### Phase 1 Performance Tests

**After optimizations:**
- Measure same test cases
- Compare against baseline
- Target: **15-20% reduction** in total time

### Phase 2 Performance Tests

**After INSTANT_SEND implementation:**
- Measure user-perceived latency (commitment → Nostr)
- Measure background processing time
- Test failure scenarios (network partition, aggregator down)
- Target: **User latency < 200ms, background < 15s**

---

## Code References

**Key Files:**
- `src/components/wallet/L3/services/transfer/TokenSplitExecutor.ts` (split execution)
- `src/components/wallet/L3/services/transfer/TokenSplitCalculator.ts` (split planning)
- `src/contexts/WalletContext.tsx` (send orchestration)
- `src/components/wallet/L3/services/NostrService.ts` (Nostr delivery)
- `src/utils/devTools.ts` (waitInclusionProofWithDevBypass)

**Key Functions:**
- `executeSingleTokenSplit()` - Main split executor (line 187)
- `executeInstantSend()` - INSTANT_SEND reference implementation (WalletContext:949)
- `waitInclusionProofWithDevBypass()` - Proof waiting (devTools:398)

---

## Conclusion

Token splits are **10-15 seconds** slower than single token transfers primarily due to:

1. **Sequential aggregator waits** (6-15s = 50-70% of latency)
2. **Blocking IPFS sync** (1-3s = 10-20% of latency)
3. **Lack of INSTANT_SEND mode** (architectural)

**Recommended approach:**

1. **Phase 1 (Quick Wins):** Remove blocking IPFS sync + parallelize mints = **15-20% speedup** (1-2 days)
2. **Phase 2 (INSTANT_SEND for Splits):** Commitment-first architecture = **98% speedup** in user-perceived latency (2-3 weeks)

**Expected outcome:** Split transfers feel as fast as single token INSTANT_SEND transfers (<200ms user-perceived latency).

---

## Appendix: Detailed Code Flow

### Current Split Flow (Detailed)

```typescript
// File: TokenSplitExecutor.ts:187
async executeSingleTokenSplit(
  tokenToSplit: SdkToken<any>,
  splitAmount: bigint,
  remainderAmount: bigint,
  coinId: CoinId,
  recipientAddress: IAddress,
  signingService: SigningService,
  onTokenBurned: (uiId: string) => void,
  uiTokenId: string,
  outboxContext?: {...},
  persistenceCallbacks?: SplitPersistenceCallbacks
): Promise<SplitTokenResult>

// === STEP 1: BURN ===
// Line 207: Create split builder
const builder = new TokenSplitBuilder();

// Line 249-269: Create two new tokens (recipient + change)
builder.createToken(recipientTokenId, ...); // For recipient
builder.createToken(senderTokenId, ...);    // For sender (change)

// Line 272: Build split object
const split = await builder.build(tokenToSplit);

// Line 276: Create burn commitment
const burnCommitment = await split.createBurnCommitment(burnSalt, signingService);

// Line 283-307: Create outbox entry for burn (recovery)
if (outboxRepo && outboxContext) {
  const burnEntry = createOutboxEntry("SPLIT_BURN", ...);
  outboxRepo.addEntry(burnEntry);
}

// Line 310: SUBMIT BURN TO AGGREGATOR (BLOCKING)
const burnResponse = await client.submitTransferCommitment(burnCommitment);
// ⏱️ Network round-trip: 200-500ms

// Line 312-337: Handle burn failures (recovery logic)
if (burnResponse.status !== "SUCCESS" && burnResponse.status !== "REQUEST_ID_EXISTS") {
  // Attempt recovery via TokenRecoveryService
  throw new Error(`Burn failed: ${burnResponse.status}`);
}

// Line 341: WAIT FOR BURN PROOF (BLOCKING)
const burnInclusionProof = await waitInclusionProofWithDevBypass(burnCommitment);
// ⏱️ Aggregator polling: 2-5 seconds

// === STEP 2: MINT SPLIT TOKENS ===
// Line 354: Create mint commitments
const mintCommitments = await split.createSplitMintCommitments(
  this.trustBase,
  burnTransaction
);

// Line 408-461: Prepare mints (calculate metadata, create outbox entries)
const preparedMints: PreparedMint[] = [];
for (let i = 0; i < mintCommitments.length; i++) {
  // Create outbox entries for recovery
  if (outboxRepo && outboxContext) {
    const mintEntry = createOutboxEntry("SPLIT_MINT", ...);
    outboxRepo.addEntry(mintEntry);
  }
  preparedMints.push({ commitment, isForRecipient, ... });
}

// Line 464-511: SUBMIT MINTS SEQUENTIALLY (BLOCKING)
for (const prepared of preparedMints) {
  const res = await client.submitMintCommitment(commitment);
  // ⏱️ Network round-trip per mint: 200-500ms × 2 = 400-1000ms

  if (res.status !== "SUCCESS" && res.status !== "REQUEST_ID_EXISTS") {
    // Recovery logic
    throw new Error(`Mint failed: ${res.status}`);
  }
}

// Line 520-536: WAIT FOR MINT PROOFS IN PARALLEL (BLOCKING)
const proofResults = await Promise.allSettled(
  preparedMints.map(async (prepared) => {
    const proof = await waitInclusionProofWithDevBypass(prepared.commitment);
    return { ...prepared, proof };
  })
);
// ⏱️ Aggregator polling (parallel): 2-5 seconds

// Line 542-583: Persist minted tokens sequentially
for (const result of proofResults) {
  if (persistenceCallbacks?.onTokenMinted) {
    await persistenceCallbacks.onTokenMinted(mintedToken, isChangeToken, { skipSync: true });
    // ⏱️ LocalStorage write: ~5ms per token
  }
}

// === STEP 3: PRE-TRANSFER IPFS SYNC ===
// Line 617-632: BLOCKING IPFS SYNC
if (persistenceCallbacks?.onPreTransferSync) {
  const syncSuccess = await persistenceCallbacks.onPreTransferSync();
  // ⏱️ IPFS network I/O: 1-3 seconds
}

// === STEP 4: TRANSFER TO RECIPIENT ===
// Line 641-648: Create transfer commitment
const transferCommitment = await TransferCommitment.create(
  recipientTokenBeforeTransfer,
  recipientAddress,
  transferSalt,
  null, null,
  signingService
);

// Line 656-680: Create outbox entry for transfer (recovery)
if (outboxRepo && outboxContext) {
  const transferEntry = createOutboxEntry("SPLIT_TRANSFER", ...);
  outboxRepo.addEntry(transferEntry);
  transferEntryId = transferEntry.id;
}

// Line 682: SUBMIT TRANSFER TO AGGREGATOR (BLOCKING)
const transferRes = await client.submitTransferCommitment(transferCommitment);
// ⏱️ Network round-trip: 200-500ms

// Line 684-728: Handle transfer failures (recovery logic)
if (transferRes.status !== "SUCCESS" && transferRes.status !== "REQUEST_ID_EXISTS") {
  // Recovery via TokenRecoveryService
  throw new Error(`Transfer failed: ${transferRes.status}`);
}

// Line 736: WAIT FOR TRANSFER PROOF (BLOCKING)
const transferProof = await waitInclusionProofWithDevBypass(transferCommitment);
// ⏱️ Aggregator polling: 2-5 seconds

// Line 751-757: Return result
return {
  tokenForRecipient: recipientTokenBeforeTransfer,
  tokenForSender: senderToken,
  recipientTransferTx: transferTx,
  outboxEntryId: transferEntryId,
  splitGroupId: splitGroupId,
};
```

**Total Time Breakdown:**
- Burn: submit (0.3s) + proof (3s) = **3.3s**
- Mints: submit sequential (0.7s) + proof parallel (3s) + persist (0.05s) = **3.75s**
- IPFS sync: **2s**
- Transfer: submit (0.3s) + proof (3s) = **3.3s**
- **TOTAL: ~12.35s**

### INSTANT_SEND Flow (Detailed - Reference)

```typescript
// File: WalletContext.tsx:949
const executeInstantSend = async (
  sourceToken: SdkToken<any>,
  uiId: string,
  recipientAddress: ProxyAddress,
  recipientPubkey: string,
  signingService: SigningService,
  recipientNametag: string
): Promise<string>

// Line 971-982: Phase A - Create commitment (~10ms)
const salt = Buffer.alloc(32);
window.crypto.getRandomValues(salt);
const transferCommitment = await TransferCommitment.create(
  sourceToken,
  recipientAddress,
  salt, null, null,
  signingService
);

// Line 984-999: Extract amount/coinId (~5ms)
let amount = '0';
let coinId = '';
const coinsOpt = sourceToken.coins;
// ... parse coins data

// Line 1003-1017: Phase B - Persist to outbox (~1ms)
const outboxEntry = createOutboxEntry(
  'DIRECT_TRANSFER',
  uiId,
  recipientNametag,
  recipientPubkey,
  JSON.stringify(recipientAddress.toJSON()),
  amount,
  coinId,
  Buffer.from(salt).toString('hex'),
  JSON.stringify(sourceToken.toJSON()),
  JSON.stringify(transferCommitment.toJSON())
);
outboxRepo.addEntry(outboxEntry);
outboxRepo.updateEntry(outboxEntry.id, { status: 'READY_TO_SEND' });

// Line 1020-1034: Phase C - Create payment session (~1ms)
const session = sessionManager.createSession({
  direction: 'SEND',
  sourceTokenId: uiId,
  recipientNametag,
  recipientPubkey,
  amount, coinId,
  salt: Buffer.from(salt).toString('hex'),
});
sessionManager.advancePhase(session.id, 'COMMITMENT_CREATED', {
  commitmentJson: JSON.stringify(transferCommitment.toJSON()),
  outboxEntryId: outboxEntry.id,
});

// Line 1039-1051: Phase D - Build Nostr payload (~5ms)
const stateHashResult = await sourceToken.state.calculateHash();
const stateHash = stateHashResult.toString();
const payload = JSON.stringify({
  sourceToken: JSON.stringify(sourceToken.toJSON()),
  transferTx: JSON.stringify(transferCommitment.toJSON()),
  commitmentData: JSON.stringify(transferCommitment.toJSON()),
  tokenId: sourceToken.id.toString(),
  stateHash,
});

// Line 1054-1063: Phase E - Queue for Nostr delivery (~10ms)
const loopsManager = InventoryBackgroundLoopsManager.getInstance();
if (loopsManager.isReady()) {
  deliveryQueue = loopsManager.getDeliveryQueue();
}

// Line 1080-1092: Queue for delivery
const queueEntryId = crypto.randomUUID();
await deliveryQueue.queueForDelivery({
  id: queueEntryId,
  outboxEntryId: outboxEntry.id,
  recipientPubkey,
  recipientNametag,
  payloadJson: payload,
  retryCount: 0,
  createdAt: Date.now(),
});

// 🎯 USER SEES SUCCESS HERE! (~30-50ms total)

// Line 1095-1145: BACKGROUND - Fire-and-forget aggregator submission
// This happens asynchronously via InventoryBackgroundLoops
// - Nostr delivery queue processes entry
// - Sends via Nostr
// - Then submits commitment to aggregator in background
// - Waits for proof in background
// - Updates outbox status
```

**Total User-Perceived Time:** **30-50ms** (vs. 12s for splits!)

---

**End of Analysis**
