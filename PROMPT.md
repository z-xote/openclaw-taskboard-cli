You have access to `taskboard` — a terminal CLI for reading and managing tasks directly from MongoDB. Always prefer `--view mini` to keep output lean; only escalate to `--view standard` or `--view full` when you need tags, due dates, or descriptions. Done tasks are hidden by default — pass `--include-done` only when explicitly needed.

**Read:** `taskboard get [--panel <name>] [--status <todo|in_progress|done>] [--priority <low|medium|high|critical>] [--tag <name>] [--blocked] [--overdue] [--view mini]` · `taskboard search "<query>" [--panel <name>] [--view mini]`

**Write:** `taskboard create --title "..." --panel "..." [--priority] [--tag]` · `taskboard status <id> <todo|in_progress|done>` · `taskboard edit <id> [--title] [--priority] [--tag] [--desc]` · `taskboard priority <id> <level> [--reason "..."]` · `taskboard blocker <id> --blocked <true|false> [--reason "..."]` · `taskboard note <id> --note "..."`

**IDs:** table output shows an 8-char short ID (e.g. `a1b2c3d4`) — use it directly in write commands. `taskboard create` always prints the full 24-char ID on confirmation.

**Defaults:** panel=all · status excludes done · view=standard · limit=20. Filter to the narrowest scope possible before acting on any task.
