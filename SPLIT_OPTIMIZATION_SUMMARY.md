# Token Split Optimization Summary

## Problem Statement

Single token transfers using INSTANT_SEND mode complete in **2-3 seconds**, but token splits take **10-15 seconds**. This creates a poor user experience when the optimal transfer requires splitting a token.

## Root Causes

1. **Sequential Aggregator Waits (50-70% of latency)**
   - 3× `waitInclusionProof` calls block execution (6-15s total)
   - Burn → wait → mint → wait → transfer → wait

2. **Blocking IPFS Sync (10-20% of latency)**
   - Pre-transfer sync takes 1-3s
   - Blocks final transfer to recipient

3. **No INSTANT_SEND Mode for Splits (Architectural)**
   - Splits follow traditional aggregator-first flow
   - Single tokens use commitment-first (Nostr-first) flow
   - User waits for entire 12s instead of <100ms

## Quick Wins (Phase 1: 1-2 days, 17% speedup)

### 1. Remove Blocking IPFS Sync
**Change:** `await onPreTransferSync()` → fire-and-forget
**File:** `src/components/wallet/L3/services/transfer/TokenSplitExecutor.ts:617`
**Savings:** -1.5s

```typescript
// BEFORE (blocking):
if (persistenceCallbacks?.onPreTransferSync) {
  await persistenceCallbacks.onPreTransferSync(); // 1-3s WAIT
}

// AFTER (non-blocking):
if (persistenceCallbacks?.onPreTransferSync) {
  persistenceCallbacks.onPreTransferSync().catch(err => {
    console.warn('IPFS sync failed (continuing):', err);
  });
}
// Continue immediately to transfer
```

**Rationale:** Tokens already persisted to localStorage, IPFS is for backup only

### 2. Parallelize Mint Submissions
**Change:** Submit 2 mints in parallel instead of sequentially
**File:** `TokenSplitExecutor.ts:467`
**Savings:** -0.4s

```typescript
// BEFORE (sequential):
for (const prepared of preparedMints) {
  await client.submitMintCommitment(commitment); // 200-500ms each
}

// AFTER (parallel):
const submissions = await Promise.all(
  preparedMints.map(p => client.submitMintCommitment(p.commitment))
);
```

**Total Phase 1:** 12s → 10s (17% improvement)

## Major Optimization (Phase 2: 2-3 weeks, 98% speedup)

### INSTANT_SEND Mode for Splits

**Concept:** Apply INSTANT_SEND principles to split operations

**Architecture:**
```
USER FLOW (100-200ms):
1. Create all commitments locally (burn + mints + transfer)
2. Persist to outbox for recovery
3. Send split package via Nostr to recipient
4. Return success to user

BACKGROUND (fire-and-forget):
- Lane 1: Submit commitments to aggregator
- Lane 2: Sync change token to IPFS
- Lane 3: Monitor for failures and retry
```

**Key Changes:**

1. **Split Package Protocol** (new):
   ```typescript
   interface SplitPackage {
     sourceToken: TokenJson;
     burnCommitment: CommitmentJson;
     mintCommitments: CommitmentJson[]; // [change, recipient]
     transferCommitment: CommitmentJson;
     recipientTokenIndex: number; // Which mint is for recipient
   }
   ```

2. **Create All Commitments Upfront**:
   ```typescript
   // No aggregator calls yet!
   const burnCommitment = await split.createBurnCommitment(...);
   const mintCommitments = await split.createSplitMintCommitments(...);
   const transferCommitment = await TransferCommitment.create(...);

   // Send via Nostr immediately
   await nostrService.sendTokenTransfer(recipientPubkey, splitPackage);

   // USER SEES SUCCESS HERE! (~100-200ms)
   ```

3. **Background Aggregator Submission**:
   ```typescript
   // Queue for background processing
   deliveryQueue.queueSplitForAggregatorSubmission({
     splitGroupId,
     burnCommitment,
     mintCommitments,
     transferCommitment,
     maxRetries: 3
   });
   ```

