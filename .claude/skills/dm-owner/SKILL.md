---
name: dm-owner
description: Send a direct message to the configured owner via Nostr transport. Accepts message text as argument.
---

# /dm-owner — Send DM to Owner

Send a direct message to the configured owner via Nostr transport.

## Instructions

1. Read the agent configuration files:
   - Identity: `$CLAUDE_PROJECT_DIR/.claude/agent/identity.json`
   - Config: `$CLAUDE_PROJECT_DIR/.claude/agent/config.json`

2. Extract the owner's npub from `config.json` (`owner_npub` field).

3. If the skill was invoked with arguments (e.g., `/dm-owner Status update: auth fix is complete`), use the argument text as the message body.

4. If no arguments were provided, ask the user what message to send.

5. Send the message:
   ```bash
   node "$CLAUDE_PROJECT_DIR/../lib/sphere-helper.mjs" send-dm \
     "<owner-npub>" "<message>" \
     --identity "$CLAUDE_PROJECT_DIR/.claude/agent/identity.json"
   ```
   If the helper is not found at that path, try `"$CLAUDE_PROJECT_DIR/lib/sphere-helper.mjs"` instead.

6. Confirm delivery to the user:
   ```
   Message sent to @owner-nametag (npub1...short).
   ```

7. If sending fails, report the error and suggest checking:
   - Is the identity file present? (`ls .claude/agent/identity.json`)
   - Is sphere-sdk installed? (`node -e "require.resolve('@unicitylabs/sphere-sdk')"`)
   - Are Nostr relays reachable?

## Use Cases

- **Status updates:** `/dm-owner Completed the auth refactor, all tests passing`
- **Escalation:** `/dm-owner Blocked on API key for production relay, need your input`
- **Asking for guidance:** `/dm-owner Should I prioritize the L3 aggregator fix or the SDK migration?`
