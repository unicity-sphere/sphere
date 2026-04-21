# TXF — Token eXchange Format

> **Purpose:** The canonical data format for representing token state in the Unicity Network.

## Structure

A TXF record contains:

```
TxfStorageDataBase {
  tokenId: string           // Unique token identifier
  ownerPredicate: Predicate // Who controls this token
  data: object              // Arbitrary payload (amount, metadata, etc.)
  proofChain: Proof[]       // Ordered list of inclusion proofs
  stateHash: string         // SHA-256 hash of current state
  version: number           // Schema version
}
```

## Owner Predicates

Predicates define ownership conditions:

- **Unmasked**: `{ type: "unmasked", publicKey: "02abc..." }` — anyone can verify the owner
- **Masked**: `{ type: "masked", hash: "sha256(publicKey)" }` — owner is hidden, proven by revealing key

## State Transitions

A state transition transforms TXF:

```
currentState + operation → newState + commitment

Operations:
  - transfer(newOwnerPredicate)
  - split(amounts[])
  - join(tokenIds[])
  - update(newData)
```

## Proof Chain

Each state transition appends an inclusion proof:

```
proofChain: [
  { blockHeight: 100, merkleRoot: "abc...", merklePath: [...] },
  { blockHeight: 105, merkleRoot: "def...", merklePath: [...] },
  ...
]
```

The proof chain provides a complete auditable history of the token.

## Constraints

- TXF is immutable — transitions create new TXF, they don't modify existing
- Token IDs are globally unique
- State hashes must be deterministic (same state → same hash)
- Proof chains are append-only (no pruning, no rewriting)
