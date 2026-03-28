[PERF]: Plain Text Default Output
# v0.1.2 | Focus: Agent-safe output

-------------------------------- ✦ DETAILS ✦ --------------------------------

## TASKS
-----------------------------------------------------------------------------
1. Add pretty: boolean to ParsedFlags interface in src/types.ts

2. Add --pretty / -p flag to src/flags.ts parser

3. Refactor src/render.ts — convert C from static const object to
   getter-based object backed by a module-level _pretty flag;
   export setPretty(enabled: boolean) to toggle it

4. Wire setPretty(flags.pretty) in src/index.ts immediately after
   parseFlags, before any command or render call executes

5. Fix hardcoded \x1b escape codes in the catch block of index.ts
   to use C.red / C.reset so they also respect --pretty

6. Add --pretty to help text, INSTRUCTIONS.md filter flag table,
   and AGENT_PROMPT.md with explicit "never pass --pretty" instruction

7. Bump version to 0.1.2 in package.json and --help output


## DESCRIPTION
-----------------------------------------------------------------------------
AI agents were receiving ANSI escape sequences (e.g. \x1b[0m) in stdout,
causing noise in LLM context windows and degrading structured parsing.

ANSI formatting is now opt-in via --pretty. Plain text is the default.
The change required zero modifications to any command module — the C object's
getter-based design means all existing C.xxx references silently return ""
when _pretty is false, with no logic changes elsewhere.

Humans running the CLI interactively pass --pretty to restore full color
output. Agents never touch it.


## TECHNICAL NOTES
-----------------------------------------------------------------------------
- C object uses ES getter syntax (get reset() { ... }) so every access is
  evaluated at read time against the current _pretty state. This allows
  setPretty() to be called once at startup and affect all subsequent output
  across all modules without passing flags into render functions.

- The table padding logic (widths[i] + C.bold.length + C.reset.length) still
  works correctly: when _pretty=false C.bold returns "" so length is 0,
  meaning no extra padding is added — exactly right since there are no ANSI
  codes to compensate for.

- --verbose output (written to stderr) also inherits the same _pretty flag
  since it uses C.xxx from the same render module.

- AGENT_PROMPT.md explicitly instructs agents to never pass --pretty,
  preventing accidental re-introduction of escape codes in agent sessions.

-----------------------------------------------------------------------------
