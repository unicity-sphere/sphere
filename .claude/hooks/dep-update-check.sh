#!/bin/bash
# Async PostToolUse hook: detects when upstream npm/git dependencies have new versions.
# Fires after Bash tool calls. Never blocks (async hooks cannot block).
# Writes state file for check-diagnostics.sh to enforce at Stop time.
#
# Cooldown: skips checks if last fetch was <15 minutes ago.
# State file: /tmp/claude/dep-updates.json
# Dependency graph: dep-map.json (same directory as this script)

INPUT=$(cat)

# Only run if we have a project directory with package.json
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
[ -f "package.json" ] || exit 0

# Determine current repo name from project directory basename
REPO_NAME=$(basename "$CLAUDE_PROJECT_DIR")

HOOK_DIR="$(dirname "$0")"
DEP_MAP="$HOOK_DIR/dep-map.json"

# Skip silently if no dep-map or repo not in map
[ -f "$DEP_MAP" ] || exit 0
jq -e --arg repo "$REPO_NAME" '.repos[$repo]' "$DEP_MAP" >/dev/null 2>&1 || exit 0

STATE_DIR="/tmp/claude"
STATE_FILE="$STATE_DIR/dep-updates.json"
NOTIFIED_FILE="$STATE_DIR/dep-updates-notified"
mkdir -p "$STATE_DIR"

# --- Cooldown: skip if last check was <15 minutes ago ---
NOW=$(date +%s)
if [ -f "$STATE_FILE" ]; then
  LAST_FETCH=$(jq -r '.last_fetch // 0' "$STATE_FILE" 2>/dev/null)
  ELAPSED=$(( NOW - LAST_FETCH ))
  if [ "$ELAPSED" -lt 900 ]; then
    exit 0
  fi
fi

# --- Check each dependency for updates ---
UPDATES="[]"
HAS_UPDATES=false

DEP_COUNT=$(jq --arg repo "$REPO_NAME" '.repos[$repo].deps | length' "$DEP_MAP" 2>/dev/null)

for (( i=0; i<DEP_COUNT; i++ )); do
  DEP_JSON=$(jq --arg repo "$REPO_NAME" --argjson i "$i" '.repos[$repo].deps[$i]' "$DEP_MAP" 2>/dev/null)
  DEP_NAME=$(echo "$DEP_JSON" | jq -r '.name')
  CHECK_METHOD=$(echo "$DEP_JSON" | jq -r '.check')
  SOURCE_REPO=$(echo "$DEP_JSON" | jq -r '.source_repo')
  VERSION_PATH=$(echo "$DEP_JSON" | jq -r '.version_path')

  if [ "$CHECK_METHOD" = "npm" ]; then
    NPM_PACKAGE=$(echo "$DEP_JSON" | jq -r '.npm_package')

    # Get currently installed version from package.json (strip semver prefixes like ^ ~)
    CURRENT=$(jq -r --arg pkg "$NPM_PACKAGE" --arg vp "$VERSION_PATH" '.[$vp][$pkg] // empty' package.json 2>/dev/null | sed 's/^[^0-9]*//')
    if [ -z "$CURRENT" ]; then
      continue
    fi

    # Get latest published version from npm registry
    LATEST=$(npm view "$NPM_PACKAGE" version 2>/dev/null)
    if [ -z "$LATEST" ]; then
      continue
    fi

    if [ "$CURRENT" != "$LATEST" ]; then
      UPDATES=$(echo "$UPDATES" | jq --arg name "$DEP_NAME" --arg method "npm" --arg current "$CURRENT" --arg latest "$LATEST" --arg source "$SOURCE_REPO" \
        '. + [{"name": $name, "method": $method, "current": $current, "latest": $latest, "source": $source}]')
      HAS_UPDATES=true
    fi

  elif [ "$CHECK_METHOD" = "git" ]; then
    GIT_URL=$(echo "$DEP_JSON" | jq -r '.git_url')
    NPM_PACKAGE=$(echo "$DEP_JSON" | jq -r '.npm_package // empty')

    # For git deps, check if the remote HEAD has changed
    # Get current ref from package.json (git+https://...#<ref> or similar)
    CURRENT_REF=$(jq -r --arg pkg "$DEP_NAME" --arg vp "$VERSION_PATH" '.[$vp][$pkg] // empty' package.json 2>/dev/null)
    # Also try npm_package key if dep name doesn't match
    if [ -z "$CURRENT_REF" ] && [ -n "$NPM_PACKAGE" ]; then
      CURRENT_REF=$(jq -r --arg pkg "$NPM_PACKAGE" --arg vp "$VERSION_PATH" '.[$vp][$pkg] // empty' package.json 2>/dev/null)
    fi

    # Get remote HEAD SHA
    REMOTE_SHA=$(git ls-remote "$GIT_URL" HEAD 2>/dev/null | cut -f1)
    if [ -z "$REMOTE_SHA" ]; then
      continue
    fi
    REMOTE_SHORT="${REMOTE_SHA:0:7}"

    # Extract current SHA from git ref in package.json (after #)
    CURRENT_SHA=""
    if echo "$CURRENT_REF" | grep -q '#'; then
      CURRENT_SHA=$(echo "$CURRENT_REF" | sed 's/.*#//')
    fi

    if [ -n "$CURRENT_SHA" ] && [ "${CURRENT_SHA:0:7}" != "$REMOTE_SHORT" ]; then
      UPDATES=$(echo "$UPDATES" | jq --arg name "$DEP_NAME" --arg method "git" --arg current "${CURRENT_SHA:0:7}" --arg latest "$REMOTE_SHORT" --arg source "$SOURCE_REPO" \
        '. + [{"name": $name, "method": $method, "current": $current, "latest": $latest, "source": $source}]')
      HAS_UPDATES=true
    fi
  fi
done

# --- Write state file ---
DETECTED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u +"%Y-%m-%dT%H:%M:%S" 2>/dev/null)

jq -n \
  --argjson last_fetch "$NOW" \
  --argjson pending "$HAS_UPDATES" \
  --arg repo "$REPO_NAME" \
  --argjson updates "$UPDATES" \
  --arg detected_at "$DETECTED_AT" \
  '{
    last_fetch: $last_fetch,
    pending: $pending,
    repo: $repo,
    updates: $updates,
    detected_at: $detected_at
  }' > "$STATE_FILE"

# --- Notify if updates detected (dedup via notified file) ---
if [ "$HAS_UPDATES" = "true" ]; then
  NOTIFY_KEY=$(echo "$UPDATES" | jq -r '[.[].latest] | sort | join(":")')

  PREV_KEY=""
  if [ -f "$NOTIFIED_FILE" ]; then
    PREV_KEY=$(cat "$NOTIFIED_FILE" 2>/dev/null)
  fi

  if [ "$NOTIFY_KEY" != "$PREV_KEY" ]; then
    if [ -f "$HOOK_DIR/notify.sh" ]; then
      # shellcheck source=notify.sh
      source "$HOOK_DIR/notify.sh"

      UPDATE_COUNT=$(echo "$UPDATES" | jq 'length')
      DEP_NAMES=$(echo "$UPDATES" | jq -r '[.[].name] | join(", ")')
      notify "Unicity: Dependency Updates" "$UPDATE_COUNT upstream dep(s) have new versions: $DEP_NAMES. Run /update-deps." "normal"
    fi

    echo "$NOTIFY_KEY" > "$NOTIFIED_FILE"
  fi
fi

exit 0
