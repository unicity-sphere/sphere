# SDK Proof Regeneration Safety Analysis

## Executive Summary

✅ **SAFE**: The current implementation correctly regenerates only **inclusion proofs** (Type 1), NOT split reason proofs (Type 2).

The Unicity SDK's `SplitMintReason` contains Merkle paths that are **immutable parts of the transaction data**. Changing them would invalidate the transaction hash. Our token recovery code only regenerates **external inclusion proofs**, which is safe.

## What Our Code Does

### Location: TokenValidationService.ts (Line 640-674)

```typescript
// Try to fetch proofs for each uncommitted transaction
for (let i = 0; i < transactions.length; i++) {
  const tx = transactions[i];
  if (tx.inclusionProof === null && tx.newStateHash) {  // ← TYPE 1 PROOF
    try {
      const proof = await this.fetchProofFromAggregator(tx.newStateHash);
      if (proof) {
        transactions[i] = { ...tx, inclusionProof: proof as TxfInclusionProof };  // ← REGENERATING TYPE 1
        modified = true;
      }
    } catch (err) {
      console.warn(`Failed to fetch proof for transaction ${i}:`, err);
    }
  }
}
```

### What This Does

1. Iterates through transactions in a token's history
2. Finds transactions missing inclusion proofs (`tx.inclusionProof === null`)
3. Fetches fresh inclusion proof from aggregator using `tx.newStateHash`
4. Updates the transaction's inclusion proof field

### What This Does NOT Do

- ❌ Does NOT modify `genesis.data.reason` (SplitMintReason)
- ❌ Does NOT regenerate Merkle paths inside SplitMintReason
- ❌ Does NOT touch transaction data that affects the hash

## The Two Proof Types

### Type 1: Inclusion Proof (SAFE to regenerate)
**Location**: `txf.transactions[].inclusionProof` OR `txf.genesis.inclusionProof`
**Purpose**: Proves the transaction was included in the aggregator tree
**Source**: Aggregator service (via `getInclusionProof`)
**Mutability**: Can be regenerated at any time
**Structure**:
```typescript
{
  authenticator: {
    stateHash: "0x...",  // The state hash this proves
    signature: "0x..."    // Aggregator signature
  },
  merkleTreePath: {
    root: "0x...",         // Current tree root
    steps: [               // Path from leaf to root
      { path: "0", data: "0x..." },  // Sibling hashes
      { path: "1", data: "0x..." },
      ...
    ]
  }
}
```

### Type 2: Split Reason Proof (IMMUTABLE - part of transaction data)
**Location**: `txf.genesis.data.reason.proofs[]` (only in mint transactions from splits)
**Purpose**: Proves the mint was created from a valid token burn
**Source**: TokenSplitBuilder during split operation
**Mutability**: IMMUTABLE - part of transaction hash
**Structure**:
```typescript
{
  token: { ...burned token... },
  proofs: [
    {
      coinId: "0x...",
      aggregationPath: {     // ← IMMUTABLE (from burn's local tree)
        root: "0x...",
        steps: [...]
      },
      coinTreePath: {        // ← IMMUTABLE (from burn's local tree)
        root: "0x...",
        steps: [...]
      }
    }
  ]
}
```

## How Transaction Hash is Calculated

From SDK source (`MintTransactionData.js` line 116):

```javascript
calculateHash() {
    return new DataHasher(HashAlgorithm.SHA256).update(this.toCBOR()).digest();
}

toCBOR() {
    return CborSerializer.encodeArray(
        this.tokenId.toCBOR(),
        this.tokenType.toCBOR(),
        CborSerializer.encodeOptional(this.tokenData, CborSerializer.encodeByteString),
        CborSerializer.encodeOptional(this.coinData, (coins) => coins.toCBOR()),
        CborSerializer.encodeTextString(this.recipient.address),
        CborSerializer.encodeByteString(this.salt),
        CborSerializer.encodeOptional(this.recipientDataHash, (hash) => hash.toCBOR()),
        CborSerializer.encodeOptional(this.reason, (reason) => reason.toCBOR())  // ← TYPE 2 PROOFS HERE
    );
}
```

**Key Point**: The `reason` parameter (containing SplitMintReason with Type 2 proofs) is included in the transaction hash. Changing it would invalidate the transaction.

## Proof Regeneration Flow

