# Developer Guidelines

Cross-repository coding standards for the Unicity Network ecosystem.

## TypeScript (sphere, sphere-sdk, state-transition-sdk, openclaw-unicity, unicity-orchestrator)

### Code Standards
- **Strict mode**: `"strict": true` in tsconfig.json
- **ESM**: Use ES module imports/exports
- **No `any`**: Use proper types or `unknown` with type guards
- **Async/await**: Prefer over raw Promise chains
- **Immutable by default**: Use `readonly` where possible

### Testing
- **Framework**: Vitest
- **Pattern**: Co-located test files (`module.test.ts`)
- **Mocking**: Mock providers for unit tests, real services for integration
- **Coverage**: Aim for >80% on business logic

### Linting & Formatting
- **ESLint** with TypeScript ESLint parser
- **Prettier** for formatting (if configured in repo)
- Run `npx eslint .` before committing

## Go (aggregator-go, bft-core)

### Code Standards
- **go vet**: Must pass with zero warnings
- **gofmt**: All code must be formatted
- **Error handling**: Always check returned errors; no blank `_` for errors
- **Context propagation**: Pass `context.Context` as first parameter
- **Goroutine cleanup**: Always ensure goroutines can exit (use context cancellation)

### Testing
- **Pattern**: Table-driven tests
- **Package**: `_test` suffix for black-box testing
- **Benchmarks**: Add for performance-critical paths

### Linting
- **golangci-lint**: Must pass
- Run `go vet ./... && golangci-lint run` before committing

## Rust (when applicable)

### Code Standards
- `#![deny(unsafe_code)]` — no unsafe unless absolutely necessary
- `thiserror` for error types
- `clippy` warnings are errors: `cargo clippy --workspace -- -D warnings`
- `cargo fmt --all` before committing

### Testing
- `cargo test --workspace -- --quiet`
- Integration tests in `tests/` directory
- Doc tests for public API examples

## C++ (alpha)

### Code Standards
- **C++17** standard
- **RAII**: Use smart pointers, no raw `new`/`delete`
- **Const correctness**: Use `const` wherever possible
- **Compile flags**: `-Wall -Werror` (all warnings are errors)

### Testing
- **CMake/CTest** for test execution
- Unit tests for each component

### Static Analysis
- **cppcheck**: `cppcheck --enable=all src/`
- Address all findings before committing

## Cross-Language Rules

1. **secp256k1 everywhere** — never use ed25519 or other curves
2. **Never log secrets** — private keys, mnemonics, tokens
3. **Conventional Commits** — `<type>(<scope>): <description>`
4. **Branch before work** — never commit to `main`
5. **Test before commit** — hooks enforce this, but also run manually
6. **Review before merge** — use `/steelman` for adversarial review
