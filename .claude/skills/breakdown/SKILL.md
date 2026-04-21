---
name: breakdown
description: Break down a phase into parallel work streams. Use when starting a new phase to plan parallel execution.
argument-hint: <phase-doc>
---

# Task Breakdown

Break down a phase or large task into parallel work streams.

## Arguments

- `$ARGUMENTS` - Path to phase doc or description (e.g., "docs/ecosystem-map.md")

## Process

### 1. Identify Components

Read the phase document and list:
- Packages/modules to create/modify
- Features to implement
- Dependencies between components

### 2. Build Dependency Graph

```
Bootstrap (shared types)
    ↓
Stream A ←→ Stream B ←→ Stream C (parallel)
    ↓
Integration (combines all)
```

### 3. Group into Streams

- **Stream 0 (Bootstrap)**: Shared types, completes first
- **Streams A-C**: Independent parallel work
- **Stream N (Integration)**: Depends on all streams

### 4. Create Task Files

For each stream, create `tasks/N_STREAM_X_NAME.md` with:
- Clear scope
- Checkbox items for each feature
- Build config specs (package.json / go.mod / Cargo.toml / Makefile)
- Module specs
- Test requirements

### 5. Create README

Update `tasks/README.md` with:
- Dependency diagram
- Task file table
- Verification commands

### 6. Git Setup

```bash
git checkout -b stream-a
git checkout -b stream-b
git checkout -b stream-c
git checkout main
git worktree add ../project-stream-a stream-a
git worktree add ../project-stream-b stream-b
git worktree add ../project-stream-c stream-c
```

## Output

1. Dependency graph visualization
2. Proposed stream assignments
3. List of task files to create
4. Git commands for setup
5. Decision points to resolve

## Principles

- Minimize bootstrap (only truly shared types)
- Streams should not depend on each other
- 1-3 packages/modules per stream
- Similar complexity across streams
- Clear interfaces defined in bootstrap
