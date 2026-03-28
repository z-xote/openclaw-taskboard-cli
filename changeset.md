[FIX]: Flip credential priority — config file now wins over env var
# v0.1.5 | Focus: config.json is the source of truth; $MONGO_URI is a fallback

-------------------------------- ✦ DETAILS ✦ --------------------------------

## TASKS
-----------------------------------------------------------------------------
1. Flip resolution priority in src/db.ts resolveCredentials():
   - Before: process.env.MONGO_URI ?? cfg.mongoUri  (env wins)
   - After:  cfg.mongoUri ?? process.env.MONGO_URI  (config wins)
   Same flip applied to DB_NAME resolution.

2. Update comment block in db.ts to reflect the new priority order:
   1. ~/.config/taskboard/config.json  (highest)
   2. Shell env MONGO_URI / DB_NAME    (fallback)
   3. Hard-coded DB_NAME default       (last resort)

3. Update src/commands/debug.ts credential display to match new priority:
   - config mongo-uri is now shown first (it's the primary source)
   - $MONGO_URI now shows context-aware status:
       · If config URI exists: "set (ignored — config file takes priority)"
       · If no config URI:     "set — used as fallback (no config URI)"
   - active source label now correctly reports "config file" when cfgUri wins
   - activeUri resolution flipped: cfgUri ?? envUri


## DESCRIPTION
-----------------------------------------------------------------------------
The previous priority (env > config) made sense as a 12-factor pattern but
worked against how this tool is actually used: the config file is set once
via `taskboard config set mongo-uri` and is meant to be the stable, always-
on credential source. The env var was causing confusion because any stale
$MONGO_URI in the shell (or a .env loaded by a parent process) would silently
override the config — and the debug output only said "this wins" without
explaining why that might be wrong.

New behaviour: config.json is the authority. $MONGO_URI still works as a
genuine fallback (useful on machines where the config hasn't been set up),
but it can no longer shadow a configured URI.


## TECHNICAL NOTES
-----------------------------------------------------------------------------
- Both db.ts and debug.ts must stay in sync on the resolution order.
  db.ts is what actually resolves; debug.ts must mirror it exactly or the
  "active source" label will lie.

- The debug output now lists config mongo-uri before $MONGO_URI, matching
  the visual priority of the new resolution order.

-----------------------------------------------------------------------------