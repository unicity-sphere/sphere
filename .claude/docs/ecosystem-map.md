# Unicity Network Ecosystem Map

Master inventory of all repositories, their status, key components, and integration points.

## Repository Inventory

| Repository | Language | Layer | Status | Description |
|---|---|---|---|---|
| **sphere** | TypeScript | L5 | Active | React 19 wallet/token management app |
| **sphere-sdk** | TypeScript | L4-L5 | Active | Core SDK for all Unicity operations |
| **state-transition-sdk** | TypeScript | L4 | Active | State transition logic, predicates, TXF |
| **openclaw-unicity** | TypeScript | L5 | Active | AI agent plugin (15 tools) |
| **unicity-orchestrator** | TypeScript | L5 | In Progress | MCP orchestrator with knowledge graph |
| **aggregator-go** | Go | L3 | Active | SMT aggregation, inclusion proofs |
| **bft-core** | Go | L2 | Active | BFT consensus, 1-second rounds |
| **alpha** | C++ | L1 | Active | RandomX PoW, UTXO model |

## Integration Map

```
sphere (React app)
  └── sphere-sdk (SDK)
        ├── state-transition-sdk (predicates, TXF)
        ├── aggregator-go (JSON-RPC: proofs)
        ├── bft-core (consensus state)
        └── alpha (L1 payments)

openclaw-unicity (AI agent)
  └── sphere-sdk

unicity-orchestrator (MCP)
  ├── sphere-sdk
  └── openclaw-unicity
```

## Key Components Per Repo

### sphere
- SDK adapter layer (SphereProvider, hooks)
- Pages: Wallet, Tokens, Settings, Agent
- TanStack Query cache management
- Vite build configuration

### sphere-sdk
- Sphere class (main entry point)
- PaymentsModule, L1PaymentsModule, TokensModule, ProofsModule
- Provider interfaces (Transport, Oracle, Storage)
- Identity (BIP-39/BIP-32 key management)
- ~1475 tests

### state-transition-sdk
- StateTransitionClient
- Predicate system (masked/unmasked)
- TxfStorageDataBase format
- Proof chain management

### openclaw-unicity
- UnicityPlugin (OpenClaw entry)
- 15 agent tools (wallet, payments, tokens, identity, proofs, network)
- BIP-32 HD wallet manager
- Nostr identity adapter

### unicity-orchestrator
- Knowledge graph engine
- MCP server with tool discovery
- Intent-based tool routing

### aggregator-go
- Sparse Merkle Tree implementation
- JSON-RPC API (certification_request, get_inclusion_proof, get_block_height)
- MongoDB storage backend
- Block producer (batch SMT construction)

### bft-core
- ConsensusEngine (round management)
- ValidatorSet (weighted voting)
- PartitionedLedger (parallel state)
- P2P networking

### alpha
- MiningEngine (RandomX PoW)
- UTXO transaction model
- ASERT difficulty adjustment
- Block validation and chain management
