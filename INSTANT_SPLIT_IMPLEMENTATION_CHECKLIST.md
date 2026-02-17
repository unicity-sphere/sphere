# INSTANT_SPLIT Implementation Checklist

**Document Purpose:** Detailed task breakdown for developers
**Last Updated:** 2026-01-30

---

## Phase 1: Foundation (Types & Session Management)

### 1.1 InstantTransferTypes.ts - Type Definitions

#### [ ] New Interface: SplitCommitmentBundle
- [ ] Add interface definition
- [ ] Properties: splitGroupId, sourceToken, newTokens, createdAt, paymentSessionId
- [ ] Document per TOKEN_INVENTORY_SPEC.md Section 15.2
- [ ] Add JSDoc with usage example

#### [ ] New Interface: InstantSplitPayload
- [ ] Add interface definition
- [ ] Properties: version, splitGroupId, role, token, commitmentBundle, senderPubkey, senderNametag
- [ ] Document per TOKEN_INVENTORY_SPEC.md Section 15.9
- [ ] Add JSDoc with encryption note

#### [ ] Extend PaymentSession for SplitPaymentSession
- [ ] Add type property: 'DIRECT_TRANSFER' | 'INSTANT_SPLIT'
- [ ] Add splitGroupId?: string
- [ ] Add splitTokens?: Array<{tokenId, role, status, recipientAddress}>
- [ ] Document status values: PENDING | NOSTR_CONFIRMED | PROOF_ACQUIRED | FAILED

#### [ ] Extend PaymentSessionStatus Type
- [ ] Add 'INSTANT_SPLIT_PENDING'
- [ ] Add 'INSTANT_SPLIT_DELIVERED'
- [ ] Add 'AWAITING_PROOFS'
- [ ] Add 'PARTIAL_PROOF'

#### [ ] Helper Functions
- [ ] Implement createSplitCommitmentBundle()
- [ ] Implement isSplitSessionComplete()
- [ ] Implement getSplitProgress()
- [ ] Add tests for all helpers

#### [ ] Code Quality
- [ ] Run tsc --noEmit (no type errors)
- [ ] ESLint passes
- [ ] JSDoc complete for all types
- [ ] No unused imports

---

### 1.2 PaymentSessionManager.ts - Split Session Support

#### [ ] Extend CreateSessionParams
- [ ] Add optional type parameter
- [ ] Add optional splitGroupId
- [ ] Add optional splitTokens array

#### [ ] Modify createSession()
- [ ] Accept new type parameter
- [ ] Initialize SplitPaymentSession when type === 'INSTANT_SPLIT'
- [ ] Initialize splitTokens array with all PENDING status
- [ ] Add JSDoc noting split-specific behavior

#### [ ] Add updateSplitTokenStatus()
- [ ] Accept (sessionId, tokenId, status)
- [ ] Find token in splitTokens array
- [ ] Update status
- [ ] Check if all Nostr-confirmed → advance session
- [ ] Notify listeners
- [ ] Add test coverage

#### [ ] Add getSplitProgress()
- [ ] Accept sessionId
- [ ] Return {total, nostrConfirmed, fullyConfirmed}
- [ ] Handle missing splitTokens gracefully
- [ ] Add test coverage

#### [ ] Code Quality
- [ ] Run tests: npm run test:run
- [ ] No new lint warnings
- [ ] Backward compatibility maintained
- [ ] Update CHANGELOG.md

---

## Phase 2: Sender Flow (Commitment Creation & Delivery)

### 2.1 TokenSplitExecutor.ts - Commitment Bundle Creation

#### [ ] Modify executeSplitPlan() Signature
- [ ] Add instantMode?: boolean parameter
- [ ] Update return type to include instantSplitBundle
- [ ] Update return type to include nostrDeliveryPending
- [ ] Add JSDoc with new parameter documentation

#### [ ] Add Early Return Logic
- [ ] Check instantMode parameter
- [ ] If true: delegate to createSplitCommitmentBundleOnly()
- [ ] Return early without aggregator submission
- [ ] Return early without proof waiting
- [ ] Preserve normal flow when instantMode === false

