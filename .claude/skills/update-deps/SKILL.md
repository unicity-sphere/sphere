# /update-deps — Update Upstream Dependencies

Update upstream npm/git dependencies that have been flagged by the dep-update-check hook.

## When to Use

Run this when the Stop hook blocks you with "Upstream dependency updates detected" or when you want to proactively pull in upstream changes.

## Process

### 1. Read State File

```bash
cat /tmp/claude/dep-updates.json
```

Parse the `updates` array. Each entry has: `name`, `method` (npm/git), `current`, `latest`, `source` (GitHub owner/repo).

### 2. Check Upstream Release Notes

For each update, check for breaking changes:

```bash
gh api repos/<source>/releases/latest --jq '.body' 2>/dev/null
```

Scan the release notes for keywords: `BREAKING`, `removed`, `renamed`, `deprecated`, `migration`. Flag any that appear.

### 3. Update Dependencies

**For npm deps:**
```bash
npm install <npm_package>@latest
```

**For git deps:**
Update the git reference in `package.json` to point to the new commit, then:
```bash
npm install
```

### 4. Build Check

Run the project's type checker to detect API breakage early:

```bash
npx tsc --noEmit
```

Or the project-specific build command from the repository map.

### 5. Adapt Code if Build Fails

If the build fails after updating:
1. Read the new upstream types/API from the updated package in `node_modules`
2. Identify what changed (renamed exports, new required parameters, changed types)
3. Update the consuming code to match the new API
4. Re-run the build check until it passes

If you cannot resolve the breakage automatically, notify the user with a clear explanation of what changed and what needs manual intervention.

### 6. Run Full Test Suite

```bash
npm run test
```

Or the project-specific test command. Fix any test failures caused by the dependency update.

### 7. Commit the Update

Use conventional commit format:

```
deps(<repo>): update <dep-names> to latest

- <dep1>: <old> → <new>
- <dep2>: <old> → <new>
```

### 8. Clear State Files

```bash
rm -f /tmp/claude/dep-updates.json /tmp/claude/dep-updates-notified
```

This clears the Stop gate so you can finish your session.

## Escape Hatch

If you need to skip the dependency update (e.g., the update is known-incompatible and being handled separately):

```bash
rm -f /tmp/claude/dep-updates.json /tmp/claude/dep-updates-notified
```

This clears the state files without updating. Document why you skipped in your PR description.