4. **Recipient Can Submit** (fallback):
   - If sender's background submission fails
   - Recipient waits for burn proof, submits mints, submits transfer
   - Enables trustless delivery

**Expected Result:** User latency **100-200ms** (vs. 12s = **98% reduction**)

## Comparison Table

| Metric | Current Split | Phase 1 (Quick Wins) | Phase 2 (INSTANT_SEND) |
|--------|--------------|---------------------|----------------------|
| User-perceived latency | 12s | 10s | 0.1-0.2s |
| Aggregator waits | 3× sequential | 3× sequential | Background |
| IPFS sync | Blocking (2s) | Non-blocking | Background |
| Nostr delivery | After all phases | After all phases | Immediate |
| Total end-to-end | 12s | 10s | ~12s (background) |
| User experience | Poor | Poor | Excellent |

## Implementation Plan

### Phase 1: Quick Wins (1-2 days)
1. Remove blocking IPFS sync
2. Parallelize mint submissions
3. Test and verify 17% speedup

### Phase 2: INSTANT_SEND for Splits (2-3 weeks)
1. **Week 1:** Design + prototype
   - Define split package protocol
   - Implement commitment creation without aggregator calls
   - Add Nostr delivery path

2. **Week 2:** Background processing
   - Extend InventoryBackgroundLoops for split support
   - Implement aggregator submission queue
   - Add recovery logic to OutboxRecoveryService

3. **Week 3:** Recipient-side + testing
   - Implement recipient split finalization
   - Comprehensive testing (success, failures, recovery)
   - Performance validation

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Recipient can't submit commitments | Sender background submission fallback |
| Partial split failure (burn OK, mints fail) | OutboxRecoveryService detects and recovers |
| Network partition during split | Both parties can retry independently |
| Invalid commitments sent via Nostr | SDK validation on recipient side |
| Increased recovery complexity | Comprehensive testing + documentation |

## Success Metrics

### Phase 1 (Quick Wins)
- Total split time: < 10s (baseline: 12s)
- No regressions in reliability
- All tests pass

### Phase 2 (INSTANT_SEND)
- User-perceived latency: < 200ms (baseline: 12s)
- Background completion: < 15s (acceptable)
- Failure recovery: < 5% manual intervention rate
- User satisfaction: Splits feel as fast as single token sends

## Files to Modify

### Phase 1
- `src/components/wallet/L3/services/transfer/TokenSplitExecutor.ts`
  - Line 617: Remove `await` from IPFS sync
  - Line 467: Parallelize mint submissions

### Phase 2
- `src/components/wallet/L3/services/transfer/TokenSplitExecutor.ts`
  - Add `executeSplitPlanInstant()` method
  - Create commitments without aggregator calls

- `src/components/wallet/L3/services/InventoryBackgroundLoops.ts`
  - Add `SplitAggregatorQueue` class
  - Process split submissions in background

- `src/components/wallet/L3/services/OutboxRecoveryService.ts`
  - Add split recovery methods
  - Handle partial failures

- `src/components/wallet/L3/services/NostrService.ts`
  - Add `sendSplitPackage()` method
  - Handle split package reception

- `src/contexts/WalletContext.tsx`
  - Update `sendToken` mutation to use INSTANT_SEND for splits
  - Add split mode detection

## Next Steps

1. **Immediate:** Review this analysis with team
2. **Week 1:** Implement Phase 1 (quick wins)
3. **Week 2-4:** Design and implement Phase 2 (INSTANT_SEND)
4. **Week 5:** Testing and performance validation

## References

- **Detailed Analysis:** `TOKEN_SPLIT_PERFORMANCE_ANALYSIS.md`
- **INSTANT_SEND Spec:** `docs/TOKEN_INVENTORY_SPEC.md` Section 13.27
- **Reference Implementation:** `src/contexts/WalletContext.tsx:949` (executeInstantSend)
