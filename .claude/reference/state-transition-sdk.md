# state-transition-sdk

> **Purpose:** TypeScript SDK for constructing and validating Unicity state transitions — handles predicate logic, token lifecycle operations, and proof chain management.

## Build & Test

```bash
npx tsup          # Build
npx vitest run    # Run tests
npx eslint .      # Lint
```

## Public API

### Core
- **`StateTransitionClient`** — Main client for constructing state transitions.
- **`Predicate`** — Ownership condition on a token. Can be masked (private) or unmasked (public).
- **`StateTransition`** — A state change: current state + operation → new state.

### Token Lifecycle
- **`createToken()`** — Mint a new token with initial state and owner predicate.
- **`transferToken()`** — Transfer ownership by replacing the owner predicate.
- **`splitToken()`** — Split a token into multiple tokens.
- **`joinTokens()`** — Combine multiple tokens into one.

### Predicates
- **`MaskedPredicate`** — Hides the owner's identity (privacy-preserving).
- **`UnmaskedPredicate`** — Public ownership (verifiable by anyone).
- **`evaluatePredicate()`** — Check if a given key satisfies a predicate.

### Types
- **`TxfStorageDataBase`** — Base type for TXF (Token eXchange Format) storage data.
- **`ProofChain`** — Ordered list of inclusion proofs tracking token history.

## Dependencies

- Aggregator-go (L3) — for submitting commitments and getting proofs

## Depended On By

- `sphere-sdk` — Uses for all state transition logic

## Key Patterns

- **Immutable state**: Token state is never mutated. Transitions produce new state objects.
- **Predicate evaluation**: Ownership is verified by evaluating predicates against signing keys.
- **Proof chain**: Every state transition adds to the proof chain, creating an auditable history.

## Constraints

- State transitions must be deterministic
- Masked predicates must not leak owner information
- Proof chains must be monotonically growing (no pruning)
- All cryptographic operations use secp256k1

## Status

Core state transition logic, predicate system, and TXF format are production-ready. Split/join operations are functional.
