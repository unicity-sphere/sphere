---
name: update-issue
description: Push branch to GitHub and post a progress update comment on an issue. Use after completing work streams or milestones.
argument-hint: <issue-number> [message]
---

# Update Issue

Push the current branch to GitHub and post a structured progress comment on a GitHub issue.

## Arguments

- `$ARGUMENTS` - Required. The first token is the issue number (e.g., `11`). Any remaining text is an optional message to include in the comment (e.g., `11 WS-5 is now complete`).

Parse like this:
- `11` → issue #11, no extra message
- `11 WS-5 complete, starting WS-7` → issue #11, message: "WS-5 complete, starting WS-7"

## Process

### 1. Push Branch

Push the current branch to GitHub via HTTPS:

```bash
BRANCH="$(git branch --show-current)"
REPO_URL="$(gh repo view --json url -q .url)"
git push "$REPO_URL" "HEAD:$BRANCH"
```

If already up to date, continue — pushing is best-effort.

### 2. Read the Issue

Fetch the issue body and any existing comments to understand:
- The full list of work streams / tasks / checkboxes
- What has already been reported as done in previous comments

```bash
gh issue view <number> --json body,comments
```

### 3. Determine Status

Cross-reference the issue's task list against the branch's commit history:

```bash
git log main..HEAD --oneline
```

For each work stream or checkbox item in the issue, determine if it's:
- **Done** — a commit on the branch clearly implements it
- **In progress** — partially done or the user's message indicates it
- **Pending** — no matching commits yet

### 4. Post Comment

Post a structured progress comment:

```bash
gh issue comment <number> --body "$(cat <<'EOF'
## Progress Update

**Branch:** `<branch-name>` | **PR:** #<pr-number> (if one exists)

### Completed
- [x] **WS-N**: Description — `<short-hash>`
...

### In Progress
- [ ] **WS-N**: Description (status note)
...

### Up Next
- [ ] **WS-N**: Description (dependencies)
...

<optional user message if provided>
EOF
)"
```

Rules:
- Only include sections that have items (skip empty "In Progress" if nothing is in progress)
- Include commit short-hashes for completed items when available
- If there's an open PR for the branch, include it in the header
- If the user provided an extra message, include it at the bottom under a `### Notes` heading
- Keep it concise — one line per work stream

### 5. Output

Print the comment URL so the user can see it.
