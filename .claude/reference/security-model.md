# Security Model

> **Purpose:** Per-layer security properties and the overall trust model of the Unicity Network.

## Trust Model

Unicity uses **proof-based verification** — state validity is proven cryptographically, not assumed from trust in validators.

```
No single point of trust:
  L1: PoW — computational cost to attack
  L2: BFT — requires 2/3+ validator collusion
  L3: SMT — mathematical proof of inclusion
  L4: Predicates — cryptographic ownership proofs
  L5: User keys — only the user holds private keys
```

## Per-Layer Security

### L1 (alpha) — Proof of Work
- 51% attack requires majority hash power (RandomX, CPU-friendly)
- UTXO model prevents double-spending
- ASERT difficulty adjustment resists timestamp manipulation

### L2 (bft-core) — BFT Consensus
- Tolerates up to 1/3 Byzantine validators
- 1-second finality eliminates long-range attacks
- Signed messages prevent impersonation

### L3 (aggregator-go) — Proof Aggregation
- SMT proofs are mathematically verifiable
- Deterministic tree construction prevents manipulation
- Proofs are self-contained (no need to trust the aggregator after verification)

### L4 (state-transition-sdk) — State Transitions
- Predicate system ensures only authorized parties can transfer tokens
- Masked predicates provide privacy without sacrificing verifiability
- Immutable state prevents retroactive modification

### L5 (sphere, sphere-sdk) — Wallet / Agent
- Private keys never leave the client
- BIP-39/BIP-32 standard key management
- Nostr transport encrypted end-to-end (NIP-17)
- IPFS content addressing prevents data tampering

## Crypto Verification Checklist

When implementing features that touch security:
- [ ] All signatures use secp256k1 ECDSA
- [ ] Key derivation follows BIP-32 standard paths
- [ ] Private keys are never serialized to logs or external APIs
- [ ] Predicates are evaluated, not assumed
- [ ] Inclusion proofs are verified against known SMT roots
- [ ] Nostr messages are encrypted before transmission
- [ ] IPFS CIDs are verified after retrieval

## Privacy Model

- **Masked predicates**: Token ownership is hidden (hash of public key)
- **NIP-17 wrapping**: Messages are double-encrypted, metadata-resistant
- **IPNS indirection**: State pointers don't reveal content
- **No global state**: Tokens are independent — no shared ledger to analyze
