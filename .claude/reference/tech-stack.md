# Tech Stack

> **Purpose:** Languages, frameworks, and key dependencies across all Unicity repositories.

## TypeScript Repositories

### sphere-sdk
- **Runtime**: Node.js 20+
- **Build**: tsup (esbuild-based bundler)
- **Test**: Vitest
- **Lint**: ESLint + TypeScript ESLint
- **Key deps**: @noble/secp256k1, nostr-tools, multiformats (IPFS)

### sphere
- **Framework**: React 19
- **Build**: Vite
- **State**: TanStack Query
- **Routing**: React Router
- **Key deps**: sphere-sdk, @tanstack/react-query

### state-transition-sdk
- **Runtime**: Node.js 20+
- **Build**: tsup
- **Test**: Vitest
- **Key deps**: @noble/secp256k1

### openclaw-unicity
- **Framework**: OpenClaw plugin system
- **Build**: npm (TypeScript compilation)
- **Test**: npm test
- **Key deps**: sphere-sdk, openclaw-sdk

### unicity-orchestrator
- **Framework**: MCP server
- **Build**: npm (TypeScript compilation)
- **Key deps**: sphere-sdk, @modelcontextprotocol/sdk

## Go Repositories

### aggregator-go
- **Version**: Go 1.21+
- **Storage**: MongoDB
- **API**: JSON-RPC 2.0
- **Lint**: golangci-lint
- **Key deps**: mongo-driver, crypto/ecdsa

### bft-core
- **Version**: Go 1.21+
- **Network**: Custom P2P
- **Lint**: golangci-lint
- **Key deps**: crypto/ecdsa

## C++ Repository

### alpha
- **Standard**: C++17
- **Build**: CMake
- **Mining**: RandomX library
- **Key deps**: RandomX, OpenSSL, Boost
- **Compile flags**: `-Wall -Werror -O2`

## Cross-Cutting

- **Curve**: secp256k1 everywhere (no ed25519)
- **Hash**: SHA-256 for Merkle trees and commitments
- **Transport**: Nostr (via nostr-tools in TS, custom in Go)
- **Storage**: IPFS (via multiformats/helia in TS)
- **Encoding**: JSON for APIs, binary for wire protocols
