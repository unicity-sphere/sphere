# Crypto Primitives

> **Purpose:** Cryptographic primitives used across the Unicity ecosystem.

## Elliptic Curve: secp256k1

All Unicity cryptography uses the secp256k1 curve (same as Bitcoin). NOT ed25519.

- **Private key**: 256-bit scalar
- **Public key**: Compressed 33-byte point (02/03 prefix + x-coordinate)
- **Signatures**: ECDSA over secp256k1

## Key Derivation

### BIP-39 Mnemonics
- 12 or 24 word mnemonic phrases
- Generate seed from mnemonic + optional passphrase via PBKDF2
- Standard wordlist (English)

### BIP-32 Hierarchical Deterministic (HD) Keys
- Derive child keys from master seed
- Derivation path: `m/purpose'/coin_type'/account'/change/index`
- Hardened derivation (') for security boundaries
- Different paths for different key purposes (signing, encryption, identity)

## Hash Functions

- **SHA-256**: Block hashing, Merkle trees, commitment hashes
- **HMAC-SHA512**: BIP-32 key derivation
- **Double SHA-256**: Transaction IDs (following Bitcoin convention on L1)

## Nostr Keys

Nostr uses the same secp256k1 curve:
- **nsec**: Nostr secret key (bech32-encoded private key)
- **npub**: Nostr public key (bech32-encoded public key)
- Key conversion between raw hex and bech32 Nostr format is straightforward

## Verification Flow

1. Signer: `sign(privateKey, message) → signature`
2. Verifier: `verify(publicKey, message, signature) → bool`
3. Predicate: `evaluatePredicate(predicate, publicKey) → bool`

## Security Rules

- Never expose private keys or mnemonics in logs, errors, or API responses
- Always validate public key format before use
- Use constant-time comparison for signature verification
- Derive separate keys for separate purposes (don't reuse)
