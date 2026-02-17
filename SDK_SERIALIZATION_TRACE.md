# SDK Serialization Trace: Inclusion Proof in Hash

This document traces the exact code path showing how inclusion proofs participate in the mint transaction hash calculation.

## Call Stack

```
MintTransactionData.calculateHash()
  ↓
new DataHasher(SHA256).update(this.toCBOR()).digest()
  ↓
MintTransactionData.toCBOR()  [Line 96-98]
  ↓
CborSerializer.encodeArray(..., this.reason.toCBOR())  [Line 97, last argument]
  ↓
SplitMintReason.toCBOR()  [Line 78-80]
  ↓
CborSerializer.encodeArray(this.token.toCBOR(), ...)  [Line 79, first argument]
  ↓
Token.toCBOR()  [Line 201-203]
  ↓
CborSerializer.encodeArray(..., this.genesis.toCBOR(), ...)  [Line 202, third argument]
  ↓
MintTransaction.toCBOR()  [Line 70-72]
  ↓
CborSerializer.encodeArray(this.data.toCBOR(), this.inclusionProof.toCBOR())  [Line 71]
  ↓
InclusionProof.toCBOR()  ← INCLUSION PROOF IS SERIALIZED HERE!
```

## Source Code References

### 1. MintTransactionData.calculateHash()
**File**: `node_modules/@unicitylabs/state-transition-sdk/lib/transaction/MintTransactionData.js`
**Lines**: 116-118

```javascript
calculateHash() {
  return new DataHasher(HashAlgorithm.SHA256).update(this.toCBOR()).digest();
}
```

### 2. MintTransactionData.toCBOR()
**File**: `node_modules/@unicitylabs/state-transition-sdk/lib/transaction/MintTransactionData.js`
**Lines**: 96-98

```javascript
toCBOR() {
  return CborSerializer.encodeArray(
    this.tokenId.toCBOR(),
    this.tokenType.toCBOR(),
    CborSerializer.encodeOptional(this.tokenData, CborSerializer.encodeByteString),
    CborSerializer.encodeOptional(this.coinData, (coins) => coins.toCBOR()),
    CborSerializer.encodeTextString(this.recipient.address),
    CborSerializer.encodeByteString(this.salt),
    CborSerializer.encodeOptional(this.recipientDataHash, (hash) => hash.toCBOR()),
    CborSerializer.encodeOptional(this.reason, (reason) => reason.toCBOR())  // ← Reason is serialized
  );
}
```

### 3. SplitMintReason.toCBOR()
**File**: `node_modules/@unicitylabs/state-transition-sdk/lib/token/fungible/SplitMintReason.js`
**Lines**: 78-80

```javascript
toCBOR() {
  return CborSerializer.encodeArray(
    this.token.toCBOR(),  // ← Token (with all transactions) is serialized
    CborSerializer.encodeArray(...this._proofs.map((proof) => proof.toCBOR()))
  );
}
```

### 4. Token.toCBOR()
**File**: `node_modules/@unicitylabs/state-transition-sdk/lib/token/Token.js`
**Lines**: 201-203

```javascript
toCBOR() {
  return CborSerializer.encodeArray(
    CborSerializer.encodeTextString(this.version),
    this.state.toCBOR(),
    this.genesis.toCBOR(),  // ← Genesis MintTransaction is serialized
    CborSerializer.encodeArray(...this._transactions.map((transaction) => transaction.toCBOR())),  // ← All TransferTransactions are serialized
    CborSerializer.encodeArray(...this._nametagTokens.map((token) => token.toCBOR()))
  );
}
```

### 5. MintTransaction.toCBOR()
**File**: `node_modules/@unicitylabs/state-transition-sdk/lib/transaction/MintTransaction.js`
**Lines**: 70-72

```javascript
toCBOR() {
  return CborSerializer.encodeArray(
    this.data.toCBOR(),
    this.inclusionProof.toCBOR()  // ← INCLUSION PROOF IS SERIALIZED!
  );
}
```

### 6. TransferTransaction.toCBOR()
**File**: `node_modules/@unicitylabs/state-transition-sdk/lib/transaction/TransferTransaction.js`
**Lines**: 55-57

```javascript
toCBOR() {
  return CborSerializer.encodeArray(
    this.data.toCBOR(),
    this.inclusionProof.toCBOR()  // ← INCLUSION PROOF IS SERIALIZED!
  );
}
```

## The Proof of Impact

### Scenario 1: Mint with Dummy Proof

```javascript
// Create burned token with dummy inclusion proof
const dummyProof = new InclusionProof(
  new DataHash(new Uint8Array(32)), // dummy hash
  new Authenticator(publicKey, dummySignature),
  dummyPath,
  dummyRootCert
);

const burnedTokenDummy = new Token(
  burnedState,
  new MintTransaction(genesisData, dummyProof),  // ← Dummy proof
  [new TransferTransaction(transferData, dummyProof)]  // ← Dummy proof
);

const splitReasonDummy = new SplitMintReason(burnedTokenDummy, splitProofs);
const mintDataDummy = await MintTransactionData.create(
  tokenId, tokenType, null, coinData, recipient, salt, null,
  splitReasonDummy  // ← Contains burned token with dummy proofs
);

const hashDummy = mintDataDummy.calculateHash();
// hashDummy = DataHash("0x1234abcd...")
```

