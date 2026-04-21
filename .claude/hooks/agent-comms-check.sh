#!/bin/bash
# Async PostToolUse hook: fallback polling for agent messages.
# Fires after Bash tool calls. Never blocks (async hooks cannot block).
# Polls Nostr relays via sphere-helper.mjs if the daemon isn't running.
# Merges new messages into the shared state file.
#
# Cooldown: skips if last poll was <10 minutes ago.
# State file: /tmp/claude/agent-messages.json

INPUT=$(cat)

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0

IDENTITY_FILE="$CLAUDE_PROJECT_DIR/.claude/agent/identity.json"
CONFIG_FILE="$CLAUDE_PROJECT_DIR/.claude/agent/config.json"

# Skip if no identity configured
[ -f "$IDENTITY_FILE" ] || exit 0
[ -f "$CONFIG_FILE" ] || exit 0

STATE_DIR="/tmp/claude"
STATE_FILE="$STATE_DIR/agent-messages.json"
COOLDOWN_FILE="$STATE_DIR/agent-comms-last-poll"
HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$STATE_DIR"

# --- Cooldown: skip if last poll was <10 minutes ago ---
NOW=$(date +%s)
if [ -f "$COOLDOWN_FILE" ]; then
  LAST_POLL=$(cat "$COOLDOWN_FILE" 2>/dev/null || echo 0)
  ELAPSED=$(( NOW - LAST_POLL ))
  if [ "$ELAPSED" -lt 600 ]; then
    exit 0
  fi
fi

echo "$NOW" > "$COOLDOWN_FILE"

# --- Locate sphere-helper.mjs ---
# Try relative to hooks dir (deployed), then relative to project
HELPER=""
for candidate in \
  "$CLAUDE_PROJECT_DIR/../lib/sphere-helper.mjs" \
  "$CLAUDE_PROJECT_DIR/lib/sphere-helper.mjs" \
  "$(dirname "$HOOK_DIR")/../lib/sphere-helper.mjs"; do
  if [ -f "$candidate" ]; then
    HELPER="$candidate"
    break
  fi
done

if [ -z "$HELPER" ]; then
  # No helper available — cannot poll
  exit 0
fi

# --- Calculate since timestamp (10 minutes ago) ---
SINCE=$(( NOW - 600 ))

# --- Poll for messages ---
POLL_RESULT=$(node "$HELPER" check-messages \
  --identity "$IDENTITY_FILE" \
  --config "$CONFIG_FILE" \
  --since "$SINCE" 2>/dev/null || echo '{"messages":[]}')

NEW_COUNT=$(echo "$POLL_RESULT" | jq '.messages | length' 2>/dev/null || echo 0)

# Exit if no new messages
if [ "$NEW_COUNT" -eq 0 ] 2>/dev/null; then
  exit 0
fi

# --- Merge into state file ---
if [ -f "$STATE_FILE" ]; then
  CURRENT=$(cat "$STATE_FILE")
else
  CURRENT='{"unread": false, "unread_count": 0, "priority_count": 0, "messages": []}'
fi

# Merge: append new messages, update counts
MERGED=$(echo "$CURRENT" | jq \
  --argjson new_msgs "$(echo "$POLL_RESULT" | jq '.messages')" \
  '.messages += $new_msgs |
   .unread = true |
   .unread_count = (.unread_count + ($new_msgs | length)) |
   .priority_count = (.priority_count + ($new_msgs | map(select(.priority == true)) | length))')

echo "$MERGED" > "$STATE_FILE"

# --- Notify ---
PRIORITY_NEW=$(echo "$POLL_RESULT" | jq '[.messages[] | select(.priority == true)] | length' 2>/dev/null || echo 0)

if [ -f "$HOOK_DIR/notify.sh" ]; then
  # shellcheck source=notify.sh
  source "$HOOK_DIR/notify.sh"

  if [ "$PRIORITY_NEW" -gt 0 ] 2>/dev/null; then
    notify "Unicity Agent: Priority Messages" "$PRIORITY_NEW priority + $NEW_COUNT total new message(s)" "critical"
  else
    notify "Unicity Agent: New Messages" "$NEW_COUNT new message(s) from dev group" "normal"
  fi
fi

exit 0
