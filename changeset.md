[FEATURE]: Persistent Config + Self-Sufficient Binary
# v0.1.3 | Focus: Binary portability & stored preferences

-------------------------------- ✦ DETAILS ✦ --------------------------------

## TASKS
-----------------------------------------------------------------------------
1. Create src/config.ts — Config interface, CONFIG_PATH (~/.config/taskboard/
   config.json), loadConfig(), saveConfig(); resolves via os.homedir() so the
   binary can be placed anywhere without path errors

2. Create src/commands/config.ts — config subcommand with show, set <key>
   <value>, unset <key>, reset; validates all values against typed enums
   before writing; mongo-uri redacted in show output

3. Update src/db.ts — MONGO_URI and DB_NAME now resolved in priority order:
   (1) shell env var, (2) config file, (3) hard-coded fallback for DB_NAME;
   improved error message guides first-time setup

4. Update src/flags.ts — loadConfig() called at parse time so config
   preferences (view, pretty, limit, panel) become the new defaults that
   CLI flags override; add --no-pretty for explicit plain-text override

5. Update src/index.ts — wire config command into router and help text;
   add FIRST-RUN SETUP section to --help; bump version to 0.1.3


## DESCRIPTION
-----------------------------------------------------------------------------
Compiled binary was losing .env access when moved to /usr/local/bin or any
directory other than the project root. Root cause: dotenv reads from CWD,
not the binary's location — and CWD changes with every invocation.

Solution: persistent config at ~/.config/taskboard/config.json, always
reachable via os.homedir() regardless of binary location or CWD. One-time
setup with `taskboard config set mongo-uri "..."` and the binary is
self-sufficient from any directory forever.

Config also enables stored preferences for view, pretty, limit, and panel —
set once, inherited by every command as the new default. CLI flags still
override config on any individual call.


## TECHNICAL NOTES
-----------------------------------------------------------------------------
- os.homedir() is the correct anchor for user-scoped config. It resolves
  from the OS user table, not from PATH or CWD, so it's immune to binary
  location changes.

- Config loading happens inside parseFlags(), not at module load time. This
  ensures the config is read fresh on every invocation without a separate
  init step, and means db.ts and flags.ts both get the same config values
  without coordinating.

- --no-pretty is a new explicit override flag. Without it, a user who sets
  pretty=true in config has no way to get plain output for a single command
  (useful for piping or scripting).

- mongo-uri is shown as redacted (scheme + host only) in `taskboard config`
  output to prevent accidental credential exposure in terminal history.

- dotenv is kept for dev-mode compatibility (bun src/index.ts from project
  root). For the compiled binary, dotenv is a no-op when no .env exists in
  CWD — config file takes over as the credential source.

-----------------------------------------------------------------------------
