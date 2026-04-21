#!/bin/bash
# Daemon hook: called by sphere-sdk daemon when a group message arrives.
# Receives message JSON on stdin. Filters own messages, appends to state file, notifies.
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
GROUP_ID=$(echo "$MSG_JSON" | jq -r '.tags[] | select(.[0] == "h") | .[1] // empty' 2>/dev/null || echo "")
GROUP_NAME=$(echo "$MSG_JSON" | jq -r '.group_name // "UNICITY_DEV_AGENTS"')

# Filter out own messages
OWN_NPUB=""
if [ -f "$IDENTITY_FILE" ]; then
  OWN_NPUB=$(jq -r '.npub // ""' "$IDENTITY_FILE" 2>/dev/null)
fi
if [ -n "$OWN_NPUB" ] && [ "$SENDER" = "$OWN_NPUB" ]; then
  exit 0
fi

# Convert unix timestamp to ISO if numeric
if [[ "$TIMESTAMP" =~ ^[0-9]+$ ]]; then
  TIMESTAMP=$(date -u -d "@$TIMESTAMP" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || \
    date -u -r "$TIMESTAMP" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || \
    echo "$TIMESTAMP")
fi
TIMESTAMP="${TIMESTAMP:-$(date -u +"%Y-%m-%dT%H:%M:%SZ")}"

# Check if sender is owner (priority)
OWNER_NPUB=""
IS_PRIORITY=false
if [ -f "$CONFIG_FILE" ]; then
  OWNER_NPUB=$(jq -r '.owner_npub // ""' "$CONFIG_FILE" 2>/dev/null)
  if [ -n "$OWNER_NPUB" ] && [ "$SENDER" = "$OWNER_NPUB" ]; then
    IS_PRIORITY=true
  fi
fi

# Build message entry
NEW_MSG=$(jq -n \
  --arg type "group" \
  --arg from "$SENDER" \
  --arg from_name "" \
  --arg body "$BODY" \
  --arg timestamp "$TIMESTAMP" \
  --argjson priority "$IS_PRIORITY" \
  --arg group_id "$GROUP_ID" \
  --arg group_name "$GROUP_NAME" \
  '{
    type: $type,
    from: $from,
    from_name: $from_name,
    body: $body,
    timestamp: $timestamp,
    priority: $priority,
    read: false,
    group: {
      id: $group_id,
      name: $group_name
    }
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
    notify "Unicity Agent: Priority Group Message" "From owner in ${GROUP_NAME}: ${BODY:0:100}" "critical"
  else
    notify "Unicity Agent: Group" "${GROUP_NAME}: ${BODY:0:100}" "low"
  fi
fi

exit 0
