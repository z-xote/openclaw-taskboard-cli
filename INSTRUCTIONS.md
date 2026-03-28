# taskboard CLI — Agent Reference

Direct MongoDB taskboard access. No HTTP. Zero server dependency.
Output is plain text by default (no ANSI codes). Add `--pretty` only for human terminal sessions.

---

## Setup

```bash
cp .env.example .env          # fill in MONGO_URI
bun install
bun src/index.ts --help       # verify connection

# optional: compile to binary
bun run build                 # outputs ./taskboard
```

---

## Views  `--view <enum>`

Controls which columns are returned. Default: `standard`.

| Enum       | Columns                                                              |
|------------|----------------------------------------------------------------------|
| `mini`     | id · title · status · priority                                       |
| `standard` | id · title · status · priority · panel · section · tags · blocked · due |
| `full`     | All fields + description (rendered as vertical card per task)        |

Use `mini` for quick scans. Use `full` only when you need description or timestamps.

---

## Commands

### Read

```
taskboard get [filters]
taskboard search <query> [--panel] [--view] [--include-done]
taskboard activity [task_id] [--panel] [--limit]
```

### Write

```
taskboard create  --title "..." --panel "..."  [--priority] [--tag] [--section] [--desc] [--due YYYY-MM-DD]
taskboard status  <id> <todo|in_progress|done>
taskboard edit    <id>  [--title] [--priority] [--tag] [--section] [--desc] [--due]
taskboard blocker <id>  --blocked <true|false>  [--reason "..."]
taskboard priority <id> <low|medium|high|critical>  [--reason "..."]
taskboard note    <id>  --note "..."
```

---

## Filter Flags  (get / search)

| Flag              | Type                              | Notes                          |
|-------------------|-----------------------------------|--------------------------------|
| `--panel`         | string                            | Scope to panel                 |
| `--status`        | `todo\|in_progress\|done`         |                                |
| `--priority`      | `low\|medium\|high\|critical`     |                                |
| `--tag`           | string (repeatable)               | `--tag bug --tag auth`         |
| `--section`       | string                            |                                |
| `--blocked`       | boolean flag                      | Only blocked=true tasks        |
| `--overdue`       | boolean flag                      | Past due_date, not done        |
| `--include-done`  | boolean flag                      | Done tasks hidden by default   |
| `--limit`         | number                            | Default 20                     |
| `--view`          | `mini\|standard\|full`            | Output column preset           |
| `--pretty`        | boolean flag                      | Enable ANSI colors (humans only) |

---

## Enums

```
Status:   todo | in_progress | done
Priority: low | medium | high | critical
View:     mini | standard | full
Actor:    user | ai
```

---

## IDs

Table output shows an **8-char short ID** (e.g. `a1b2c3d4`).
Write commands accept either the 8-char prefix **or** the full 24-char ObjectId.
`create` always prints the full ID after confirmation for reference.

---

## Output Format

- **get / search** → aligned text table
- **write commands** → diff-style: `field: old → new`
- **full view** → vertical card per task
- Done tasks are **hidden by default** — pass `--include-done` to show them

---

## Common Agent Patterns

```bash
# What's in progress right now?
taskboard get --status in_progress --view mini

# Any blockers?
taskboard get --blocked

# What's overdue in the xote panel?
taskboard get --panel xote --overdue

# Find a task by keyword
taskboard search "token refresh" --panel xote

# Create a task
taskboard create --title "Fix CORS headers" --panel xote --priority high --tag bug

# Move a task forward
taskboard status a1b2c3d4 in_progress

# Escalate priority with reason
taskboard priority a1b2c3d4 critical --reason "customer-facing outage"

# Flag a blocker
taskboard blocker a1b2c3d4 --blocked true --reason "waiting on OAuth keys from client"

# Log a note without changing state
taskboard note a1b2c3d4 --note "reproduced on prod, not staging"

# Review recent activity
taskboard activity --panel xote --limit 20
```
