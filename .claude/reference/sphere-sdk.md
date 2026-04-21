# sphere-sdk

> **Purpose:** TypeScript SDK providing the core API for Unicity token operations — payments, state transitions, identity, and provider-based network access.

## Build & Test

```bash
npx tsup          # Build (outputs to dist/)
npx vitest run    # Run all tests (~1475 tests)
npx eslint .      # Lint
npx tsc --noEmit  # Type check only
```

## Public API

### Core
- **`Sphere`** — Main entry point. Instantiated with config, provides access to all modules.
- **`SphereConfig`** — Configuration: network endpoints, providers, identity.
- **`Identity`** — secp256k1 keypair (BIP-39 mnemonic, BIP-32 derivation). Signs transactions.

### Modules
- **`PaymentsModule`** — L2 (BFT) token transfers: send, receive, track, list transactions.
- **`L1PaymentsModule`** — L1 (PoW) operations: UTXO management, coinbase, anchoring.
- **`TokensModule`** — Token lifecycle: create, transfer, split, join, query state.
- **`ProofsModule`** — Inclusion proof retrieval and verification via aggregator.

### Providers
- **`TransportProvider`** — Interface for peer communication (Nostr implementation).
- **`OracleProvider`** — Interface for state oracle queries.
- **`StorageProvider`** — Interface for persistent storage (IPFS implementation).

### Types
- **`TransferRequest`** — Describes a token transfer (amount, recipient, metadata).
- **`TransferResult`** — Outcome of a transfer operation.
- **`TrackedAddress`** — Address being monitored for incoming transactions.
- **`TokenState`** — Current state of a token (owner predicate, data, proof chain).
- **`InclusionProof`** — SMT proof from aggregator (L3).

## Dependencies

- `state-transition-sdk` — State transition logic and predicate evaluation
- Network services: aggregator-go (L3), bft-core (L2), alpha (L1)

## Depended On By

- `sphere` — React app uses sphere-sdk via adapter layer
- `openclaw-unicity` — AI agent plugin wraps sphere-sdk for tool access

## Key Patterns

- **Provider pattern**: Network access via injectable providers (transport, oracle, storage). Swap implementations for testing.
- **Module pattern**: Functionality grouped into modules (`sphere.payments`, `sphere.tokens`). Each module is independently testable.
- **Identity-first**: All operations require an `Identity`. Created from mnemonic or raw keypair.
- **Async-first**: All network operations return Promises. Use `await` throughout.

## Constraints

- All crypto uses secp256k1 (NOT ed25519)
- Mnemonics are BIP-39, key derivation is BIP-32
- Token state is immutable — transitions create new state
- Provider implementations must handle Nostr relay disconnections gracefully
- Never log private keys or mnemonics

## Status

Core payments, identity, and token modules are production-ready. L1 payments and proof verification are functional. Provider implementations for Nostr and IPFS are stable.