### During Token Recovery (IPFS sync, wallet import, etc.)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Load Token from IPFS                                         │
│    - Contains TxfToken structure                                │
│    - May have missing/stale inclusion proofs (Type 1)           │
│    - Has immutable genesis data with SplitMintReason (Type 2)   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. TokenValidationService.validateToken()                       │
│    - Checks for missing inclusion proofs                        │
│    - Calls attemptProofRecovery()                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. For each transaction with missing inclusion proof:           │
│                                                                  │
│    if (tx.inclusionProof === null && tx.newStateHash) {         │
│      // Fetch fresh Type 1 proof from aggregator                │
│      const proof = await fetchProofFromAggregator(newStateHash);│
│      tx.inclusionProof = proof;  // ✅ SAFE                      │
│    }                                                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Return updated token with fresh inclusion proofs             │
│    - Type 1 proofs regenerated ✅                               │
│    - Type 2 proofs unchanged ✅                                 │
│    - Transaction hashes still valid ✅                          │
└─────────────────────────────────────────────────────────────────┘
```

## Why This Works

### Type 1 Proofs (Inclusion Proofs)
- **External to transaction data**: Stored alongside the transaction, not inside it
- **Prove transaction exists**: Show that a specific state hash was committed
- **Can change**: Merkle path grows as tree grows, but proves same fact
- **Regeneration is safe**: Getting a new proof for the same state hash doesn't change the transaction

### Type 2 Proofs (Split Reason)
- **Internal to transaction data**: Part of `genesis.data.reason`
- **Prove burn was valid**: Show the split was created from a legitimate burn
- **Cannot change**: Part of the transaction hash calculation
- **Regeneration is impossible**: Would create a different transaction entirely

### Analogy
- **Type 1**: Like a library checkout record - you can reprint it anytime with current system
- **Type 2**: Like your signature on the original book loan form - can't change without invalidating the form

## SDK Verification Process

When the SDK validates a split token (from `SplitMintReason.verify()` in SDK):

```javascript
async verify(transaction) {
    // 1. Check that the source token is burned
    const predicate = await PredicateEngineService.createPredicate(this.token.state.predicate);
    if (!(predicate instanceof BurnPredicate)) {
        return new VerificationResult(FAIL, 'Token is not burned.');
    }
    
    // 2. Verify each coin's Merkle paths (TYPE 2 PROOFS)
    for (const proof of this._proofs) {
        // 2a. Verify aggregation path (from burn's local tree)
        const aggregationPathResult = await proof.aggregationPath.verify(proof.coinId.toBitString().toBigInt());
        
        // 2b. Verify coin tree path (from burn's local tree)
        const coinTreePathResult = await proof.coinTreePath.verify(transaction.data.tokenId.toBitString().toBigInt());
        
        // 2c. Verify aggregation path root matches burn reason
        if (!proof.aggregationPath.root.equals(predicate.reason)) {
            return new VerificationResult(FAIL, 'Aggregation path root does not match burn reason.');
        }
    }
    
    return new VerificationResult(OK);
}
```

**What this proves:**
- The Merkle paths in SplitMintReason (Type 2) are about the **burn transaction's internal structure**
- They prove the burn had the right coins with the right amounts
- They're NOT about the aggregator's global tree (that's what Type 1 proofs are for)
- They were captured at burn time and are immutable evidence

## Code Verification

### Grep for All Inclusion Proof Updates
```bash
grep -rn "inclusionProof.*=" src/components/wallet/L3/
```

Results show we only set inclusion proofs in these contexts:
1. **TokenValidationService.ts:652** - Regenerating missing proofs ✅
2. **TokenRecoveryService.ts:362** - Updating embedded nametag proofs ✅

Neither touches the `genesis.data.reason` field.

### Verification of Immutability
The Type 2 proofs in `genesis.data.reason.proofs[]` are:
- Only created once (during split operation via `TokenSplitBuilder.createSplitMintCommitments()`)
- Never modified after creation
- Part of the transaction data that gets hashed
- Validated by SDK's `Token.verify()` which checks them against the burned token

## Conclusion

✅ **Our implementation is SAFE and CORRECT**

We only regenerate Type 1 proofs (inclusion proofs), which are:
- External to the transaction data
- Proof that a state hash exists in the tree
- Safe to update as the tree grows

We never touch Type 2 proofs (split reason proofs), which are:
- Internal to the transaction data
- Part of the transaction hash
- Immutable evidence of a valid burn

The SDK's design explicitly separates these two types of proofs:
- Type 1 changes: Tree structure evolves, paths get longer
- Type 2 never changes: Historical evidence of the burn operation

## Recommendations

1. ✅ **Continue current approach** - only regenerate inclusion proofs
2. ✅ **Add comments** in code to clarify the two proof types
3. ✅ **Document in TOKEN_INVENTORY_SPEC.md** that split reason proofs are immutable
4. ✅ **Add defensive check** to ensure we never modify `genesis.data.reason`

## Reference Files

- `/home/vrogojin/sphere/SPLIT_MINT_REASON_ANALYSIS.md` - Detailed SDK analysis
- `/home/vrogojin/sphere/SPLIT_MINT_PROOF_TYPES.md` - Visual proof comparison
- `/home/vrogojin/sphere/src/components/wallet/L3/services/TokenValidationService.ts:640-674` - Proof regeneration code
- `node_modules/@unicitylabs/state-transition-sdk/lib/transaction/MintTransactionData.js:116` - Hash calculation
- `node_modules/@unicitylabs/state-transition-sdk/lib/token/fungible/SplitMintReason.js:42-76` - Verification logic
