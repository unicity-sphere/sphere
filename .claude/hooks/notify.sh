#!/bin/bash
# Cross-platform notification utility. Sourced by other hooks — not a hook itself.
# Provides notify() function for desktop and remote push notifications.
#
# Usage:
#   source "$(dirname "$0")/notify.sh"
#   notify "Title" "Body text" "normal"   # urgency: low|normal|critical
#
# Remote push: Set CLAUDE_NOTIFY_URL env var to enable smartphone notifications.
#   - ntfy.sh (free):  https://ntfy.sh/<your-topic>
#   - Pushover:        https://api.pushover.net/1/messages.json
#   - Custom webhook:  any URL accepting POST with body text

notify() {
  local title="$1" body="$2" urgency="${3:-normal}"

  # Desktop notification (auto-detect OS)
  if command -v notify-send >/dev/null 2>&1; then
    notify-send -u "$urgency" "$title" "$body" 2>/dev/null || true
  elif command -v osascript >/dev/null 2>&1; then
    osascript -e "display notification \"$body\" with title \"$title\"" 2>/dev/null || true
  fi

  # Remote push via ntfy.sh or custom webhook (if configured)
  if [ -n "${CLAUDE_NOTIFY_URL:-}" ]; then
    curl -s -o /dev/null --max-time 5 \
      -H "Title: $title" \
      -H "Priority: $urgency" \
      -d "$body" \
      "$CLAUDE_NOTIFY_URL" &
  fi
}
