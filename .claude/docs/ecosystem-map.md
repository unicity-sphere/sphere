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
| **haproxy** | HAProxy + Node | Infra | Active | Shared domain multiplexer (SNI/TCP passthrough) + dynamic Registration API |
| **ssl-manager** | Node/TS | Infra | Active | Automatic TLS + remote HAProxy tunneling (ssh-lite + WireGuard/DTNP) |

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

Remote HAProxy tunneling (ssl-manager + haproxy) — expose a firewalled
service (no public IP) at https://<name>.<base> through the shared proxy:
  haproxy (shared :80/:443 SNI multiplexer + Registration API :8404 on haproxy-net)
    ├── ssh-tunnel-endpoint (ssl-manager)  ← firewalled host opens `ssh -R` here
    │     └── ssh-tunnel-client (ssl-manager) runs on the firewalled host
    │           (registers domain via -L to :8404; MODE=https passthrough | http)
    └── tunnel-daemon / tunnel-manager (ssl-manager) — WireGuard/DTNP full mode (WIP)
  concierge staging (deploy-staging-tunnel.sh) uses ssh-tunnel-client to expose
  laptop stacks at <feature>.staging.concierge-dev.app
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


### haproxy (infra)
- Shared domain multiplexer on the external `haproxy-net`: SNI/TCP passthrough on :443
  (terminates NO TLS — backends serve their own cert), HTTP proxy on :80
- Dynamic backend **Registration API** (:8404, internal only): `domain -> container:port`,
  ownership-scoped delete; rejects internal ports (8000/8404) as targets
- Port allowlist: `allowed-ports.conf` (published) + `internal-ports.conf` (allowed, not
  published — e.g. the `21000-21099` tunnel range); `run-haproxy.sh` runner

### ssl-manager (infra)
- Automatic Let's Encrypt TLS + haproxy self-registration for containers
- **Remote HAProxy tunneling** — reach a firewalled service through the shared haproxy:
  - `ssh-tunnel-endpoint/` — restricted, tunnel-only sshd on haproxy-net (ssh-lite server);
    fail-closed (ForceCommand + PermitOpen), stable operator-provided host key
  - `ssh-tunnel-client/` — dependency-free shell client; `MODE=https` (SNI passthrough :443)
    or `MODE=http` (:80); host-key pinning, reachability gate, ownership-aware deregister
  - `tunnel-daemon/` + `tunnel-manager/` — WireGuard "full mode" (DTNP/Nostr-negotiated, WIP)
  - Deployed endpoint: `213.199.61.236:2222`, stable pinned host key
  - `docs/remote-tunnel/` — architecture, DTNP v0.1 spec, tunneling comparison