#### [ ] Create createSplitCommitmentBundleOnly()
- [ ] Validate source token is unspent
- [ ] Validate sufficient balance
- [ ] Create burn salt and commitment
- [ ] Create mint salts and commitments
- [ ] Reconstruct unfinalized tokens
- [ ] Create SplitCommitmentBundle
- [ ] Persist to outbox with INSTANT_SPLIT_PENDING status
- [ ] Return bundle + Nostr recipient list
- [ ] Add comprehensive error handling
- [ ] Add debug logging

#### [ ] Outbox Integration
- [ ] Verify outbox entry type: 'INSTANT_SPLIT'
- [ ] Verify outbox status: INSTANT_SPLIT_PENDING
- [ ] Store serialized bundle in commitmentJson
- [ ] Store splitGroupId in entry

#### [ ] Code Quality
- [ ] Run tests: npm run test TokenSplitExecutor.test.ts
- [ ] Test instantMode=true path
- [ ] Test instantMode=false path (backward compat)
- [ ] Test early return (no aggregator calls)
- [ ] Test outbox persistence
- [ ] No new lint warnings

---

### 2.2 NostrService.ts - Part 1 (Sender Delivery)

#### [ ] Add Constant
- [ ] INSTANT_SPLIT_TOKEN_KIND = 21066
- [ ] Add comment with spec reference

#### [ ] Add sendInstantSplitToken()
- [ ] Accept (recipientPubkey, payload)
- [ ] Validate payload structure
- [ ] Serialize payload to JSON
- [ ] Encrypt via TokenTransferProtocol
- [ ] Send via this.client?.sendTokenTransfer()
- [ ] Return event ID from relay
- [ ] Handle Nostr failure (throw error)
- [ ] Add logging (encrypt, send, success/fail)
- [ ] Add test coverage

#### [ ] Implement sendInstantSplitToken() Error Handling
- [ ] Check this.client exists (await start if needed)
- [ ] Throw on sendTokenTransfer failure
- [ ] Log error details
- [ ] Handle timeout gracefully

#### [ ] Code Quality
- [ ] Test: recipient delivery succeeds
- [ ] Test: recipient delivery fails
- [ ] Test: event ID extraction
- [ ] Verify no new linting issues

---

## Phase 3: Recipient Flow (Background Submission & Proofs)

### 3.1 InventoryBackgroundLoops.ts - Split Commitment Queue

#### [ ] Create SplitCommitmentQueue Class
- [ ] Private queue: Array<{splitGroupId, role, token, commitmentBundle, ...}>
- [ ] Private isProcessing: boolean
- [ ] Constructor accepts identityManager, config

#### [ ] Implement queueSplitCommitmentBundle()
- [ ] Add item to queue
- [ ] Log queue size
- [ ] Start processing if not running
- [ ] Handle queue.length = 0 (early return)

#### [ ] Implement processQueue()
- [ ] While loop: while queue.length > 0
- [ ] Shift item from queue
- [ ] Call processSplitCommitmentBundle()
- [ ] Catch errors and requeue with backoff
- [ ] Yield to event loop between items

#### [ ] Implement processSplitCommitmentBundle()
- [ ] Submit burn commitment
- [ ] Submit mint commitments in parallel
- [ ] Check response statuses
- [ ] Throw on failure
- [ ] Emit split-proof-acquired event (after proof fetch)

#### [ ] Integrate into InventoryBackgroundLoopsManager
- [ ] Add splitCommitmentQueue field
- [ ] Add getSplitCommitmentQueue() getter
- [ ] Initialize in initialize()
- [ ] Cleanup in cleanupLoops()

#### [ ] Code Quality
- [ ] No linting issues
- [ ] Logging is clear and helpful

---

### 3.2 SplitCommitmentService.ts (New File)

#### [ ] File Setup
- [ ] Create `/home/vrogojin/sphere/src/components/wallet/L3/services/SplitCommitmentService.ts`
- [ ] Add standard file header comment
- [ ] Import required types and services
- [ ] Export class

#### [ ] Singleton Pattern
- [ ] Private static instance field
- [ ] Private constructor
- [ ] Public static getInstance()
- [ ] Test singleton behavior

#### [ ] Implement submitSplitCommitments()
- [ ] Accept bundle
- [ ] Submit burn first: await client.submitBurnCommitment()
- [ ] Check response status (SUCCESS or REQUEST_ID_EXISTS)
- [ ] Submit mints in parallel: await Promise.all()
- [ ] Return {burnRequestId, mintRequestIds}
- [ ] Throw on failure
- [ ] Add logging
- [ ] Test all success paths
- [ ] Test idempotent handling

