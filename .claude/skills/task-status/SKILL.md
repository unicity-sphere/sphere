---
name: task-status
description: Check progress across all task files and worktrees. Use to see overall phase completion status.
---

# Task Status

Check progress across all task files and worktrees.

## Process

### 1. Scan Task Files

Read all files in `tasks/` directory and extract status.

### 2. Check Worktrees

```bash
git worktree list
```

### 3. Verify Build

Auto-detect project type and run the appropriate check:

```bash
# TypeScript (if package.json exists)
npm run build 2>&1 | tail -5

# Go (if go.mod exists)
go build ./... 2>&1 | tail -5

# Rust (if Cargo.toml exists)
cargo check --workspace 2>&1 | tail -20

# C++ (if CMakeLists.txt exists)
cd build && make 2>&1 | tail -20
```

## Output Format

```
# Unicity Development Status

## Overall Progress
███████████░░░░░ 73% complete

## Task Summary

| Task | Status | Progress |
|------|--------|----------|
| 0_BOOTSTRAP | Complete | 12/12 |
| 1_STREAM_A | Complete | 45/47 |
| ... | ... | ... |

## Worktrees

| Path | Branch | Status |
|------|--------|--------|
| /dev/project | main | Current |
| ... | ... | ... |

## Packages / Modules

| Package | Builds | Tests |
|---------|--------|-------|
| sphere-sdk | Pass | 1475 |
| aggregator-go | Pass | 89 |
| ... | ... | ... |

## Next Actions

1. [ ] Next step
2. [ ] Next step
```
