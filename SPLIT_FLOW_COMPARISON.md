# Token Split Flow Comparison: Current vs. INSTANT_SEND

## Current Split Flow (12 seconds)

```
┌─────────────────────────────────────────────────────────────────────┐
│ USER CLICKS "SEND" → Loading spinner shows for 12 seconds          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 1: BURN TOKEN                                        [0-3.3s] │
│                                                                       │
│  ┌────────────────────────────────────────────────────────┐         │
│  │ 1. Create burn commitment                     ~10ms    │         │
│  │ 2. Create outbox entry (recovery)             ~5ms     │         │
│  │ 3. Submit to aggregator         ──────────→  ~300ms    │ 🌐      │
│  │ 4. Wait for inclusion proof     ──────────→  ~3s       │ 🌐⏱️   │
│  │    └─ Poll every 1s for up to 60s                      │         │
│  └────────────────────────────────────────────────────────┘         │
│                                                                       │
│  ⚠️ USER WAITING: Aggregator round-trip #1                          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 2: MINT SPLIT TOKENS                               [3.3-7.1s] │
│                                                                       │
│  ┌────────────────────────────────────────────────────────┐         │
│  │ 1. Create mint commitments (× 2)           ~20ms       │         │
│  │    - Change token (sender keeps)                       │         │
│  │    - Recipient token (pre-transfer)                    │         │
│  │                                                         │         │
│  │ 2. Create outbox entries (× 2)             ~10ms       │         │
│  │                                                         │         │
│  │ 3. Submit to aggregator (SEQUENTIAL)  ───────→ ~700ms  │ 🌐      │
│  │    ├─ Submit mint #1 (change)          ~350ms          │         │
│  │    └─ Submit mint #2 (recipient)       ~350ms          │         │
│  │                                                         │         │
│  │ 4. Wait for proofs (PARALLEL)        ───────→ ~3s      │ 🌐⏱️   │
│  │    ├─ Poll for proof #1                                │         │
│  │    └─ Poll for proof #2                                │         │
│  │                                                         │         │
│  │ 5. Persist tokens to localStorage         ~10ms        │         │
│  └────────────────────────────────────────────────────────┘         │
│                                                                       │
│  ⚠️ USER WAITING: Aggregator round-trip #2 (parallel but still 3s)  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 3: IPFS SYNC (BLOCKING)                             [7.1-9s] │
│                                                                       │
│  ┌────────────────────────────────────────────────────────┐         │
│  │ Pre-transfer IPFS sync checkpoint     ──────→  ~2s     │ ☁️⏱️   │
│  │                                                         │         │
│  │ └─ Sync change token to IPFS via:                      │         │
│  │    - HTTP API to backend                               │         │
│  │    - Helia DHT operations                              │         │
│  │    - IPNS update                                       │         │
│  └────────────────────────────────────────────────────────┘         │
│                                                                       │
│  ⚠️ USER WAITING: IPFS network I/O (unnecessary for user success)   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 4: TRANSFER TO RECIPIENT                            [9-12.3s] │
│                                                                       │
│  ┌────────────────────────────────────────────────────────┐         │
│  │ 1. Create transfer commitment              ~10ms       │         │
│  │ 2. Create outbox entry                     ~5ms        │         │
│  │ 3. Submit to aggregator         ──────────→ ~300ms     │ 🌐      │
│  │ 4. Wait for inclusion proof     ──────────→ ~3s        │ 🌐⏱️   │
│  └────────────────────────────────────────────────────────┘         │
│                                                                       │
│  ⚠️ USER WAITING: Aggregator round-trip #3                          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 5: NOSTR DELIVERY                                    [12.3s] │
│                                                                       │
│  ┌────────────────────────────────────────────────────────┐         │
│  │ Send split token to recipient via Nostr   ~100ms       │ 📡      │
│  │                                                         │         │
│  │ └─ Payload includes:                                   │         │
│  │    - Source token                                      │         │
│  │    - Transfer transaction (with proof)                 │         │
│  └────────────────────────────────────────────────────────┘         │
│                                                                       │
│  ✅ RECIPIENT RECEIVES TOKEN                                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ SUCCESS MESSAGE SHOWN TO USER                             [~12.3s] │
└─────────────────────────────────────────────────────────────────────┘

```

**Key Issues:**
- 🔴 3 sequential aggregator waits = 9s (73% of total time)
- 🔴 1 blocking IPFS sync = 2s (16% of total time)
- 🔴 Nostr delivery happens LAST (user waits entire flow)

---

## INSTANT_SEND Split Flow (0.1-0.2 seconds user-perceived)