#### [ ] Implement fetchSplitProofs()
- [ ] Accept {burn, mints} requestIds
- [ ] Fetch burn proof: await waitInclusionProofWithDevBypass()
- [ ] Fetch mint proofs in parallel: await Promise.all()
- [ ] Timeout: 60 seconds
- [ ] Return {burnProof, mintProofs}
- [ ] Throw on failure
- [ ] Add logging
- [ ] Test all success paths
- [ ] Test timeout behavior

#### [ ] Implement completeSplitWithProofs()
- [ ] Accept bundle, proofs
- [ ] TODO: Verify SDK proof attachment API
- [ ] Attach proofs to tokens
- [ ] Update localStorage with finalized tokens
- [ ] Emit split-completed event
- [ ] Add logging

#### [ ] Code Quality
- [ ] Run tsc --noEmit (no errors)
- [ ] ESLint passes
- [ ] Comprehensive JSDoc
- [ ] Ready for test file creation

---

### 3.3 NostrService.ts - Part 2 (Recipient Reception)

#### [ ] Add Subscription in subscribeToPrivateEvents()
- [ ] Create Filter with kind = INSTANT_SPLIT_TOKEN_KIND
- [ ] Set filter["#p"] to public key
- [ ] Set since to lastSync
- [ ] Subscribe with onEvent handler
- [ ] Add logging: "End of stored INSTANT_SPLIT events"

#### [ ] Add Case in handleIncomingEvent()
- [ ] Check event.kind === INSTANT_SPLIT_TOKEN_KIND
- [ ] Call handleInstantSplitToken(event)
- [ ] Return {success, token} from result
- [ ] Maintain error handling

#### [ ] Implement handleInstantSplitToken()
- [ ] Decrypt payload using TokenTransferProtocol
- [ ] Parse JSON payload
- [ ] Validate structure (token, commitmentBundle, splitGroupId)
- [ ] Call saveReceivedToken()
- [ ] Log immediate save
- [ ] Queue for background processing (see below)
- [ ] Handle errors gracefully (return empty array)

#### [ ] Queue for Background Processing
- [ ] Get InventoryBackgroundLoopsManager
- [ ] Initialize if needed
- [ ] Get SplitCommitmentQueue
- [ ] Create queue item {splitGroupId, role, token, commitmentBundle, ...}
- [ ] Call queueSplitCommitmentBundle()
- [ ] Handle queue errors (continue - token already saved)
- [ ] Log queuing

#### [ ] Code Quality
- [ ] Test subscription setup
- [ ] Test event reception and decryption
- [ ] Test immediate token save
- [ ] Test background queue addition
- [ ] Test both PAYMENT and CHANGE roles
- [ ] No new linting issues

---

## Phase 4: Recovery Mechanisms

### 4.1 SplitRecoveryService.ts (New File)

#### [ ] File Setup
- [ ] Create `/home/vrogojin/sphere/src/components/wallet/L3/services/SplitRecoveryService.ts`
- [ ] Add standard file header
- [ ] Import required types and services
- [ ] Export class

#### [ ] Singleton Pattern
- [ ] Private static instance field
- [ ] Private constructor
- [ ] Public static getInstance()

#### [ ] Implement recoverOrphanedSplits()
- [ ] Load outbox entries with status INSTANT_SPLIT_PENDING or AWAITING_PROOFS
- [ ] For each entry:
  - [ ] Call recoverSingleSplit()
  - [ ] Count recovered vs failed
- [ ] Return {recovered, failed}
- [ ] Add logging
- [ ] Test recovery detection
- [ ] Test recovery execution
- [ ] Test statistics return

#### [ ] Implement recoverSingleSplit()
- [ ] Deserialize bundle from outbox entry
- [ ] Check burn status via aggregator
- [ ] If not submitted: submit burn + mints
- [ ] If submitted: check mints
- [ ] If mints not submitted: submit them
- [ ] Check proofs
- [ ] If proofs not acquired: fetch them
- [ ] Update outbox entry status
- [ ] Add logging at each step
- [ ] Handle all state combinations