### Scenario 2: Mint with Real Proof

```javascript
// Same token, but with REAL inclusion proof
const realProof = await waitForInclusionProof(burnCommitment);

const burnedTokenReal = new Token(
  burnedState,
  new MintTransaction(genesisData, realProof),  // ← Real proof
  [new TransferTransaction(transferData, realProof)]  // ← Real proof
);

const splitReasonReal = new SplitMintReason(burnedTokenReal, splitProofs);
const mintDataReal = await MintTransactionData.create(
  tokenId, tokenType, null, coinData, recipient, salt, null,
  splitReasonReal  // ← Contains burned token with REAL proofs
);

const hashReal = mintDataReal.calculateHash();
// hashReal = DataHash("0x9876fedc...")

// RESULT: hashDummy !== hashReal ❌
```

## Binary Comparison

Let's trace what actually changes in the CBOR:

```
MintTransactionData CBOR (dummy):
[
  tokenId: 0x...,
  tokenType: 0x...,
  tokenData: null,
  coinData: {...},
  recipient: "...",
  salt: 0x...,
  recipientDataHash: null,
  reason: [  // ← SplitMintReason
    token: [  // ← Token
      version: "2.0",
      state: {...},
      genesis: [  // ← MintTransaction
        data: {...},
        inclusionProof: {  // ← DUMMY PROOF (32 bytes of zeros or whatever)
          transactionHash: 0x0000000000000000000000000000000000000000000000000000000000000000,
          authenticator: {...},
          path: [...],
          rootCert: {...}
        }
      ],
      transactions: [
        [
          data: {...},
          inclusionProof: {  // ← DUMMY PROOF
            transactionHash: 0x0000000000000000000000000000000000000000000000000000000000000000,
            ...
          }
        ]
      ],
      nametags: []
    ],
    proofs: [...]
  ]
]

MintTransactionData CBOR (real):
[
  ... (same as above until inclusionProof) ...
  inclusionProof: {  // ← REAL PROOF (actual blockchain data)
    transactionHash: 0xabc123def456...,  // ← DIFFERENT!
    authenticator: {...},  // ← DIFFERENT SIGNATURE!
    path: [...],  // ← DIFFERENT PATH!
    rootCert: {...}  // ← POTENTIALLY DIFFERENT!
  }
]
```

**Result**: The binary CBOR is different → SHA256 produces different hash → Hash mismatch!

## Why `reason=null` Works (Dev Mode Only)

When we use `reason=null`:

```javascript
const mintData = await MintTransactionData.create(
  tokenId, tokenType, null, coinData, recipient, salt, null,
  null  // ← reason = null
);
```

The CBOR becomes:

```
MintTransactionData CBOR (reason=null):
[
  tokenId: 0x...,
  tokenType: 0x...,
  tokenData: null,
  coinData: {...},
  recipient: "...",
  salt: 0x...,
  recipientDataHash: null,
  reason: null  // ← NO BURNED TOKEN, NO INCLUSION PROOFS!
]
```

**Result**: No inclusion proofs in the CBOR → Hash is stable and deterministic → Works!

**BUT**: Production aggregator will **REJECT** `reason=null` for token splits because it cannot validate the burn.

## Verification Trace (Why Production Rejects `reason=null`)

When the aggregator receives a mint commitment, it validates:

```javascript
// Aggregator validation logic (conceptual)
async function validateMintCommitment(commitment) {
  const mintData = await MintTransactionData.fromCBOR(commitment.data);

  // For token splits, reason MUST be SplitMintReason
  if (isSplit(mintData)) {
    if (mintData.reason === null) {
      return { status: "INVALID_REASON", error: "SplitMintReason required for token splits" };
    }

    // Validate the burned token
    const burnedToken = mintData.reason.token;
    const burnVerification = await burnedToken.verify(trustBase);
    if (!burnVerification.isSuccessful) {
      return { status: "BURN_VERIFICATION_FAILED", error: burnVerification.message };
    }

    // Validate the SplitMintReason proofs
    const proofVerification = await mintData.reason.verify(commitment);
    if (!proofVerification.isSuccessful) {
      return { status: "SPLIT_PROOF_VERIFICATION_FAILED", error: proofVerification.message };
    }
  }

  // All checks passed
  return { status: "SUCCESS" };
}
```

## Conclusion

The inclusion proof is **NOT** at the top level of the hash input, but it **IS** deeply nested within the serialization chain:

1. We hash `MintTransactionData`
2. Which includes `SplitMintReason`
3. Which includes `Token` (the burned token)
4. Which includes `MintTransaction` (genesis) and `TransferTransaction[]` (history)
5. Which include `InclusionProof`
6. Which gets serialized to CBOR
7. Which changes when we replace dummy with real proof
8. Which changes the final hash

**Therefore**: Any attempt to use dummy proofs and replace them later will result in a hash mismatch and verification failure.

**The only workaround** is `reason=null`, which only works in dev mode where validation is skipped.

**Production requires the real burn proof** before creating the mint commitment, which means we must wait for the burn inclusion proof on the critical path.