```
┌─────────────────────────────────────────────────────────────────────┐
│ USER CLICKS "SEND" → Success shown in <200ms! 🎉                   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ CRITICAL PATH (USER-PERCEIVED)                          [0-0.15s]  │
│                                                                       │
│  ┌────────────────────────────────────────────────────────┐         │
│  │ Phase A: Create ALL commitments (local only)           │         │
│  │  ├─ Burn commitment                      ~10ms         │         │
│  │  ├─ Mint commitment #1 (change)          ~10ms         │         │
│  │  ├─ Mint commitment #2 (recipient)       ~10ms         │         │
│  │  └─ Transfer commitment                  ~10ms         │         │
│  │                                          ────────       │         │
│  │                                           TOTAL: 40ms   │         │
│  │                                                         │         │
│  │ Phase B: Persist to outbox (recovery)      ~5ms        │ 💾      │
│  │  └─ Save split group with all commitments              │         │
│  │                                                         │         │
│  │ Phase C: Create payment session            ~1ms        │ 📋      │
│  │  └─ Track split operation state                        │         │
│  │                                                         │         │
│  │ Phase D: Build split package               ~5ms        │ 📦      │
│  │  └─ Bundle all commitments for Nostr delivery          │         │
│  │                                                         │         │
│  │ Phase E: Send via Nostr                  ~100ms        │ 📡      │
│  │  └─ Queue for immediate delivery                       │         │
│  │                                                         │         │
│  │ 🎯 USER SEES SUCCESS HERE!               ~150ms        │         │
│  └────────────────────────────────────────────────────────┘         │
│                                                                       │
│  ✅ RECIPIENT RECEIVES SPLIT PACKAGE (commitments, not proofs)      │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ BACKGROUND LANE 1: Aggregator Submission         [async, ~12s]     │
│                                                                       │
│  ┌────────────────────────────────────────────────────────┐         │
│  │ (Fire-and-forget background processing)                │         │
│  │                                                         │         │
│  │ 1. Submit burn commitment        ──────→ ~300ms        │ 🌐      │
│  │ 2. Wait for burn proof           ──────→ ~3s           │ 🌐⏱️   │
│  │                                                         │         │
│  │ 3. Submit mint commitments (parallel) ──→ ~700ms       │ 🌐      │
│  │    ├─ Mint #1 (change)                                 │         │
│  │    └─ Mint #2 (recipient)                              │         │
│  │                                                         │         │
│  │ 4. Wait for mint proofs (parallel) ───→ ~3s            │ 🌐⏱️   │
│  │                                                         │         │
│  │ 5. Submit transfer commitment    ──────→ ~300ms        │ 🌐      │
│  │ 6. Wait for transfer proof       ──────→ ~3s           │ 🌐⏱️   │
│  │                                                         │         │
│  │ 7. Update outbox status: COMPLETED                     │         │
│  └────────────────────────────────────────────────────────┘         │
│                                                                       │
│  ℹ️ If sender fails, recipient can submit commitments              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ BACKGROUND LANE 2: IPFS Sync                     [async, ~2s]      │
│                                                                       │
│  ┌────────────────────────────────────────────────────────┐         │
│  │ Sync change token to IPFS (non-blocking)    ~2s        │ ☁️      │
│  │                                                         │         │
│  │ └─ Token already in localStorage (safe!)               │         │
│  └────────────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ BACKGROUND LANE 3: Recovery Monitoring           [async, ongoing]  │
│                                                                       │
│  ┌────────────────────────────────────────────────────────┐         │
│  │ Payment session tracking:                              │         │
│  │  - Monitor for failures                                │         │
│  │  - Retry failed operations                             │         │
│  │  - Cleanup on success                                  │         │
│  └────────────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Improvements:**
- ✅ User sees success in **150ms** (vs. 12s = **98% faster**)
- ✅ All aggregator operations happen in background
- ✅ IPFS sync non-blocking (happens after user success)
- ✅ Recipient gets commitments immediately, can self-submit if sender fails
- ✅ Trustless delivery (recipient doesn't depend on sender's reliability)

---

## Side-by-Side Comparison

| Operation | Current Flow | INSTANT_SEND Flow | Difference |
|-----------|--------------|-------------------|------------|
| **Create burn commitment** | 10ms (blocking) | 10ms (blocking) | Same |
| **Submit burn to aggregator** | 300ms (blocking) | 300ms (background) | ✅ Non-blocking |
| **Wait for burn proof** | 3s (blocking) | 3s (background) | ✅ Non-blocking |
| **Create mint commitments** | 20ms (blocking) | 20ms (blocking) | Same |
| **Submit mints to aggregator** | 700ms (blocking) | 700ms (background) | ✅ Non-blocking |
| **Wait for mint proofs** | 3s (blocking) | 3s (background) | ✅ Non-blocking |
| **IPFS sync** | 2s (blocking) | 2s (background) | ✅ Non-blocking |
| **Create transfer commitment** | 10ms (blocking) | 10ms (blocking) | Same |
| **Submit transfer to aggregator** | 300ms (blocking) | 300ms (background) | ✅ Non-blocking |
| **Wait for transfer proof** | 3s (blocking) | 3s (background) | ✅ Non-blocking |
| **Send via Nostr** | 100ms (blocking, last) | 100ms (blocking, first) | ✅ Moved to critical path |
| | | | |
| **USER-PERCEIVED TIME** | **~12s** | **~150ms** | **98% faster** |
| **TOTAL END-TO-END TIME** | **~12s** | **~12s (background)** | **Same (but hidden)** |

---

## What Enables This Speedup?

### 1. Commitment-First Architecture
- **Old:** Submit → wait for proof → then send to recipient
- **New:** Create commitment → send to recipient → submit in background

### 2. Trust Shift
- **Old:** Recipient trusts sender will successfully complete all on-chain operations
- **New:** Recipient receives commitments and can verify/submit themselves if needed

### 3. Payload Structure
```typescript
// OLD PAYLOAD (after all proofs obtained):
{
  sourceToken: TokenJson,
  transferTx: TransactionJson,  // ← Has inclusion proof
}

