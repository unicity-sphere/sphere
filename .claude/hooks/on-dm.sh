#!/bin/bash
# Daemon hook: called by sphere-sdk daemon when a DM arrives.
# Receives message JSON on stdin. Appends to state file and notifies.
# Always exits 0 (daemon hooks must not fail).
set -euo pipefail

HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
STATE_DIR="/tmp/claude"
STATE_FILE="$STATE_DIR/agent-messages.json"
IDENTITY_FILE="$CLAUDE_PROJECT_DIR/.claude/agent/identity.json"
CONFIG_FILE="$CLAUDE_PROJECT_DIR/.claude/agent/config.json"

mkdir -p "$STATE_DIR"

# Read message from stdin
MSG_JSON=$(cat)

# Extract fields
SENDER=$(echo "$MSG_JSON" | jq -r '.pubkey // .from // "unknown"')
BODY=$(echo "$MSG_JSON" | jq -r '.content // .body // ""')
TIMESTAMP=$(echo "$MSG_JSON" | jq -r '.created_at // empty')

# Convert unix timestamp to ISO if numeric
if [[ "$TIMESTAMP" =~ ^[0-9]+$ ]]; then
  TIMESTAMP=$(date -u -d "@$TIMESTAMP" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || \
    date -u -r "$TIMESTAMP" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || \
    echo "$TIMESTAMP")
fi
TIMESTAMP="${TIMESTAMP:-$(date -u +"%Y-%m-%dT%H:%M:%SZ")}"

# Resolve sender name from config
FROM_NAME=""
OWNER_NPUB=""
if [ -f "$CONFIG_FILE" ]; then
  OWNER_NPUB=$(jq -r '.owner_npub // ""' "$CONFIG_FILE" 2>/dev/null)
  if [ "$SENDER" = "$OWNER_NPUB" ]; then
    FROM_NAME=$(jq -r '.owner_nametag // ""' "$CONFIG_FILE" 2>/dev/null)
  fi
fi

# Determine priority (owner messages are priority)
IS_PRIORITY=false
if [ -n "$OWNER_NPUB" ] && [ "$SENDER" = "$OWNER_NPUB" ]; then
  IS_PRIORITY=true
fi

# Build message entry
NEW_MSG=$(jq -n \
  --arg type "dm" \
  --arg from "$SENDER" \
  --arg from_name "$FROM_NAME" \
  --arg body "$BODY" \
  --arg timestamp "$TIMESTAMP" \
  --argjson priority "$IS_PRIORITY" \
  '{
    type: $type,
    from: $from,
    from_name: $from_name,
    body: $body,
    timestamp: $timestamp,
    priority: $priority,
    read: false
  }')

# Append to state file (create if missing)
if [ -f "$STATE_FILE" ]; then
  CURRENT=$(cat "$STATE_FILE")
else
  CURRENT='{"unread": false, "unread_count": 0, "priority_count": 0, "messages": []}'
fi

UPDATED=$(echo "$CURRENT" | jq \
  --argjson msg "$NEW_MSG" \
  --argjson is_priority "$IS_PRIORITY" \
  '.messages += [$msg] |
   .unread = true |
   .unread_count = (.unread_count + 1) |
   .priority_count = (if $is_priority then .priority_count + 1 else .priority_count end)')

echo "$UPDATED" > "$STATE_FILE"

# Notify
if [ -f "$HOOK_DIR/notify.sh" ]; then
  # shellcheck source=notify.sh
  source "$HOOK_DIR/notify.sh"

  if [ "$IS_PRIORITY" = "true" ]; then
    notify "Unicity Agent: Priority DM" "From owner: ${BODY:0:100}" "critical"
  else
    notify "Unicity Agent: DM" "From ${FROM_NAME:-$SENDER}: ${BODY:0:100}" "normal"
  fi
fi

exit 0
