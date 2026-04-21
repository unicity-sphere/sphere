# Proof System

> **Purpose:** How inclusion proofs flow through the Unicity stack from aggregation to wallet.

## Sparse Merkle Trees (SMT)

The aggregator (L3) builds Sparse Merkle Trees from state transition commitments.

- **Leaves**: Hash of each state transition commitment
- **Tree**: Binary Merkle tree with 2^256 possible leaves (most empty)
- **Root**: Single hash representing all commitments in a block
- **Proof**: Path from leaf to root (O(log n) hashes)

## Proof Flow

```
L4 (SDK)                    L3 (Aggregator)                L2 (BFT)
   │                             │                            │
   ├─ certification_request ───► │                            │
   │   (commitment hash)         │                            │
   │                             ├─ Collect commitments       │
   │                             ├─ Build SMT                 │
   │                             ├─ Submit root ────────────► │
   │                             │                            ├─ BFT consensus
   │                             │                ◄── Finalize │
   │  ◄── get_inclusion_proof ── │                            │
   │   (merkle path + root)      │                            │
```

## Proof Verification

To verify an inclusion proof:

1. Start with the commitment hash (leaf)
2. Apply each step in the Merkle path (hash with sibling, going up)
3. Compare final hash with the known SMT root
4. Verify the SMT root was finalized by BFT consensus

## Proof Properties

- **Self-contained**: A proof can be verified without access to the full tree
- **Compact**: O(log n) size regardless of total commitments
- **Non-interactive**: Verification requires no communication with the aggregator
- **Batch-friendly**: Multiple proofs can share path segments

## Performance

- Aggregator processes 1M+ commits/second
- Proof generation is O(log n) per commitment
- Proof verification is O(log n) hash operations
