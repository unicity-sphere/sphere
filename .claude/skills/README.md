# Unicity Development Skills

Custom slash commands for managing parallel agent workflows across the Unicity ecosystem.

## Available Skills

| Command | Purpose |
|---------|---------|
| `/agent-review <stream>` | Review completed agent work before merging |
| `/task-status` | Check progress across all tasks and worktrees |
| `/worker <task-file>` | Generate a prompt for a parallel worker agent |
| `/breakdown <phase-doc>` | Break a phase into parallel work streams |
| `/push-pr <description>` | Push branch and create a GitHub PR with structured template |
| `/update-issue <number> [message]` | Push branch and post progress update on a GitHub issue |
| `/steelman [branch]` | Adversarial review — try to break code before it ships |

## Usage

### Starting a New Phase

```
/breakdown docs/ecosystem-map.md
```

Creates task files, dependency graph, and git worktree commands.

### Dispatching Workers

```
/worker tasks/2_STREAM_B_AGGREGATOR.md
```

Generates a focused prompt to paste into a new Claude session in the worktree.

### Checking Progress

```
/task-status
```

Shows completion status across all task files, worktrees, and packages.

### Reviewing Completed Work

```
/agent-review stream-b
```

Systematically reviews work against task file, runs verification, and prepares merge.

## Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  1. /breakdown        Plan parallel streams                  │
│  2. /worker (×N)      Generate worker prompts                │
│  3. [Workers execute in parallel worktrees]                  │
│  4. /agent-review     Review each completed stream           │
│  5. /steelman         Adversarial review before merge        │
│  6. Merge approved work                                      │
│  7. /task-status      Check overall progress                 │
│  8. Repeat until phase complete                              │
└─────────────────────────────────────────────────────────────┘
```

## Review Categories

`/agent-review` checks these areas:

1. **Security** - Crypto, auth, injection, secrets
2. **Correctness** - Logic, edge cases, error handling
3. **Reliability** - Failure modes, timeouts, cleanup
4. **Performance** - Caching, allocations, async
5. **Concurrency** - Races, locks, async safety
6. **API/Ergonomics** - Consistency, builders, docs
7. **Observability** - Logging, events, debug
8. **Testing** - Coverage, edge cases
9. **Configuration** - Defaults, validation
10. **Future/Debt** - Stubs, TODOs

## Files

```
.claude/skills/
├── README.md              # This file
├── agent-review/
│   ├── SKILL.md           # /agent-review command
│   └── reference.md       # Coordinator guidelines
├── task-status/
│   └── SKILL.md           # /task-status command
├── worker/
│   └── SKILL.md           # /worker command
├── breakdown/
│   └── SKILL.md           # /breakdown command
├── push-pr/
│   └── SKILL.md           # /push-pr command
├── steelman/
│   └── SKILL.md           # /steelman command
└── update-issue/
    └── SKILL.md           # /update-issue command
```

## Tips

- Skills auto-complete when you type `/`
- Arguments are passed after the command: `/worker tasks/file.md`
- Review findings get appended to `tasks/TODO_POST_REVIEW.md`
- Worker prompts should be run in separate Claude sessions in worktrees
