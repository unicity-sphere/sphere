# aggregator-go

> **Purpose:** Go implementation of the Unicity aggregation layer (L3) — builds Sparse Merkle Trees from state transition commitments and serves inclusion proofs via JSON-RPC.

## Build & Test

```bash
go build ./...              # Build all packages
go test ./...               # Run all tests
go vet ./...                # Static analysis
golangci-lint run           # Extended linting
gofmt -w .                  # Format
```

## Public API

### JSON-RPC Methods
- **`certification_request`** — Submit a state transition commitment for inclusion in the next SMT block.
- **`get_inclusion_proof`** — Retrieve the Merkle inclusion proof for a given commitment hash.
- **`get_block_height`** — Returns the current block height of the aggregation layer.

### Core Types
- **`SparseMerkleTree`** — SMT implementation with batch insert and proof generation.
- **`InclusionProof`** — Merkle path from leaf to root proving inclusion.
- **`Block`** — Aggregated block containing SMT root and commitment set.
- **`Commitment`** — State transition commitment (hash of TXF state).

### Storage
- **MongoDB** backend for persistent block and proof storage.
- Configurable via environment variables.

## Dependencies

- L2 (bft-core) — Submits SMT roots for BFT consensus

## Depended On By

- `sphere-sdk` — Queries inclusion proofs via JSON-RPC
- `state-transition-sdk` — Submits commitments via JSON-RPC

## Key Patterns

- **Batch processing**: Commitments are collected and batch-inserted into SMT at block boundaries.
- **High throughput**: Designed for 1M+ commits/second.
- **Stateless proofs**: Inclusion proofs are self-contained — verifiable without access to the full tree.

## Constraints

- SMT operations must be deterministic (same inputs → same root hash)
- MongoDB connection required for persistence
- Block height is monotonically increasing
- JSON-RPC API must remain backward-compatible

## Status

Core SMT, JSON-RPC API, and MongoDB storage are production-ready. High availability features are in progress.
