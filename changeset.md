[INIT]: openclaw-taskboard-cli
# v0.1.0 | Focus: Terminal CLI foundation
-------------------------------- ✦ DETAILS ✦ --------------------------------

## TASKS
-----------------------------------------------------------------------------
1. Scaffold Bun + TypeScript project with package.json, tsconfig.json,
   .gitignore, .env.example

2. Define fully typed domain layer in src/types.ts — Status, Priority, View,
   Actor, ActionType enums; Task, Activity, ParsedFlags interfaces

3. Build MongoDB singleton in src/db.ts with clean connect/close lifecycle
   and env-based config

4. Build typed flag parser in src/flags.ts supporting --key value,
   --key=value, and boolean flags; validates enums at parse time with warnings

5. Build shared utilities in src/utils.ts — resolveTaskId (8-char prefix OR
   full 24-char ObjectId), timeAgo, fmtDue, logActivity

6. Build terminal renderer in src/render.ts — ANSI-colored tables with
   ANSI-safe padding, full-card layout for --view full, diff-style write
   output, activity log table

7. Implement all 9 command modules: get, search, create, status, edit,
   blocker, priority, note, activity

8. Wire CLI entry point in src/index.ts with top-level router, error handler,
   and formatted --help output

9. Write INSTRUCTIONS.md — condensed agent reference covering views,
   commands, flags, enums, ID format, and common usage patterns


## DESCRIPTION
-----------------------------------------------------------------------------
Initial release of openclaw-taskboard-cli — a terminal-native taskboard
client for openclaw agents. Connects directly to MongoDB (no HTTP layer),
eliminating context bloat from JSON API responses.

Agents interact via structured CLI commands with typed enums and three
output views (mini, standard, full) to control token density.

All 9 server-side operations are replicated as CLI commands with diff-style
write confirmation and ANSI-coloured table output.


## TECHNICAL NOTES
-----------------------------------------------------------------------------
- Direct MongoDB connection via MongoClient singleton — no HTTP round-trip.
  Agents run taskboard as a subprocess and read stdout; no server process
  needed.

- View enum (mini | standard | full) controls which columns are returned
  per query, allowing agents to trade token cost for data fidelity at call
  time.

- ID resolution supports both 8-char prefix (shown in tables) and full
  24-char ObjectId. Prefix match scans _id projections in JS — acceptable
  for taskboard scale, avoids index complexity.

- Done tasks are excluded from all queries by default. Pass --include-done
  or --status done to surface them. Overdue flag overrides status filter.

- Bun's built-in .env loader handles MONGO_URI. The compiled binary
  (bun run build) reads .env from the current working directory at runtime.

- triggered_by is hardcoded to "ai" for all CLI mutations — matching the
  intent that this tool is agent-operated. Override not exposed in v0.1.0.
-----------------------------------------------------------------------------