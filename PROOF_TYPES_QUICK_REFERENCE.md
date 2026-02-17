# Unicity Proof Types - Quick Reference Card

## Two Types of Merkle Proofs

### Type 1: Inclusion Proof
**What**: Proves a transaction exists in the aggregator tree  
**Where**: `txf.genesis.inclusionProof` or `txf.transactions[i].inclusionProof`  
**Regenerate**: ✅ YES - safe and necessary  
**Changes**: Merkle path grows as tree grows  
**Source**: Aggregator API `getInclusionProof(requestId)`

### Type 2: Split Reason Proof
**What**: Proves a mint came from a valid burn  
**Where**: `txf.genesis.data.reason.proofs[]` (only in split tokens)  
**Regenerate**: ❌ NO - would invalidate transaction  
**Changes**: NEVER - immutable part of transaction data  
**Source**: TokenSplitBuilder (created once during split)

## Quick Decision Tree

```
Need to update a proof?
│
├─ Is it in txf.*.inclusionProof?
│  └─ YES → Type 1 → ✅ SAFE to regenerate
│
└─ Is it in genesis.data.reason.proofs[]?
   └─ YES → Type 2 → ❌ NEVER regenerate
```

## Code Patterns

### ✅ SAFE - Regenerate Type 1
```typescript
// Fetch fresh inclusion proof from aggregator
if (tx.inclusionProof === null && tx.newStateHash) {
  const proof = await aggregatorClient.getInclusionProof(requestId);
  tx.inclusionProof = proof; // ✅ SAFE
}
```

### ❌ UNSAFE - Would invalidate transaction
```typescript
// DON'T DO THIS - would change transaction hash
const genesis = txf.genesis;
if (genesis.data?.reason?.proofs) {
  genesis.data.reason.proofs = newProofs; // ❌ BREAKS TRANSACTION
}
```

## Why Type 2 Can't Be Regenerated

```typescript
// From SDK: MintTransactionData.calculateHash()
calculateHash() {
  return SHA256(
    tokenId,
    tokenType,
    tokenData,
    coinData,
    recipient,
    salt,
    recipientDataHash,
    reason  // ← Type 2 proofs are IN THE HASH
  );
}
```

Changing `reason.proofs` → Different hash → Invalid transaction

## What Each Proves

| Type | Proves | About |
|------|--------|-------|
| Type 1 | This state hash exists in tree | Global aggregator tree |
| Type 2 | This burn had valid coin structure | Local split operation |

## Locations in Code

**Type 1 Regeneration**:
- `/src/components/wallet/L3/services/TokenValidationService.ts:648-652`
- `/src/components/wallet/L3/services/TokenRecoveryService.ts:362`

**Type 2 Creation (never modified after)**:
- `node_modules/@unicitylabs/state-transition-sdk/lib/transaction/split/TokenSplitBuilder.js:73`

## Memory Aid

**Type 1** = **E**xternal = **E**volvable (can change as tree grows)  
**Type 2** = **I**nternal = **I**mmutable (part of transaction data)
