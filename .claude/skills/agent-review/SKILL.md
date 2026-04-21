---
name: agent-review
description: Review completed agent work before merging. Use when a worker stream is complete and ready for review.
argument-hint: <stream-name>
---

# Review Agent Work

Systematically review completed agent work before merging.

## Arguments

- `$ARGUMENTS` - The stream or branch name to review (e.g., "stream-b")

## Process

### 1. Identify Work

```bash
# Check the worktree for this stream
git log main..$ARGUMENTS --oneline
git diff main..$ARGUMENTS --stat
```

Read the corresponding task file to understand what should have been implemented.

### 2. Task Completion Check

Compare work against task file. Go through every `[ ]` checkbox and report:

```
## Task Completion

### Completed
- [x] Item 1
- [x] Item 2

### Missing
- [ ] Item 3 - Not implemented

### Deviations
- Item 5: Implemented differently
```

### 3. Verification Commands

Auto-detect project type and run appropriate checks:

**TypeScript** (if `package.json` exists):
```bash
npm run build
npm run test
npm run lint
npm run typecheck  # if available
```

**Go** (if `go.mod` exists):
```bash
go build ./...
go test ./...
go vet ./...
golangci-lint run  # if available
```

**Rust** (if `Cargo.toml` exists):
```bash
cargo check --workspace
cargo test -p [PACKAGES...]
cargo clippy -p [PACKAGES...]
```

**C++** (if `CMakeLists.txt` exists):
```bash
cd build && cmake .. && make
cd build && ctest
cppcheck --enable=all src/
```

### 4. Code Review Categories

Review against each category (✅ No issues, ⚠️ Minor, ❌ Blocker):

- **Security**: Crypto, auth, injection, secrets
- **Correctness**: Logic, edge cases, error handling
- **Reliability**: Failure modes, timeouts, cleanup
- **Performance**: Caching, allocations, async
- **Concurrency**: Races, locks, async safety
- **API/Ergonomics**: Consistency, builders, docs
- **Observability**: Logging, events, debug
- **Testing**: Coverage, edge cases
- **Configuration**: Defaults, validation
- **Future/Debt**: Stubs, TODOs

### 5. Generate TODO Items

For ⚠️ items, format and append to `tasks/TODO_POST_REVIEW.md`

### 6. Merge Readiness

Provide summary and merge command:
```bash
git merge [BRANCH] --no-ff --no-gpg-sign -m "Merge [BRANCH]: [summary]"
```
