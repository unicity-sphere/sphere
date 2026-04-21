# sphere-sdk Development Guide

## Repository Structure

```
sphere-sdk/
├── src/
│   ├── index.ts              # Main exports
│   ├── sphere.ts             # Sphere class
│   ├── modules/
│   │   ├── payments.ts       # PaymentsModule
│   │   ├── l1-payments.ts    # L1PaymentsModule
│   │   ├── tokens.ts         # TokensModule
│   │   └── proofs.ts         # ProofsModule
│   ├── providers/
│   │   ├── transport.ts      # TransportProvider interface
│   │   ├── oracle.ts         # OracleProvider interface
│   │   └── storage.ts        # StorageProvider interface
│   ├── identity/
│   │   ├── identity.ts       # Identity class (keypair management)
│   │   └── mnemonic.ts       # BIP-39 mnemonic utilities
│   └── types/
│       ├── transfer.ts       # TransferRequest, TransferResult
│       ├── token.ts          # TokenState, TokenId
│       └── proof.ts          # InclusionProof
├── tests/                    # ~1475 tests
├── tsup.config.ts            # Build config
└── package.json
```

## Module Pattern

Each module is a class that receives the Sphere context:

```typescript
class PaymentsModule {
  constructor(private sphere: SphereContext) {}

  async send(request: TransferRequest): Promise<TransferResult> { ... }
  async list(): Promise<Transaction[]> { ... }
}
```

Access via: `sphere.payments.send(...)`, `sphere.tokens.create(...)`, etc.

## Provider Pattern

Providers are injectable interfaces for external services:

```typescript
interface TransportProvider {
  send(to: string, message: Uint8Array): Promise<void>;
  subscribe(handler: (msg: Uint8Array) => void): Unsubscribe;
}
```

Production uses Nostr; tests use mock providers.

## Testing Patterns

- Unit tests use mock providers (no network)
- Integration tests connect to testnet
- Vitest for all tests: `npx vitest run`
- Test files co-located: `module.test.ts` next to `module.ts`

## Build Pipeline

```bash
npx tsup          # Build to dist/ (ESM + CJS)
npx vitest run    # Run all tests
npx eslint .      # Lint
npx tsc --noEmit  # Type check
```

## Adding a New Feature

1. Define types in `src/types/`
2. Add method to relevant module in `src/modules/`
3. Add provider interface if external service needed
4. Write tests (unit with mock providers, integration with testnet)
5. Export from `src/index.ts`
6. Run full check: `npx tsup && npx vitest run && npx eslint . && npx tsc --noEmit`

## Key Rules

- All crypto uses secp256k1 (via @noble/secp256k1)
- Never store private keys in memory longer than needed
- All network operations are async
- Provider interfaces must be mockable for testing
- Strict TypeScript — no `any` types
