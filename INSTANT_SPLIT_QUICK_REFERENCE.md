# INSTANT_SPLIT Implementation - Quick Reference

**Status:** Ready for Development
**Total Implementation Time:** 10-13 days (5 phases)
**Estimated Code:** 1,900+ lines TypeScript

---

## What is INSTANT_SPLIT?

Reduces token split latency from **~42 seconds to 2-3 seconds** by:
1. Creating all commitments upfront (no aggregator submission)
2. Delivering both tokens via Nostr immediately
3. Recipients submit commitments and fetch proofs in background

**Key Innovation:** Sender sends commitment bundle to BOTH recipient AND self (change token), enabling self-recovery and uniform handling.

---

## At-a-Glance Implementation Map

```
┌─────────────────────────────────────────────────────────────────┐
│                     INSTANT_SPLIT FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SENDER (Critical Path: 2-3s)                                  │
│  ───────────────────────────                                   │
│  1. Create burn + 2 mint commitments (TokenSplitExecutor)      │
│  2. Save bundle to outbox (Persistence)                         │
│  3. Send payment token to recipient (NostrService)             │
│  4. Send change token to self (NostrService)                   │
│  → Return "Complete" to UI                                     │
│                                                                  │
│  RECIPIENT (Background)                                        │
│  ──────────────────────                                        │
│  1. Receive InstantSplitPayload event (NostrService)           │
│  2. Save token to localStorage IMMEDIATELY                     │
│  3. Dispatch wallet-updated → UI shows token                   │
│  4. Queue commitment for submission (SplitCommitmentQueue)     │
│  5. Submit burn + mints in parallel (SplitCommitmentService)   │
│  6. Fetch proofs in parallel (SplitCommitmentService)          │
│  7. Attach proofs and finalize tokens                          │
│                                                                  │
│  RECOVERY (If needed)                                          │
│  ──────────────────                                            │
│  - Orphaned splits: Resume from current state (SplitRecovery)  │
│  - Sender recovery: Query Nostr by author (SenderRecovery)     │
│  - Burn failure: Create recovery mint (SplitRecovery)          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files to Modify

### Phase 1: Foundation
- [ ] `InstantTransferTypes.ts` - Add types
  - `SplitCommitmentBundle`
  - `InstantSplitPayload`
  - `SplitPaymentSession`
  - Helper functions

- [ ] `PaymentSessionManager.ts` - Add split tracking
  - Accept `type` parameter
  - Add `updateSplitTokenStatus()`
  - Add `getSplitProgress()`

### Phase 2: Sender Flow
- [ ] `TokenSplitExecutor.ts` - Add commitment creation
  - Add `instantMode` parameter
  - Add `createSplitCommitmentBundleOnly()`
  - Early return in `executeSplitPlan()`

- [ ] `NostrService.ts` - Phase 1 of 2
  - Add `sendInstantSplitToken()`
  - Add `INSTANT_SPLIT_TOKEN_KIND = 21066`
  - Test: sender delivery

### Phase 3: Recipient Flow
- [ ] `InventoryBackgroundLoops.ts`
  - Add `SplitCommitmentQueue` class
  - Add queue getter in manager

- [ ] `SplitCommitmentService.ts` (NEW)
  - `submitSplitCommitments()` - burn then mints
  - `fetchSplitProofs()` - parallel fetch
  - `completeSplitWithProofs()` - attach proofs

- [ ] `NostrService.ts` - Phase 2 of 2
  - Add `handleInstantSplitToken()`
  - Subscribe to kind 21066
  - Queue for background processing

### Phase 4: Recovery
- [ ] `SplitRecoveryService.ts` (NEW)
  - `recoverOrphanedSplits()` - startup recovery
  - `recoverSingleSplit()` - resume from state
  - `recoverSplitBurnFailure()` - create recovery mint

- [ ] `SenderRecoveryService.ts` - Add extension
  - `recoverInstantSplitTokens()` - Nostr query

- [ ] `OutboxRecoveryService.ts` - Add support
  - Handle `INSTANT_SPLIT_PENDING` status
  - Handle `AWAITING_PROOFS` status

### Phase 5: Testing
- [ ] `TokenSplitExecutor.test.ts` - Add tests
- [ ] `NostrService.test.ts` - Add tests
- [ ] `SplitCommitmentService.test.ts` (NEW)
- [ ] `SplitRecoveryService.test.ts` (NEW)

---

## Key Methods Quick Reference

### TokenSplitExecutor
```typescript
// Existing - add parameter
async executeSplitPlan(..., instantMode?: boolean)
  → Returns: {..., instantSplitBundle?, nostrDeliveryPending?}

