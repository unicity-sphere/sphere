# Transport Protocols

> **Purpose:** Communication protocols used across the Unicity Network — Nostr for messaging, IPFS for storage.

## Nostr Transport

Peer-to-peer communication between wallets and agents uses Nostr relays.

### NIPs Used
- **NIP-04**: Encrypted direct messages (legacy, for backward compatibility)
- **NIP-17**: Gift-wrapped encrypted messages (preferred, better privacy)
- **NIP-29**: Groups — for broadcast channels and multi-party coordination

### Key Mapping
- Nostr keys are secp256k1 (same curve as Unicity identity keys)
- A Unicity identity can derive a Nostr keypair from its BIP-32 path
- `npub` / `nsec` bech32 encoding for display

### Nametags
- Human-readable identifiers stored on Nostr relays
- Format: `@username` style
- Resolution: query relays for NIP-05-style mapping from nametag → npub → secp256k1 pubkey
- Used for: addressing payments, discovering peers, identity display

## IPFS Storage

Content-addressed storage for state data and proofs.

### Usage
- **IPFS**: Retrieve data by content hash (CID)
- **IPNS**: Publish mutable pointers to latest state

### Patterns
- Token state published to IPNS (mutable, updated on each transition)
- Proof chains stored as IPFS DAGs (immutable, content-addressed)
- Large payloads stored on IPFS, referenced by CID in TXF data field

## Protocol Selection

| Use Case | Protocol | Reason |
|----------|----------|--------|
| Peer messaging | Nostr NIP-17 | Privacy, relay federation |
| Group channels | Nostr NIP-29 | Multi-party, topic-based |
| State publishing | IPNS | Mutable pointer to latest |
| Proof storage | IPFS | Immutable, content-addressed |
| Name resolution | Nostr + NIP-05 | Human-readable, decentralized |
