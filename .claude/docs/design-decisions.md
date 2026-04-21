# Design Decisions

Key architectural and technology choices for the Unicity Network.

## Cryptography: secp256k1 over ed25519

**Decision:** Use secp256k1 for all cryptographic operations.

**Rationale:**
- Compatible with Bitcoin ecosystem tooling (BIP-39, BIP-32)
- Nostr uses secp256k1 — same keys work for both identity and transport
- Wider hardware wallet support
- Battle-tested in production (Bitcoin since 2009)

**Trade-offs:**
- ed25519 has simpler implementation and faster verification
- secp256k1 signatures are larger (72 bytes vs 64 bytes)
- ECDSA is more complex than EdDSA

## Transport: Nostr over Custom P2P

**Decision:** Use Nostr relay network for peer-to-peer messaging.

**Rationale:**
- Decentralized relay infrastructure already exists
- NIP-17 gift-wrapping provides strong metadata privacy
- NIP-29 groups support multi-party channels
- Same secp256k1 keys used for identity
- Rich ecosystem of clients and relays

**Trade-offs:**
- Relay availability is not guaranteed
- Message delivery is eventual (not guaranteed)
- Need to handle relay disconnections gracefully

## Storage: IPFS over Custom Storage

**Decision:** Use IPFS for content-addressed storage, IPNS for mutable pointers.

**Rationale:**
- Content addressing ensures data integrity
- Decentralized — no single point of failure
- IPNS provides mutable pointers to latest state
- Good ecosystem support in TypeScript (helia, multiformats)

## Architecture: Dual-Layer (L1+L2) over Single Layer

**Decision:** Separate PoW (L1) and BFT (L2) layers.

**Rationale:**
- L2 BFT provides 1-second finality for user operations
- L1 PoW provides ultimate security anchoring
- Separation allows independent scaling and upgrades
- L2 can process high throughput without L1 bottleneck

## Proofs: Sparse Merkle Trees over Dense Merkle Trees

**Decision:** Use Sparse Merkle Trees in the aggregation layer.

**Rationale:**
- O(log n) proof size regardless of tree fullness
- Efficient batch insertion (1M+ commits/sec)
- Proofs are self-contained (no tree access needed for verification)
- Support for non-membership proofs (prove something is NOT in the tree)

## State Model: Immutable TXF over Mutable Accounts

**Decision:** Token state is immutable. Transitions create new state.

**Rationale:**
- Complete audit trail via proof chains
- No concurrent modification issues
- State can be independently verified at any point in history
- Aligns with UTXO-style thinking from L1