// New
private async createSplitCommitmentBundleOnly(...)
  → Returns: {bundle, nostrRecipientPubkeys, outboxEntryIds}
```

### NostrService
```typescript
// New - Sender
async sendInstantSplitToken(recipientPubkey, payload)
  → Returns: eventId

// New - Recipient
private async handleInstantSplitToken(event)
  → Returns: UiToken[] (saved to localStorage)
```

### SplitCommitmentService (NEW)
```typescript
// Phase 2: Submit (burn first, mints parallel)
async submitSplitCommitments(bundle)
  → Returns: {burnRequestId, mintRequestIds}

// Phase 3: Fetch proofs (parallel)
async fetchSplitProofs(requestIds)
  → Returns: {burnProof, mintProofs}

// Phase 3: Complete with proofs
async completeSplitWithProofs(bundle, proofs)
  → Returns: void
```

### SplitRecoveryService (NEW)
```typescript
// Startup: recover orphaned splits
async recoverOrphanedSplits()
  → Returns: {recovered, failed}

// Single recovery
private async recoverSingleSplit(bundle)
  → Returns: void

// Burn failure recovery (if burn succeeded but all mints fail)
async recoverSplitBurnFailure(bundle, reason)
  → Returns: {action, recoveryMintCreated}
```

---

## Critical Implementation Details

### Commitment Creation (Phase 2)
```
BEFORE aggregator submission:
✓ Burn commitment created
✓ Mint commitment 1 created (payment)
✓ Mint commitment 2 created (change)
✓ Bundle persisted to outbox
✓ Tokens derived from commitments

NO aggregator calls yet
```

### Nostr Delivery (Phase 2)
```
Send to recipient (PAYMENT):
- InstantSplitPayload {
    splitGroupId,
    role: 'PAYMENT',
    token,
    commitmentBundle: {burn, mint},
    senderPubkey
  }

Send to self (CHANGE):
- Same payload but role: 'CHANGE'
- Sender is both sender and recipient
- Enables self-recovery via SenderRecoveryService
```

### Background Submission (Phase 3)
```
Order matters:
1. Submit burn first
   await submitBurnCommitment(bundle.sourceToken.burn)

2. Submit mints in parallel
   await Promise.all([
     submitMintCommitment(bundle.newTokens[0].mint),
     submitMintCommitment(bundle.newTokens[1].mint)
   ])
```

### Proof Acquisition (Phase 3)
```
Order matters:
1. Fetch burn proof first (may be required for mint validation)
   await waitInclusionProof(burnRequestId)

2. Fetch mint proofs in parallel
   await Promise.all([
     waitInclusionProof(mintRequestId[0]),
     waitInclusionProof(mintRequestId[1])
   ])

Timeout: 60 seconds per proof
Retry: Exponential backoff, no limit
```

---

## Status Transitions

### Sender Path
```
INITIATED
  ↓
COMMITMENT_CREATED (after commitment bundle created)
  ↓
NOSTR_DELIVERED (after both Nostr sends complete)
  ↓
(background: submission + proof acquisition)
  ↓
COMPLETED
```

### Outbox Status
```
INSTANT_SPLIT_PENDING
  → bundle created, awaiting submission

INSTANT_SPLIT_DELIVERED
  → both Nostr sends successful

AWAITING_PROOFS
  → commitments submitted, waiting for proofs

COMPLETED
  → proofs acquired, token finalized
