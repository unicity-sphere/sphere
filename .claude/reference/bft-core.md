# bft-core

> **Purpose:** Go implementation of the Unicity BFT consensus layer (L2) — provides fast Byzantine Fault Tolerant consensus with 1-second round times for state transition ordering.

## Build & Test

```bash
go build ./...              # Build all packages
go test ./...               # Run all tests
go vet ./...                # Static analysis
golangci-lint run           # Extended linting
```

## Public API

### Core Types
- **`Validator`** — A consensus participant with a secp256k1 keypair and voting weight.
- **`Round`** — A single consensus round (~1 second). Contains proposals and votes.
- **`Block`** — Finalized block with validator signatures reaching quorum.
- **`Proposal`** — Block proposal submitted by the round leader.

### Consensus
- **`ConsensusEngine`** — Main BFT engine managing rounds, proposals, and vote counting.
- **`ValidatorSet`** — The current set of validators with their weights.
- **`PartitionedLedger`** — Ledger supporting parallel processing of independent state partitions.

### Network
- **P2P** message passing between validators
- **Leader rotation** per round

## Dependencies

- L1 (alpha) — Anchors finalized blocks to PoW chain

## Depended On By

- `aggregator-go` — Submits SMT roots for consensus ordering
- `sphere-sdk` — Reads finalized state from L2

## Key Patterns

- **1-second rounds**: Optimistic fast path when leader is honest.
- **Partitioned ledger**: Independent state partitions can be processed in parallel.
- **Quorum-based**: 2/3+ validator weight required for block finality.

## Constraints

- Byzantine tolerance: up to 1/3 faulty validators
- Round timeout must be respected — late votes are discarded
- Validator set changes require a special governance transaction
- All messages are signed with secp256k1

## Status

Core consensus engine and validator management are operational. Partitioned ledger and advanced leader election are in progress.
