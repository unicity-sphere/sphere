---
name: sync-remote
description: Fetch remote updates and merge into current branch. Use when the remote-sync hook detects pending updates and blocks Stop.
---

# Sync Remote Updates

Fetch remote changes and merge them into the current working branch. Handles fast-forward, merge, rebase, and conflict resolution.

## Process

### 1. Gather State

Run these commands in parallel:

```bash
git fetch --all --quiet
cat /tmp/claude/remote-sync.json 2>/dev/null || echo '{"pending":false}'
git rev-parse --abbrev-ref HEAD
git status --short
git log --oneline -5
```

If the state file shows `pending: false` or doesn't exist, report "Already up to date" and exit.

### 2. Sync Main with Origin

If `main_behind > 0` in the state file:

```bash
# Stash any uncommitted work
git stash --include-untracked --quiet 2>/dev/null

# Update local main
git checkout main
git pull --ff-only origin main

# Return to working branch
git checkout <branch>

# Merge main into the working branch
git merge main --no-ff -m "chore: merge main (sync with remote updates)"

# Restore stash if we stashed
git stash pop --quiet 2>/dev/null || true
```

If `git pull --ff-only` fails (main has diverged), fall back to:
```bash
git pull --rebase origin main
```

### 3. Sync Branch with Remote Tracking

If `branch_behind > 0` in the state file and the current branch has a remote tracking branch:

```bash
# Prefer rebase for linear history
git pull --rebase origin <branch>
```

If rebase fails due to conflicts, abort and fall back to merge:
```bash
git rebase --abort
git pull --no-rebase origin <branch>
```

### 4. Conflict Resolution

If merge or rebase produces conflicts:

1. Run `git diff --name-only --diff-filter=U` to list conflicted files
2. For each conflicted file, read the file and resolve the conflict:
   - Use a **code-reviewer** agent (Opus model) to analyze each conflicted file
   - The agent should understand both sides of the conflict and pick the correct resolution
   - Stage each resolved file with `git add <file>`
3. Complete the merge/rebase:
   - For merge: `git commit --no-edit`
   - For rebase: `git rebase --continue`

If conflicts cannot be resolved automatically (agent confidence is low or files are too complex):

1. Send a **critical** notification:
   ```bash
   source "$CLAUDE_PROJECT_DIR/.claude/hooks/notify.sh"
   notify "Unicity: Merge Conflict" "Manual resolution needed on <branch>. <N> conflicted files." "critical"
   ```
2. Report the conflicted files to the user and ask for guidance
3. Do NOT force-resolve or delete conflict markers

### 5. Verify

After successful merge/rebase:

1. Auto-detect project type and run the appropriate build check:
   - Rust: `cargo build --workspace 2>&1 | tail -5`
   - TypeScript: `npm run typecheck --silent 2>&1 | tail -5` (if script exists)
   - Go: `go build ./... 2>&1 | tail -5`
2. If build fails, report the errors — do NOT revert the merge. The user needs to fix forward.

### 6. Clear State

Delete the state file so the Stop hook no longer blocks:

```bash
rm -f /tmp/claude/remote-sync.json
rm -f /tmp/claude/remote-sync-notified
```

### 7. Report

Print a summary:

```
Remote sync complete:
- main: pulled N commit(s) from origin/main
- <branch>: rebased/merged N commit(s) from origin/<branch>
- Build status: OK / FAILED (details)
- Conflicts resolved: N files (or "none")
```