```

---

## Recovery Scenarios

### Scenario 1: Browser Crash During Submission
**Condition:** Outbox entry in INSTANT_SPLIT_PENDING
**Recovery:**
1. Detect orphaned entry at startup
2. Check if burn was submitted (query aggregator)
3. If not: submit all commitments
4. If yes: continue to mint submission
5. Proceed to proof acquisition

### Scenario 2: Recipient Never Receives Event
**Condition:** Nostr relay down
**Recovery:**
1. Sender retries Nostr send (exponential backoff)
2. After max retries: mark as FAILED
3. User can manually retry
4. Sender's change token still recoverable via SenderRecoveryService

### Scenario 3: Burn Succeeds, All Mints Fail
**Condition:** All mints rejected after 10 retries
**Recovery:**
1. Detect: burn proof acquired, mint proofs never come
2. Create recovery mint for total amount back to sender
3. Submit recovery mint (unlimited retries)
4. Mark split as PARTIALLY_RECOVERED
5. Notify user: "X tokens recovered to wallet"

### Scenario 4: Partial Proof Acquisition
**Condition:** Burn + 1 mint proof acquired, 1 mint stuck
**Resolution:**
1. Token with proof: moved to Active (confirmed)
2. Token without proof: remains PENDING_PROOF
3. Background retry continues (unlimited)
4. UI shows: "1 of 2 tokens confirmed"

---

## Testing Checklist

### Unit Tests (Per Phase)
- [ ] Type definitions valid and usable
- [ ] Commitment bundle structure correct
- [ ] Payment session tracking accurate
- [ ] TokenSplitExecutor early return works
- [ ] Nostr send succeeds and returns event ID
- [ ] Split handler saves token and queues bundle
- [ ] Commitment submission order correct
- [ ] Proof acquisition timing correct
- [ ] Recovery detects orphaned splits
- [ ] Recovery resumes from all states

### Integration Tests
- [ ] Full sender → recipient flow in < 3 seconds critical path
- [ ] Background submission completes within 60 seconds
- [ ] Both payment and change tokens visible in UI < 500ms
- [ ] Token finalization after proof acquisition
- [ ] Sender recovery retrieves all sent tokens
- [ ] Orphaned recovery at startup
- [ ] Burn failure recovery creates mint

### Edge Cases
- [ ] Nostr delivery fails for payment (before change sent)
- [ ] Nostr delivery fails for change (after payment sent)
- [ ] Aggregator submission timeout
- [ ] Proof fetch timeout (trigger retry)
- [ ] Multiple quick splits by same user
- [ ] Split to same address (boomerang)
- [ ] Large number of splits in queue

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Critical Path | 2-3s | Time to UI completion |
| Nostr Delivery | < 1s | Time per Nostr send |
| Background Submit | < 30s | Time to all proofs acquired |
| Recipient Visible | < 500ms | Time token appears in UI |
| Total Completion | < 60s | 90% of splits |

---

## Key Constants

```typescript
// Event kind for INSTANT_SPLIT
INSTANT_SPLIT_TOKEN_KIND = 21066

// Timeouts
PROOF_FETCH_TIMEOUT_MS = 60000        // 60s per proof
SESSION_TIMEOUT_MS = 300000           // 5min total
PROOF_RETRY_INTERVAL_MS = 2000        // 2s between retries

// Retries
MAX_SUBMISSION_RETRIES = 10           // Before recovery mint
RECOVERY_BACKOFF_MAX_MS = 60000       // 60s max backoff
```

---

## Design Principles

1. **Persistence First:** Bundle saved to outbox before Nostr send
2. **Recipients Responsible:** Recipients submit and fetch proofs (deferred)
3. **Self-Receive Pattern:** Change token sent to sender like external payment
4. **Recovery-Oriented:** All operations can resume after restart
5. **No Value Loss:** Burn recovery if all mints fail
6. **Immediate Visibility:** Token saved before background work starts

---

## Success Criteria

**Sender Experience:**
- Sees "Transfer complete" in < 3 seconds
- No need to wait for aggregator

**Recipient Experience:**
- Sees unconfirmed balance immediately
- Background processes commitments transparently
- UI updates as proofs arrive

**Reliability:**
- 99%+ successful deliveries
- 99.5%+ successful proof acquisitions
- 100% recovery coverage for failures

---

**Reference Documents:**
- Detailed Plan: `/home/vrogojin/sphere/INSTANT_SPLIT_REFACTORING_PLAN.md`
- Spec Section: TOKEN_INVENTORY_SPEC.md Section 15
