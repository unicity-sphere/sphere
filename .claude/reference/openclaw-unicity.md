# openclaw-unicity

> **Purpose:** TypeScript OpenClaw plugin providing 15 AI agent tools for Unicity Network operations — wallet management, payments, identity, and token operations via natural language.

## Build & Test

```bash
npm run build     # Build
npm run test      # Run tests
npm run lint      # Lint
```

## Public API

### Agent Tools (15 total)
- **Wallet**: `create_wallet`, `get_balance`, `list_transactions`
- **Payments**: `send_payment`, `receive_payment`, `track_payment`
- **Tokens**: `create_token`, `transfer_token`, `query_token_state`
- **Identity**: `create_identity`, `resolve_nametag`, `register_nametag`
- **Proofs**: `verify_inclusion_proof`, `get_proof_history`
- **Network**: `get_network_status`

### Core
- **`UnicityPlugin`** — OpenClaw plugin entry point. Registers all tools.
- **`WalletManager`** — BIP-32 HD wallet with key derivation and mnemonic management.
- **`NostrIdentity`** — Nostr keypair management for transport layer.

## Dependencies

- `sphere-sdk` — All blockchain operations delegated to SDK
- OpenClaw framework — Plugin host

## Depended On By

- End-user AI agents via OpenClaw

## Key Patterns

- **Tool delegation**: Each agent tool maps to a sphere-sdk method. Plugin is a thin adapter.
- **BIP-32 wallet**: Keys derived from a single mnemonic. Different derivation paths for different purposes.
- **Nostr identity**: Agent communicates over Nostr relays using NIP-04 encrypted messages.

## Constraints

- Mnemonics must never appear in agent responses or logs
- Tool results must be JSON-serializable
- Agent must not execute operations without explicit user confirmation
- Rate limiting on network operations

## Status

All 15 tools are implemented and functional. Wallet management and payment tools are production-tested. Token tools are stable.
