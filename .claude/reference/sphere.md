# sphere

> **Purpose:** React 19 web application — the primary user-facing wallet and token management interface for the Unicity Network.

## Build & Test

```bash
npm run build     # Production build (Vite)
npm run dev       # Dev server with HMR
npm run test      # Run tests
npm run lint      # ESLint
npm run typecheck # TypeScript strict check
```

## Public API

### SDK Adapter Layer
- **`SphereProvider`** — React context provider wrapping sphere-sdk's `Sphere` instance.
- **`useSphere()`** — Hook returning the Sphere instance.
- **`usePayments()`** — Hook for payment operations (send, receive, history).
- **`useTokens()`** — Hook for token operations (list, transfer, query).
- **`useIdentity()`** — Hook for identity management (current user, keypair).
- **`useProofs()`** — Hook for proof verification and history.

### Component Hierarchy
- **`App`** → `SphereProvider` → route-based pages
- **`WalletPage`** — Balance, transactions, send/receive
- **`TokensPage`** — Token list, details, transfer
- **`SettingsPage`** — Network config, identity management
- **`AgentPage`** — AI agent interaction interface

### Query Key Structure
- Uses TanStack Query with structured keys: `['payments', 'list']`, `['tokens', tokenId]`, etc.
- Invalidation patterns follow module boundaries.

### Agent System
- Built-in AI agent interface for natural language token operations
- Agent tools map to sphere-sdk module methods

## Dependencies

- `sphere-sdk` — All blockchain operations
- React 19, TanStack Query, Vite

## Depended On By

None (end-user application).

## Key Patterns

- **Adapter layer**: sphere-sdk is never used directly in components. All access goes through hooks that wrap SDK methods with React Query caching.
- **Optimistic updates**: Transfers show immediately in UI, reconcile with network state.
- **Error boundaries**: Each major section has error boundaries with retry.

## Constraints

- Never store mnemonics in localStorage — use session-only storage
- All SDK calls go through the adapter hooks (not direct sphere-sdk access)
- Environment variables via `import.meta.env` (Vite)
- Bundle size matters — tree-shake sphere-sdk imports

## Status

Wallet, payments, and token management are functional. Agent system is in active development. Settings and network switching are stable.
