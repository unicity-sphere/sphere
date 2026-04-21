# sphere Development Guide

## Repository Structure

```
sphere/
├── src/
│   ├── main.tsx              # Entry point
│   ├── App.tsx               # Root component with SphereProvider
│   ├── adapters/
│   │   ├── SphereProvider.tsx # React context wrapping sphere-sdk
│   │   ├── usePayments.ts    # Payments hook
│   │   ├── useTokens.ts      # Tokens hook
│   │   ├── useIdentity.ts    # Identity hook
│   │   └── useProofs.ts      # Proofs hook
│   ├── pages/
│   │   ├── WalletPage.tsx    # Balance, transactions
│   │   ├── TokensPage.tsx    # Token management
│   │   ├── SettingsPage.tsx  # Configuration
│   │   └── AgentPage.tsx     # AI agent interface
│   ├── components/           # Shared UI components
│   └── utils/                # Helper utilities
├── public/                   # Static assets
├── vite.config.ts            # Vite configuration
├── .env.example              # Environment variables template
└── package.json
```

## SDK Adapter Layer

The adapter layer wraps sphere-sdk with React patterns:

```tsx
// SphereProvider creates and manages the Sphere instance
<SphereProvider config={{ network: 'testnet' }}>
  <App />
</SphereProvider>

// Hooks provide type-safe access to SDK modules
const { send, transactions } = usePayments();
const { identity, createIdentity } = useIdentity();
```

All SDK calls go through hooks — never import sphere-sdk directly in components.

## Query Key Structure

TanStack Query keys follow module boundaries:

```typescript
['payments', 'list']           // All transactions
['payments', 'balance']        // Current balance
['tokens', tokenId]            // Single token state
['tokens', 'list']             // All tokens
['proofs', commitmentHash]     // Single proof
['identity', 'current']        // Current identity
```

Mutations invalidate related queries automatically.

## State Management

- **Server state**: TanStack Query (payments, tokens, proofs)
- **UI state**: React useState/useReducer (forms, modals, navigation)
- **No Redux/Zustand** — SDK adapter + TanStack Query is sufficient

## Environment Variables

```bash
VITE_NETWORK=testnet                    # Network environment
VITE_AGGREGATOR_URL=                    # Override aggregator endpoint
VITE_NOSTR_RELAYS=wss://relay1,wss://relay2  # Nostr relay list
```

Access via `import.meta.env.VITE_*`

## Build & Development

```bash
npm run dev       # Dev server with HMR (localhost:5173)
npm run build     # Production build
npm run preview   # Preview production build
npm run test      # Run tests
npm run lint      # ESLint
npm run typecheck # TypeScript check
```

## Adding a New Feature

1. If it needs SDK access, add a hook in `src/adapters/`
2. Create page/component in appropriate directory
3. Add TanStack Query keys and invalidation patterns
4. Never access sphere-sdk directly — always through hooks
5. Test with mock providers (sphere-sdk's provider pattern)

## Key Rules

- Never store mnemonics in localStorage
- All SDK calls go through adapter hooks
- Optimistic updates for user actions (rollback on failure)
- Error boundaries around each major section
- Bundle size matters — import only what you use from sphere-sdk