#### [ ] Implement recoverSplitBurnFailure()
- [ ] Check if burn was included (verify aggregator status)
- [ ] If included: create recovery mint for total amount
- [ ] Submit recovery mint with unlimited retries
- [ ] Mark split as PARTIALLY_RECOVERED
- [ ] Return {action: 'RECOVERY_MINT_CREATED', recoveryMintCreated: true}
- [ ] Add user notification (TODO: define mechanism)
- [ ] Test recovery mint creation

#### [ ] Code Quality
- [ ] Run tsc --noEmit
- [ ] ESLint passes
- [ ] Comprehensive logging
- [ ] JSDoc complete

---

### 4.2 SenderRecoveryService.ts - Extend for INSTANT_SPLIT

#### [ ] Add recoverInstantSplitTokens()
- [ ] Query Nostr for INSTANT_SPLIT_TOKEN_KIND events
- [ ] Filter by authors: [walletPubkey]
- [ ] Decrypt each payload
- [ ] Handle PAYMENT role: add to Sent folder
- [ ] Handle CHANGE role: add to Active folder
- [ ] Count tokens by role
- [ ] Return {paymentTokensRecovered, changeTokensRecovered, errors}
- [ ] Add logging
- [ ] Test payment token recovery
- [ ] Test change token recovery
- [ ] Test error handling

#### [ ] Integrate into existing recovery flow
- [ ] Call recoverInstantSplitTokens() in main recovery sequence
- [ ] Merge results into overall recovery statistics
- [ ] Test integration with other recovery types

#### [ ] Code Quality
- [ ] Backward compatible with existing recovery
- [ ] Comprehensive error handling
- [ ] Clear logging

---

### 4.3 OutboxRecoveryService.ts - Add INSTANT_SPLIT Support

#### [ ] Add Case in recoverOutboxEntry()
- [ ] Check entry.status === INSTANT_SPLIT_PENDING
- [ ] Delegate to SplitRecoveryService
- [ ] Check entry.status === AWAITING_PROOFS
- [ ] Delegate to SplitRecoveryService
- [ ] Return updated entry

#### [ ] Test Status Transitions
- [ ] INSTANT_SPLIT_PENDING → AWAITING_PROOFS
- [ ] AWAITING_PROOFS → COMPLETED
- [ ] AWAITING_PROOFS → PARTIAL_PROOF
- [ ] All failure paths

---

## Phase 5: Testing

### 5.1 TokenSplitExecutor.test.ts - Add INSTANT_SPLIT Tests

#### [ ] Test executeSplitPlan with instantMode=true
- [ ] Should create commitment bundle
- [ ] Should NOT submit to aggregator
- [ ] Should NOT wait for proofs
- [ ] Should persist to outbox
- [ ] Should return bundle and Nostr recipients
- [ ] Should execute in < 1 second

#### [ ] Test executeSplitPlan with instantMode=false
- [ ] Backward compatibility
- [ ] Normal flow still works
- [ ] Proofs still acquired

#### [ ] Test createSplitCommitmentBundleOnly()
- [ ] Burn commitment created
- [ ] Mint commitments created
- [ ] Tokens reconstructed
- [ ] Bundle persisted
- [ ] Nostr recipients included
- [ ] Error on already-spent token

#### [ ] Edge Cases
- [ ] Insufficient balance
- [ ] Invalid recipient address
- [ ] SDK commitment creation fails
- [ ] Outbox save fails

---

### 5.2 NostrService.test.ts - Add INSTANT_SPLIT Tests

#### [ ] Test sendInstantSplitToken()
- [ ] Payload encrypted correctly
- [ ] Sent to recipient pubkey
- [ ] Event ID returned
- [ ] Failure handling
- [ ] Logging

#### [ ] Test handleInstantSplitToken()
- [ ] Payload decrypted
- [ ] Token saved immediately
- [ ] Commitment queued for background
- [ ] Both PAYMENT and CHANGE roles handled
- [ ] Invalid payload handled
- [ ] Decryption failure handled

#### [ ] Test subscription
- [ ] Filter includes kind 21066
- [ ] Events received and processed
- [ ] Deduplication working

---

### 5.3 SplitCommitmentService.test.ts (New File)

#### [ ] Test submitSplitCommitments()
- [ ] Burn submitted first
- [ ] Mints submitted in parallel
- [ ] Success response handling
- [ ] REQUEST_ID_EXISTS handled
- [ ] Failure response throws
- [ ] Request IDs returned

