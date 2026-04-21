# unicity-orchestrator

> **Purpose:** TypeScript MCP orchestrator using a knowledge graph for intelligent tool discovery and routing across the Unicity ecosystem.

## Build & Test

```bash
npm run build     # Build
npm run test      # Run tests
npm run lint      # Lint
```

## Public API

### Core
- **`Orchestrator`** — Main entry point. Manages knowledge graph and tool routing.
- **`KnowledgeGraph`** — Graph of Unicity concepts, tools, and their relationships.
- **`ToolDiscovery`** — Finds relevant tools based on user intent and context.

### MCP Integration
- **`McpServer`** — Exposes orchestrator capabilities as MCP tools.
- **`ToolRouter`** — Routes tool calls to appropriate backend services.

## Dependencies

- `sphere-sdk` — Token and payment operations
- `openclaw-unicity` — Agent tool definitions
- MCP protocol — Tool serving

## Depended On By

- Claude Code and other MCP clients — as an MCP server

## Key Patterns

- **Knowledge graph**: Concepts and tools are nodes. Relationships define routing.
- **Intent matching**: User queries are matched to tool capabilities via graph traversal.
- **Composable tools**: Complex operations composed from primitive tools.

## Constraints

- MCP protocol compliance required
- Knowledge graph must be kept in sync with actual tool capabilities
- Tool routing must be deterministic for the same input

## Status

Knowledge graph and tool discovery are functional. MCP server integration is in progress.
