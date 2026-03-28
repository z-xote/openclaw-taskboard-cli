[CLEANUP]: Remove dotenv + tighten debug command
# v0.1.4 | Focus: Zero external dependencies, clean debug output

-------------------------------- ✦ DETAILS ✦ --------------------------------

## TASKS
-----------------------------------------------------------------------------
1. Remove dotenv dependency entirely — src/index.ts no longer imports or
   calls dotenv.config(); package.json drops dotenv from dependencies.
   Credentials come exclusively from the config file (taskboard config set)
   or the MONGO_URI shell env var. No .env file involvement.

2. Gate verbose DB diagnostics behind --verbose in `taskboard debug`:
   - Default (no flag): shows credential sources + connection check (counts)
     with a hint line to pass --verbose for more.
   - --verbose: full output — status/priority/panel distributions, index
     list, and sample document. Same content as before, now opt-in.

3. Clean up src/db.ts — remove temporary [db] console.error lines that
   were added for inline debugging. resolveCredentials() is clean again.


## DESCRIPTION
-----------------------------------------------------------------------------
dotenv was included originally as a dev convenience so `bun src/index.ts`
could read from a local .env file without extra setup. With the config
system in place since v0.1.3, this is no longer needed — and it was
actively causing confusion: dotenv's startup log ("injecting env (0)")
appeared in agent output, and its CWD-based resolution meant different
behaviour depending on where the binary was invoked from.

Removing it entirely makes the binary's credential resolution predictable:
MONGO_URI env var > config file > error. No file system scanning.

The debug --verbose split keeps `taskboard debug` fast and readable for
quick connection checks, while `taskboard debug --verbose` remains the
full diagnostic tool when you need to inspect data shape or index state.


## TECHNICAL NOTES
-----------------------------------------------------------------------------
- bun build --compile bundles all dependencies at compile time, so removing
  dotenv from package.json requires a fresh `bun install` before rebuilding.

- The [db] console.error lines added in the previous session for diagnosing
  the Linux auth issue are now removed from db.ts. That diagnostic surface
  is fully covered by `taskboard debug` (credential source section always
  shown) and `taskboard debug --verbose` (full details).

- cmdDebug() signature changed from () to (flags: ParsedFlags) to receive
  the verbose flag. Router in index.ts updated accordingly.

-----------------------------------------------------------------------------