// NEW PAYLOAD (commitments only):
{
  sourceToken: TokenJson,
  burnCommitment: CommitmentJson,      // ← No proof yet
  mintCommitments: CommitmentJson[],   // ← No proofs yet
  transferCommitment: CommitmentJson,  // ← No proof yet
  recipientTokenIndex: 1,              // ← Which mint is theirs
}
```

### 4. Background Processing
```typescript
// OLD: Sequential blocking in main thread
await submitBurn();
await waitBurnProof();
await submitMints();
await waitMintProofs();
await submitTransfer();
await waitTransferProof();
await sendNostr();

// NEW: Immediate Nostr, then background queue
await sendNostr(); // ← User sees success!
queueSplitForBackgroundProcessing({
  burn, mints, transfer
}); // ← Fire-and-forget
```

---

## Failure Modes & Recovery

### Current Flow: Sender-Centric
```
Sender submits all → waits for all proofs → sends to recipient
                                              ↓
                                    If any step fails → User sees error
                                    Recipient gets nothing → Value stuck
```

### INSTANT_SEND Flow: Trustless
```
Sender creates commitments → sends to recipient → background submission
                                    ↓                        ↓
                         Recipient has commitments    Sender submits
                                    ↓                        ↓
                              Can self-submit         If sender fails
                              if sender fails         recipient submits
                                    ↓                        ↓
                                    Both paths lead to success!
```

**Recovery Scenarios:**

| Scenario | Current Flow | INSTANT_SEND Flow |
|----------|--------------|-------------------|
| Network error during burn | User sees error, retry | Background retries, user already saw success |
| Burn succeeds, mint fails | Token value lost! | Recipient can retry mint (commitment has burn proof) |
| Sender crashes after burn | Value locked, manual recovery | Recipient has commitments, can submit |
| Aggregator down | User waits/fails | User sees success, background retries |
| IPFS sync fails | Blocks transfer | Non-blocking, retries in background |

---

## Migration Path

### Step 1: Quick Wins (No architectural change)
1. Remove blocking IPFS sync → fire-and-forget
2. Parallelize mint submissions
3. **Result:** 12s → 10s (17% improvement)

### Step 2: INSTANT_SEND Implementation
1. Implement split package protocol
2. Add background processing queue
3. Update Nostr delivery to send commitments
4. Add recipient-side submission logic
5. **Result:** 10s → 0.15s user-perceived (98% improvement)

---

## User Experience Comparison

### Current Flow
```
User clicks "Send 50 UNI"
↓
Loading spinner appears...
↓
... waiting ...
↓
... waiting ...
↓
... waiting ...
↓
... waiting ...
↓
... 12 seconds later ...
↓
"Transfer successful!" ✅
```

**User reaction:** 😤 "Why is this so slow?"

### INSTANT_SEND Flow
```
User clicks "Send 50 UNI"
↓
Immediate success message! ✅
↓
"Transfer in progress" badge (optional)
↓
... background processing ...
↓
... ~12 seconds later ...
↓
Badge updates to "Transfer complete!" ✅
```

**User reaction:** 😊 "Wow, that was fast!"

---

## Conclusion

The INSTANT_SEND architecture achieves **98% reduction in user-perceived latency** by:

1. **Creating commitments locally** (no aggregator waits)
2. **Sending commitments to recipient immediately** (Nostr-first)
3. **Processing aggregator operations in background** (fire-and-forget)
4. **Enabling recipient self-submission** (trustless fallback)

This transforms split operations from a 12-second blocking flow to a <200ms instant experience, matching the performance of single token INSTANT_SEND transfers.
