#!/bin/bash
# PreToolUse hook: blocks Edit/Write when on main/master.
# Forces Claude to create a feature branch before writing code.

BRANCH=$(git -C "$CLAUDE_PROJECT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null)

if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  jq -n --arg reason "You are on '$BRANCH'. Create a feature branch before writing code: git checkout -b <branch-name> main" '{
    "decision": "block",
    "reason": $reason
  }'
  exit 0
fi

exit 0
