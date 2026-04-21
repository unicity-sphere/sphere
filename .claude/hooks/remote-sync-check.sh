#!/bin/bash
# Async PostToolUse hook: detects when remote branches have new commits.
# Fires after Bash tool calls. Never blocks (async hooks cannot block).
# Writes state file for check-diagnostics.sh to enforce at Stop time.
#
# Cooldown: skips git fetch if last fetch was <5 minutes ago.
# State file: /tmp/claude/remote-sync.json

INPUT=$(cat)

# Only run inside a git repo
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

STATE_DIR="/tmp/claude"
STATE_FILE="$STATE_DIR/remote-sync.json"
mkdir -p "$STATE_DIR"

# --- Cooldown: skip if last fetch was <5 minutes ago ---
NOW=$(date +%s)
if [ -f "$STATE_FILE" ]; then
  LAST_FETCH=$(jq -r '.last_fetch // 0' "$STATE_FILE" 2>/dev/null)
  ELAPSED=$(( NOW - LAST_FETCH ))
  if [ "$ELAPSED" -lt 300 ]; then
    exit 0
  fi
fi

# --- Fetch from remote ---
git fetch --quiet 2>/dev/null || exit 0

# --- Compare local vs remote ---
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
MAIN_BEHIND=0
BRANCH_BEHIND=0
MAIN_REMOTE_SHA=""
BRANCH_REMOTE_SHA=""

# Check main vs origin/main
if git rev-parse --verify origin/main >/dev/null 2>&1 && git rev-parse --verify main >/dev/null 2>&1; then
  MAIN_BEHIND=$(git rev-list --count main..origin/main 2>/dev/null || echo 0)
  if [ "$MAIN_BEHIND" -gt 0 ]; then
    MAIN_REMOTE_SHA=$(git rev-parse origin/main 2>/dev/null)
  fi
fi

# Check current branch vs its tracking branch (if not main and has upstream)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "HEAD" ]; then
  UPSTREAM=$(git rev-parse --abbrev-ref "@{upstream}" 2>/dev/null)
  if [ -n "$UPSTREAM" ]; then
    BRANCH_BEHIND=$(git rev-list --count "$CURRENT_BRANCH".."$UPSTREAM" 2>/dev/null || echo 0)
    if [ "$BRANCH_BEHIND" -gt 0 ]; then
      BRANCH_REMOTE_SHA=$(git rev-parse "$UPSTREAM" 2>/dev/null)
    fi
  fi
fi

# --- Write state file ---
PENDING=false
if [ "$MAIN_BEHIND" -gt 0 ] || [ "$BRANCH_BEHIND" -gt 0 ]; then
  PENDING=true
fi

DETECTED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u +"%Y-%m-%dT%H:%M:%S" 2>/dev/null)

jq -n \
  --argjson last_fetch "$NOW" \
  --argjson pending "$PENDING" \
  --argjson main_behind "$MAIN_BEHIND" \
  --argjson branch_behind "$BRANCH_BEHIND" \
  --arg branch "$CURRENT_BRANCH" \
  --arg main_remote_sha "${MAIN_REMOTE_SHA:-}" \
  --arg branch_remote_sha "${BRANCH_REMOTE_SHA:-}" \
  --arg detected_at "$DETECTED_AT" \
  '{
    last_fetch: $last_fetch,
    pending: $pending,
    main_behind: $main_behind,
    branch_behind: $branch_behind,
    branch: $branch,
    main_remote_sha: $main_remote_sha,
    branch_remote_sha: $branch_remote_sha,
    detected_at: $detected_at
  }' > "$STATE_FILE"

# --- Notify if updates detected (and not previously notified for same SHAs) ---
if [ "$PENDING" = "true" ]; then
  NOTIFIED_FILE="$STATE_DIR/remote-sync-notified"
  NOTIFY_KEY="${MAIN_REMOTE_SHA:-none}:${BRANCH_REMOTE_SHA:-none}"

  PREV_KEY=""
  if [ -f "$NOTIFIED_FILE" ]; then
    PREV_KEY=$(cat "$NOTIFIED_FILE" 2>/dev/null)
  fi

  if [ "$NOTIFY_KEY" != "$PREV_KEY" ]; then
    # Source notify.sh for desktop/push notifications
    HOOK_DIR="$(dirname "$0")"
    if [ -f "$HOOK_DIR/notify.sh" ]; then
      # shellcheck source=notify.sh
      source "$HOOK_DIR/notify.sh"

      NOTIFY_BODY=""
      [ "$MAIN_BEHIND" -gt 0 ] && NOTIFY_BODY="main is $MAIN_BEHIND commit(s) behind origin/main. "
      [ "$BRANCH_BEHIND" -gt 0 ] && NOTIFY_BODY="${NOTIFY_BODY}$CURRENT_BRANCH is $BRANCH_BEHIND commit(s) behind remote."

      notify "Unicity: Remote Updates" "$NOTIFY_BODY" "normal"
    fi

    echo "$NOTIFY_KEY" > "$NOTIFIED_FILE"
  fi
fi

exit 0