#### [ ] Test fetchSplitProofs()
- [ ] Burn proof fetched first
- [ ] Mint proofs fetched in parallel
- [ ] 60 second timeout enforced
- [ ] Success proofs returned
- [ ] Timeout throws error
- [ ] Retry behavior

#### [ ] Test completeSplitWithProofs()
- [ ] Proofs attached to tokens
- [ ] localStorage updated
- [ ] Event emitted
- [ ] Logging

---

### 5.4 SplitRecoveryService.test.ts (New File)

#### [ ] Test recoverOrphanedSplits()
- [ ] Detects INSTANT_SPLIT_PENDING entries
- [ ] Detects AWAITING_PROOFS entries
- [ ] Recovers from all states
- [ ] Returns statistics
- [ ] Handles errors

#### [ ] Test recoverSingleSplit()
- [ ] Resumes from INSTANT_SPLIT_PENDING
- [ ] Resumes from AWAITING_PROOFS
- [ ] Submits missing commitments
- [ ] Fetches missing proofs
- [ ] Updates outbox status

#### [ ] Test recoverSplitBurnFailure()
- [ ] Detects burn succeeded
- [ ] Creates recovery mint
- [ ] Submits with unlimited retries
- [ ] Marks as PARTIALLY_RECOVERED

---

### 5.5 Integration Tests

#### [ ] Full Sender → Recipient Flow
- [ ] Critical path: 2-3 seconds
- [ ] Both tokens delivered via Nostr
- [ ] UI updates immediately

#### [ ] Background Submission
- [ ] Commitments submitted in background
- [ ] Proofs acquired in background
- [ ] Tokens finalized < 60 seconds

#### [ ] Recovery Flows
- [ ] Orphaned splits detected at startup
- [ ] Recovery completes successfully
- [ ] Tokens appear in correct folders

#### [ ] Error Scenarios
- [ ] Nostr delivery fails
- [ ] Aggregator unavailable
- [ ] Proof fetch timeout
- [ ] Browser crash (simulated)

---

### 5.6 Test Execution

#### [ ] Run All Tests
- [ ] `npm run test:run` passes all tests
- [ ] No new test failures
- [ ] Coverage meets minimum (80%+)

#### [ ] Type Checking
- [ ] `npx tsc --noEmit` passes
- [ ] No unused variables
- [ ] No implicit any types

#### [ ] Linting
- [ ] `npm run lint` passes
- [ ] No warnings or errors
- [ ] Code style consistent

---

## Final Validation

### [ ] Code Review Checklist
- [ ] All new types documented with JSDoc
- [ ] All new methods documented with JSDoc
- [ ] Error handling comprehensive
- [ ] Logging helpful and not excessive
- [ ] No breaking changes to existing APIs
- [ ] Backward compatibility maintained

### [ ] Performance Validation
- [ ] Sender critical path: 2-3 seconds
- [ ] Background completion: < 60 seconds
- [ ] Token visible in UI: < 500ms
- [ ] No memory leaks
- [ ] No excessive event listeners

### [ ] Documentation
- [ ] INSTANT_SPLIT_REFACTORING_PLAN.md complete
- [ ] INSTANT_SPLIT_QUICK_REFERENCE.md complete
- [ ] Code comments explain complex logic
- [ ] New classes documented

### [ ] Deployment Checklist
- [ ] All tests passing
- [ ] TypeScript strict mode satisfied
- [ ] Lint warnings resolved
- [ ] Build succeeds: `npm run build`
- [ ] No console errors in dev mode
- [ ] Feature flag ready (if needed)
- [ ] Rollback plan documented

---

## Sign-Off

- [ ] Development Complete
- [ ] All Tests Passing
- [ ] Code Review Approved
- [ ] Performance Validated
- [ ] Ready for Staging
- [ ] Ready for Production

---

**Estimated Effort Per Phase:**
- Phase 1 (Foundation): 1 day
- Phase 2 (Sender): 2 days
- Phase 3 (Recipient): 3 days
- Phase 4 (Recovery): 2 days
- Phase 5 (Testing): 2-3 days

**Total:** 10-13 days

---

**Document Version:** 1.0
**Last Updated:** 2026-01-30
