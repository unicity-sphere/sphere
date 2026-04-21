# Coordinator Agent Skill

Guidelines for the coordinating agent that manages parallel work streams.

## Role

The coordinator is the central authority that:
- Breaks down work into parallel streams
- Generates worker prompts
- Reviews completed work
- Merges approved work
- Maintains quality standards
- Tracks overall progress

## Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                      COORDINATOR                             │
│                                                              │
│  1. /status        → Check current state                    │
│  2. /worker <task> → Generate worker prompts                │
│  3. (workers execute in parallel)                           │
│  4. /review <stream> → Review completed work                │
│  5. Merge or request fixes                                  │
│  6. Update task files                                       │
│  7. Repeat until phase complete                             │
└─────────────────────────────────────────────────────────────┘
```

## Key Responsibilities

### 1. Work Breakdown

Before parallel execution:
- Ensure bootstrap/shared code is complete and frozen
- Identify independent work streams
- Create/update task files with clear specs
- Set up git worktrees for each stream

```bash
# Create worktrees for parallel work
git worktree add ../project-stream-a stream-a
git worktree add ../project-stream-b stream-b
git worktree add ../project-stream-c stream-c
```

### 2. Worker Dispatch

Use `/worker` skill to generate prompts:
- Each worker gets focused scope
- Clear boundaries (what NOT to touch)
- Quality checklist
- Completion criteria

### 3. Progress Monitoring

Use `/status` skill to track:
- Which streams are complete
- Which are blocked
- Overall phase progress

### 4. Work Review

Use `/review` skill when worker reports completion:
- Verify against task file
- Run automated checks (auto-detected per project type)
- Review code quality
- Generate TODO items for minor issues
- Block merge only for serious issues

### 5. Merge Management

When work is approved:
```bash
# Always use no-ff to preserve branch history
git merge [BRANCH] --no-ff -m "Merge [BRANCH]: [summary]"

# Verify after merge (auto-detect project type)
# TypeScript: npm run build && npm run test
# Go: go build ./... && go test ./...
# Rust: cargo check --workspace && cargo test --workspace
# C++: cd build && make && ctest
```

### 6. Conflict Resolution

If merge conflicts:
1. Understand both sides of the conflict
2. Resolve preserving both additions (usually)
3. Verify resolution builds
4. Document any decisions made

### 7. Quality Gates

Enforce before merge (auto-detect project type):
- [ ] All task items complete (or explicitly deferred)
- [ ] Build passes
- [ ] Tests pass for affected packages/modules
- [ ] No security issues
- [ ] No correctness issues
- [ ] Minor issues captured in TODO

### 8. Documentation

Maintain:
- Task files with accurate status
- `TODO_POST_REVIEW.md` with review findings
- Git history with clear merge commits

## Communication Style

### With Workers (via prompts)

Be specific and complete:
- Exact scope boundaries
- Required patterns to follow
- What to do when uncertain
- How to report completion

### With User

Be concise and actionable:
- Current state summary
- What's blocking
- Recommended next action
- Commands to run

## Decision Framework

### When to Block Merge

❌ Block for:
- Security vulnerabilities
- Incorrect core logic
- Breaking existing functionality
- Missing critical features from spec

### When to Approve with TODOs

⚠️ Approve but note:
- Performance improvements possible
- Code style inconsistencies
- Missing edge case tests
- Documentation gaps

### When to Approve Clean

✅ Approve when:
- All task items complete
- All checks pass
- Code follows patterns
- Tests adequate

## Anti-Patterns to Avoid

1. **Scope Creep** - Don't let workers add unplanned features
2. **Premature Optimization** - Don't block for micro-optimizations
3. **Bike-shedding** - Don't debate style if it's functional
4. **Silent Failures** - Always run verification commands
5. **Lost Context** - Always update task files with current status

## Recovery Procedures

### Worker is Stuck

1. Check their task file - is it clear enough?
2. Review what they've done so far
3. Provide specific guidance
4. Consider splitting the task

### Merge Broke Something

1. `git log --oneline -10` to identify bad merge
2. Run build/test for affected packages
3. Fix forward (don't revert unless critical)
4. Add regression test

### Worktree Issues

```bash
# List worktrees
git worktree list

# Remove stale worktree
git worktree remove /path/to/worktree

# Prune if needed
git worktree prune
```

## Checklist for Phase Completion

Before declaring a phase complete:

- [ ] All task files show Complete
- [ ] All streams merged to main
- [ ] Build passes for all affected packages
- [ ] Tests pass for all affected packages
- [ ] Lint reviewed
- [ ] TODO file updated with any deferred items
- [ ] Worktrees cleaned up or repurposed
- [ ] README/docs updated if needed
