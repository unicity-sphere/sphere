#!/bin/bash
# PreToolUse hook for ExitPlanMode: forces steelman critique.
# Blocks the first ExitPlanMode attempt, requiring Claude to critically
# evaluate its plan before submitting to the user.
#
# Flow:
#   1. Claude writes plan → calls ExitPlanMode
#   2. Hook blocks with steelman questions → Claude critiques its own plan
#   3. Claude addresses each point, revises if needed → calls ExitPlanMode again
#   4. Hook sees recent state file → allows through

STATE_FILE="/tmp/claude/steelman-done"

if [ -f "$STATE_FILE" ]; then
  # Allow through if steelman was done recently (within 10 minutes)
  if [ "$(uname)" = "Darwin" ]; then
    FILE_AGE=$(( $(date +%s) - $(stat -f %m "$STATE_FILE") ))
  else
    FILE_AGE=$(( $(date +%s) - $(stat -c %Y "$STATE_FILE") ))
  fi

  if [ "$FILE_AGE" -lt 600 ]; then
    rm -f "$STATE_FILE"
    exit 0
  fi
  # Stale file — remove and re-trigger steelman
  rm -f "$STATE_FILE"
fi

# Create state file and block with steelman critique
mkdir -p /tmp/claude
touch "$STATE_FILE"

REASON="STEELMAN CHECK — Before submitting this plan, critically argue against it:

1. Is there a simpler approach that achieves the same goal?
2. Does this duplicate anything that already exists in the codebase?
3. Are the steps in the right order — are dependencies between them satisfied?
4. Does this change more than what was requested?
5. What is the most likely reason this plan fails during implementation?

Address each point concisely. If any reveal a blocking issue, revise the plan first. Then call ExitPlanMode again."

jq -n --arg reason "$REASON" '{ "decision": "block", "reason": $reason }'
