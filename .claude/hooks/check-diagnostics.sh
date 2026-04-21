#!/bin/bash
# Stop hook: blocks Claude from stopping if there are build errors.
# Auto-detects project type. Uses stop_hook_active to prevent infinite loops.

INPUT=$(cat)

# Don't block if we're already continuing from a previous stop hook
ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null)
if [ "$ACTIVE" = "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0

# --- Rust: Check cargo-diag status file ---
if [ -f "Cargo.toml" ]; then
  STATUS_FILE="$CLAUDE_PROJECT_DIR/target/cargo-diag/status.json"
  if [ -f "$STATUS_FILE" ]; then
    ERROR_COUNT=$(jq -r '.error_count // 0' "$STATUS_FILE" 2>/dev/null)
    SUMMARY=$(jq -r '.summary // "unknown"' "$STATUS_FILE" 2>/dev/null)

    if [ "$ERROR_COUNT" != "0" ] && [ "$ERROR_COUNT" != "null" ]; then
      jq -n --arg reason "Build diagnostics: ${SUMMARY}. Use the cargo-diag MCP errors() tool for details, or suggest_fix(id) for auto-fixes. Fix errors before finishing." '{
        "decision": "block",
        "reason": $reason
      }'
      exit 0
    fi
  fi
fi

# --- TypeScript: Run typecheck if available ---
if [ -f "package.json" ]; then
  if jq -e '.scripts.typecheck' package.json >/dev/null 2>&1; then
    if ! npm run typecheck --silent >/dev/null 2>&1; then
      TC_OUTPUT=$(npm run typecheck --silent 2>&1 | tail -10)
      jq -n --arg reason "TypeScript type errors found. Fix before finishing:\n${TC_OUTPUT}" '{
        "decision": "block",
        "reason": $reason
      }'
      exit 0
    fi
  fi
fi

# --- Go: Check build ---
if [ -f "go.mod" ]; then
  BUILD_OUTPUT=$(go build ./... 2>&1)
  if [ $? -ne 0 ]; then
    jq -n --arg reason "Go build errors found. Fix before finishing:\n${BUILD_OUTPUT}" '{
      "decision": "block",
      "reason": $reason
    }'
    exit 0
  fi
fi

# --- Remote sync check ---
SYNC_STATE="/tmp/claude/remote-sync.json"
if [ -f "$SYNC_STATE" ]; then
  PENDING=$(jq -r '.pending // false' "$SYNC_STATE" 2>/dev/null)
  if [ "$PENDING" = "true" ]; then
    MAIN_BEHIND=$(jq -r '.main_behind // 0' "$SYNC_STATE")
    BRANCH_BEHIND=$(jq -r '.branch_behind // 0' "$SYNC_STATE")
    BRANCH=$(jq -r '.branch // "unknown"' "$SYNC_STATE")

    SYNC_MSG="Remote updates detected."
    [ "$MAIN_BEHIND" -gt 0 ] 2>/dev/null && SYNC_MSG="$SYNC_MSG main is $MAIN_BEHIND commit(s) behind origin/main."
    [ "$BRANCH_BEHIND" -gt 0 ] 2>/dev/null && SYNC_MSG="$SYNC_MSG $BRANCH is $BRANCH_BEHIND commit(s) behind remote."
    SYNC_MSG="$SYNC_MSG Run /sync-remote to merge before finishing."

    jq -n --arg reason "$SYNC_MSG" '{"decision":"block","reason":$reason}'
    exit 0
  fi
fi

# --- Upstream dependency update check ---
DEP_STATE="/tmp/claude/dep-updates.json"
if [ -f "$DEP_STATE" ]; then
  DEP_PENDING=$(jq -r '.pending // false' "$DEP_STATE" 2>/dev/null)
  if [ "$DEP_PENDING" = "true" ]; then
    UPDATE_COUNT=$(jq '.updates | length' "$DEP_STATE" 2>/dev/null)
    DEP_NAMES=$(jq -r '[.updates[].name] | join(", ")' "$DEP_STATE" 2>/dev/null)

    DEP_MSG="Upstream dependency updates detected. ${UPDATE_COUNT} dep(s) have new versions: ${DEP_NAMES}."
    DEP_MSG="$DEP_MSG Run /update-deps to update before finishing."

    jq -n --arg reason "$DEP_MSG" '{"decision":"block","reason":$reason}'
    exit 0
  fi
fi

# --- Urgent agent messages check ---
MSG_STATE="/tmp/claude/agent-messages.json"
if [ -f "$MSG_STATE" ]; then
  PRIORITY_COUNT=$(jq -r '.priority_count // 0' "$MSG_STATE" 2>/dev/null)
  if [ "$PRIORITY_COUNT" -gt 0 ] 2>/dev/null && [ "$PRIORITY_COUNT" != "0" ]; then
    MSG_MSG="You have ${PRIORITY_COUNT} unread priority message(s) from your owner. Run /check-messages to read them before finishing."
    jq -n --arg reason "$MSG_MSG" '{"decision":"block","reason":$reason}'
    exit 0
  fi
fi

exit 0
