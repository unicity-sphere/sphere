# Unicity Network Architecture

> **Purpose:** Cross-cutting architecture reference — the 5-layer stack, data flow, and inter-layer protocols.

## 5-Layer Stack

```
 User Apps / AI Agents
        │
┌───────▼────────────────────────────┐
│  L5  Wallet / Agent Layer          │  TypeScript
│  sphere, openclaw, orchestrator    │
│  User interaction, key management  │
├────────────────────────────────────┤
│  L4  State Transition Layer        │  TypeScript
│  sphere-sdk, state-transition-sdk  │
│  Token lifecycle, predicates       │
├────────────────────────────────────┤
│  L3  Aggregation Layer             │  Go
│  aggregator-go                     │
│  SMT, inclusion proofs, JSON-RPC   │
├────────────────────────────────────┤
│  L2  BFT Consensus Layer           │  Go
│  bft-core                          │
│  1s rounds, validator quorum       │
├────────────────────────────────────┤
│  L1  Proof of Work Layer           │  C++
│  alpha                             │
│  RandomX, UTXO, 2min blocks       │
└────────────────────────────────────┘
```

## Transaction Lifecycle

1. **User initiates** (L5): User creates a transfer via sphere app or agent tool.
2. **SDK constructs** (L4): sphere-sdk builds a `StateTransition` with new owner predicate.
3. **Commitment submitted** (L3): Transition hash sent to aggregator via `certification_request`.
4. **SMT inclusion** (L3): Aggregator includes commitment in next Sparse Merkle Tree block.
5. **BFT consensus** (L2): SMT root submitted to bft-core for consensus ordering.
6. **PoW anchoring** (L1): Finalized L2 block anchored to L1 PoW chain.
7. **Proof available** (L3→L4→L5): Inclusion proof retrievable via `get_inclusion_proof`.

## Inter-Layer Protocols

| From → To | Protocol | Data |
|-----------|----------|------|
| L5 → L4 | TypeScript API | TransferRequest, TokenState |
| L4 → L3 | JSON-RPC | certification_request, get_inclusion_proof |
| L3 → L2 | Internal Go | SMT root hash |
| L2 → L1 | P2P + RPC | Anchor transactions |
| L5 ↔ L5 | Nostr (NIP-04/17) | Encrypted peer messages |
| L5 ↔ Storage | IPFS/IPNS | Content-addressed state |

## Key Design Properties

- **Separation of concerns**: Each layer handles one responsibility. No layer bypasses another.
- **Proof-based verification**: State is verified by cryptographic proofs, not trust.
- **Horizontal scalability**: L3 aggregator supports 1M+ commits/sec via batch processing.
- **Privacy by default**: Masked predicates hide token ownership at L4.
- **Finality gradient**: L2 provides fast finality (1s), L1 provides ultimate finality (2min blocks).
