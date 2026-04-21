---
name: steelman
description: Adversarial review of a branch — try to break it before it ships. Use after completing implementation work or when parallel agent work lands.
argument-hint: [branch-or-description]
---

# Steelman Review

Adversarial review that tries to break code before it ships. Separate the builder from the destroyer.

## Arguments

- `$ARGUMENTS` - Optional branch name or description of scope. If omitted, reviews the current branch vs `main`.

## Philosophy

You are not checking if the code works. You are trying to make it fail. Think:
- "How does this crash at 3am in production?"
- "What invariants does this execution context impose?"
- "Where did the author assume a happy path?"
- "What happens when this lock is poisoned, this process is killed, this allocation fails?"

## Process

### 1. Scope the Attack Surface

```bash
git log main..HEAD --oneline
git diff main...HEAD --stat
```

Identify every file changed. Group them by concern:
- **Security boundaries** (crypto, key management, proof verification, transport encryption)
- **State machines** (lifecycle transitions, lock ordering, cleanup paths)
- **External interfaces** (JSON-RPC, Nostr relay connections, IPFS, REST APIs)
- **Error paths** (what happens when things fail — not just when they succeed)

### 2. Dispatch Parallel Reviewers

Use the Task tool to launch **parallel Opus sub-agents**, one per concern group. Each agent gets a focused adversarial brief:

For each group, the agent prompt should include:
- The specific files to review (use `Read` tool)
- The adversarial questions for that concern area (from section 3 below)
- Instructions to output findings as: `SEVERITY (critical/warning/note) | FILE:LINE | DESCRIPTION | SUGGESTED FIX`

**CRITICAL: Use `model: "opus"` for all sub-agents.** Non-Opus agents miss the subtle bugs.

### 3. Adversarial Questions by Concern

#### Security Boundaries
- Can untrusted input escape sanitization?
- Are private keys or mnemonics ever logged or serialized?
- Can a malicious peer inject data via Nostr transport?
- Are inclusion proofs verified against known SMT roots (not just structurally valid)?
- Is there any path where crypto verification is skipped?

#### TypeScript-Specific
- Are there unhandled Promise rejections that could crash the process?
- Any `any` type casts that bypass type safety?
- Are tree-shaking boundaries respected (no side-effect imports)?
- React hook rules violations (conditional hooks, hooks in loops)?
- Does the SDK adapter layer properly invalidate TanStack Query caches?
- Are async operations properly cancelled on component unmount?

#### Go-Specific
- Are there goroutine leaks (goroutines that never exit)?
- Are channels properly closed (sender closes, not receiver)?
- Is `context.Context` propagated to all blocking operations?
- Are there race conditions (run with `-race` flag)?
- Is error wrapping preserving the original error context?
- Are map operations concurrent-safe (sync.Map or mutex)?

#### C++-Specific
- Memory leaks (raw new without corresponding delete)?
- Use-after-free (dangling pointers, invalidated iterators)?
- Buffer overflows (array bounds, string operations)?
- Integer overflow in arithmetic (especially block heights, amounts)?
- Thread safety (data races on shared state)?
- Resource leaks (file handles, sockets not closed on error paths)?

#### Rust-Specific (when applicable)
- **pre_exec closures**: Any heap allocation (String, Vec, Box, CString::new, format!)? These are not async-signal-safe between fork() and exec().
- **Lock ordering**: Can two code paths acquire locks in different orders → deadlock?
- **Poisoned locks**: Every `.lock().unwrap()` is a potential panic. Is `.map_err()` used?
- **Tokio runtime**: Any `block_in_place` or `block_on` in async context without `spawn_blocking`?

#### State Machines
- Can a state transition be skipped or repeated?
- What happens if an operation is called twice? If cleanup is called before init?
- Are cleanup paths (Drop impls, finally blocks, defer statements) complete — no leaked handles, processes, temp files?
- Can an error during transition leave the state machine in an inconsistent state?

#### Resource Management
- Are timeouts applied to all external calls (JSON-RPC, Nostr, IPFS)?
- Can an OOM in one component crash the entire system?
- Are file handles, connections, and temp files cleaned up on all paths (including error paths)?
- Are retry loops bounded (not infinite)?

#### Error Handling
- Any unhandled exceptions or unwraps on fallible operations?
- Are error messages specific enough to diagnose issues without exposing internals?
- Does every error propagation preserve the original context?
- Are there silent swallows (empty catch blocks, `.ok()`, `_ = ...`) that hide failures?

### 4. Collect and Triage

After all sub-agents return, compile findings into a single report:

```
## Steelman Review: [branch]

### Critical (must fix before merge)
1. **[FILE:LINE]** — Description. Fix: ...

### Warnings (should fix, not blocking)
1. **[FILE:LINE]** — Description. Fix: ...

### Notes (observations, not actionable)
1. **[FILE:LINE]** — Description.

### Verified Clean
- [x] No private keys in logs or error messages
- [x] All inclusion proofs verified against known roots
- [x] All external calls have timeouts
- [x] Error paths don't leak resources
- [x] Async operations properly cancelled on shutdown
```

### 5. Offer to Fix

If critical or warning items are found, offer to implement all fixes. Group related fixes into logical commits. After fixing, run the steelman again on your own fixes — recursion is the point.

## Output

Always end with a clear verdict:
- **SHIP IT** — No critical findings, warnings are acceptable.
- **FIX FIRST** — Critical findings that must be addressed. List them.
- **RETHINK** — Architectural issue that a patch can't fix. Explain the concern.
