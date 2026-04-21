---
name: worker
description: Generate a focused prompt for a parallel worker agent. Use when dispatching work to a parallel Claude session.
argument-hint: <task-file>
---

# Worker Prompt Generator

Generate a focused prompt for a parallel worker agent implementing a task stream.

## Arguments

- `$ARGUMENTS` - Path to the task file (e.g., "tasks/2_STREAM_B_AGGREGATOR.md")

## Process

1. Read the task file completely
2. Identify the worktree/branch for this stream
3. Detect project type (TypeScript/Go/Rust/C++) from the task file
4. Generate the worker prompt with language-appropriate standards

## Worker Prompt Template

Output the following filled-in template:

```
You are Worker [X]. Your task is documented in `[TASK_FILE]`.

## Your Scope
[List packages/modules to implement]

## Branch & Worktree
- Branch: `[BRANCH]`
- Worktree: `[WORKTREE_PATH]`

## Before Starting
1. Read the task file completely
2. Read `.claude/CLAUDE.md` for project context
3. Check existing packages/modules for patterns
4. Run the build check for your project type

## While Implementing
1. One module at a time
2. Build check after each module
3. Tests alongside implementation
4. Follow existing patterns

## Code Standards (auto-detect from project type)

### If TypeScript:
- Strict mode — no `any` types
- ESM imports/exports
- Vitest for tests
- ESLint must pass
- Async/await over raw Promises

### If Go:
- `go vet` must pass
- `gofmt` applied
- Table-driven tests
- Error handling — never ignore returned errors
- Context propagation as first parameter

### If Rust:
- `#![deny(unsafe_code)]`
- `#![warn(missing_docs)]`
- Doc comments with examples
- `thiserror` for errors
- Builder patterns for complex structs

### If C++:
- C++17 standard
- RAII — smart pointers, no raw new/delete
- `-Wall -Werror` must pass
- `cppcheck` clean

## Quality Checklist
- [ ] All task items checked off
- [ ] Build passes (npm run build / go build / cargo check / make)
- [ ] Tests pass (npm test / go test / cargo test / ctest)
- [ ] Lint passes (eslint / go vet / clippy / cppcheck)
- [ ] Formatting applied (prettier / gofmt / cargo fmt)

## When Done
1. Commit all changes
2. Run full verification
3. Report: packages/modules, test counts, deviations

## Do NOT
- Modify shared packages without coordination
- Modify other streams' packages/modules
- Push to remote
- Merge branches
```

## Output

After generating, also provide:
- Summary of what worker will implement
- Command to start worker in correct worktree
