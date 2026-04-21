#!/bin/bash
# Block git commit if language-specific checks fail.
# Auto-detects project type from Cargo.toml, package.json, or go.mod.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# Only intercept git commit commands
if ! echo "$COMMAND" | grep -q "git commit"; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0

BLOCKED=false
REASONS=""

# --- Rust ---
if [ -f "Cargo.toml" ]; then
  if ! cargo fmt --all --check >/dev/null 2>&1; then
    BLOCKED=true
    REASONS="${REASONS}cargo fmt --all --check failed. Run cargo fmt --all to fix formatting.\n"
  fi

  if ! cargo clippy --workspace -- -D warnings 2>&1 | tail -1 | grep -q "^$\|Finished\|warning: 0 warnings"; then
    CLIPPY_OUTPUT=$(cargo clippy --workspace -- -D warnings 2>&1 | tail -5)
    BLOCKED=true
    REASONS="${REASONS}cargo clippy failed:\n${CLIPPY_OUTPUT}\n"
  fi
fi

# --- TypeScript / Node.js ---
if [ -f "package.json" ]; then
  # Check if lint script exists
  if jq -e '.scripts.lint' package.json >/dev/null 2>&1; then
    LINT_OUTPUT=$(npm run lint --silent 2>&1)
    if [ $? -ne 0 ]; then
      BLOCKED=true
      REASONS="${REASONS}npm run lint failed:\n$(echo "$LINT_OUTPUT" | tail -5)\n"
    fi
  fi

  # Check if typecheck script exists
  if jq -e '.scripts.typecheck' package.json >/dev/null 2>&1; then
    if ! npm run typecheck --silent >/dev/null 2>&1; then
      TC_OUTPUT=$(npm run typecheck --silent 2>&1 | tail -5)
      BLOCKED=true
      REASONS="${REASONS}npm run typecheck failed:\n${TC_OUTPUT}\n"
    fi
  fi
fi

# --- Go ---
if [ -f "go.mod" ]; then
  if ! go vet ./... 2>&1 | grep -q "^$"; then
    VET_OUTPUT=$(go vet ./... 2>&1 | tail -5)
    # go vet outputs nothing on success
    if [ -n "$VET_OUTPUT" ]; then
      BLOCKED=true
      REASONS="${REASONS}go vet failed:\n${VET_OUTPUT}\n"
    fi
  fi

  # Check gofmt
  UNFORMATTED=$(gofmt -l . 2>/dev/null)
  if [ -n "$UNFORMATTED" ]; then
    BLOCKED=true
    REASONS="${REASONS}gofmt: unformatted files:\n${UNFORMATTED}\n"
  fi
fi

if [ "$BLOCKED" = true ]; then
  jq -n --arg reason "Pre-commit checks failed. Fix before committing:\n${REASONS}" '{
    "decision": "block",
    "reason": $reason
  }'
  exit 0
fi

exit 0
