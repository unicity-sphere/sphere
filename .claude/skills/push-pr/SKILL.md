---
name: push-pr
description: Push branch and create a GitHub PR with structured template. Use when ready to open a pull request for the current branch.
argument-hint: <description>
---

# Push & Create Pull Request

Analyze the current branch, push it, and create a GitHub PR with a structured template.

## Arguments

- `$ARGUMENTS` - Optional short description of the PR's purpose (e.g., "use shared truncate helper in telegram crate"). Provides upfront context for a more accurate title and summary. When omitted, everything is derived from the commit history and diff.

## Process

### 1. Gather Context

Run these commands in parallel:

```bash
git status
git log main..HEAD --oneline
git diff main...HEAD --stat
git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null
```

Abort if:
- The current branch **is** `main` — refuse to create a PR from main.
- There are **zero commits** ahead of main — nothing to open a PR for.

Warn (but continue) if there are uncommitted changes.

### 2. Analyze Changes

Read the full diff and all commit messages:

```bash
git log main..HEAD --format="%h %s%n%b"
git diff main...HEAD
```

Understand the **full scope** of changes across all commits, not just the latest one. Use `$ARGUMENTS` (if provided) as the guiding context for what this PR is about.

### 3. Build the PR

#### Title
- Derive from `$ARGUMENTS` and/or the changes
- Under 70 characters
- Use conventional commit style if the commits already follow it (e.g., `fix(telegram): use core truncate_to_boundary helper`)

#### Body

Always include **Summary** and **Test Plan**. Only include optional sections when they are actually relevant — do not include empty sections or placeholder text.

```markdown
## Summary
<1-3 bullet points summarizing the change>

## Test Plan
<How to verify — manual steps, test commands, etc.>
```

Optional sections — include **only** when relevant:

```markdown
## Breaking Changes
<What broke and why>

## Migration Guide
<Steps users need to take>

## Related Issues
Closes #N

## Screenshots
<If UI changes are involved>
```

### 4. Push & Create

#### Push

Push via the HTTPS URL (SSH is not available in this environment). Use `gh` to derive the URL:

```bash
BRANCH="$(git branch --show-current)"
REPO_URL="$(gh repo view --json url -q .url)"
git push "$REPO_URL" "HEAD:$BRANCH"
```

#### Create PR

Always use `--head` with the branch name — this is more robust than relying on the tracking ref, which can point at the wrong remote after an HTTPS fallback push.

```bash
BRANCH="$(git branch --show-current)"
gh pr create --head "$BRANCH" --title "the pr title" --body "$(cat <<'EOF'
<assembled body>
EOF
)"
```

### 5. Output

Print the PR URL so the user can see it.
