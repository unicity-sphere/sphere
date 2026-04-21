# Unicity Network Architecture

## 5-Layer Stack

The Unicity Network is organized in five layers, each with distinct responsibilities:

```
┌─────────────────────────────────────────────────────────────┐
│  L5  WALLET / AGENT LAYER                                   │
│                                                              │
│  sphere          React 19 web wallet                        │
│  openclaw        AI agent with 15 Unicity tools             │
│  orchestrator    MCP tool discovery via knowledge graph      │
│                                                              │
│  Responsibilities: UI, key management, agent operations     │
├─────────────────────────────────────────────────────────────┤
│  L4  STATE TRANSITION LAYER                                 │
│                                                              │
│  sphere-sdk              Core SDK (payments, tokens, proofs)│
│  state-transition-sdk    Predicates, TXF format, lifecycle  │
│                                                              │
│  Responsibilities: Token logic, ownership, state validity   │
├─────────────────────────────────────────────────────────────┤
│  L3  AGGREGATION LAYER                                      │
│                                                              │
│  aggregator-go    Sparse Merkle Tree, JSON-RPC API          │
│                                                              │
│  Responsibilities: Batch proofs, 1M+ commits/sec           │
├─────────────────────────────────────────────────────────────┤
│  L2  BFT CONSENSUS LAYER                                    │
│                                                              │
│  bft-core         Byzantine Fault Tolerance consensus       │
│                                                              │
│  Responsibilities: Fast finality (1s), state ordering       │
├─────────────────────────────────────────────────────────────┤
│  L1  PROOF OF WORK LAYER                                    │
│                                                              │
│  alpha            RandomX mining, UTXO, ASERT difficulty    │
│                                                              │
│  Responsibilities: Ultimate finality, token creation        │
└─────────────────────────────────────────────────────────────┘
```

## Transaction Lifecycle

A token transfer flows through all layers:

```
User clicks "Send" in sphere
        │
        ▼
L5: sphere builds TransferRequest via usePayments() hook
        │
        ▼
L4: sphere-sdk.payments.send() constructs StateTransition
    state-transition-sdk evaluates predicates, builds new TXF
        │
        ▼
L3: SDK calls aggregator certification_request (JSON-RPC)
    Aggregator batches commitment into next SMT block
        │
        ▼
L2: Aggregator submits SMT root to bft-core
    Validators reach consensus (1-second round)
        │
        ▼
L1: bft-core anchors finalized block to alpha PoW chain
    RandomX miners include anchor in next block (~2 min)
        │
        ▼
L3→L5: SDK polls get_inclusion_proof
        Proof verified locally, UI updated
```

## Cross-Layer Communication

```
L5 ──TypeScript API──► L4 ──JSON-RPC──► L3 ──Internal──► L2 ──Anchor──► L1
                                          │
L5 ◄──Nostr NIP-17──► L5                 │
L5 ◄──IPFS/IPNS───── Storage             │
L4 ◄──JSON-RPC──────── L3 ◄──────────────┘
```

## Dual-Layer Payment Model

- **L1 (slow, final)**: Token creation, UTXO-based transfers, mining rewards. ~2 min finality.
- **L2 (fast, near-final)**: State transition ordering, BFT consensus. ~1 sec finality.

Most user operations use L2 for speed. L1 provides anchoring for ultimate security.
