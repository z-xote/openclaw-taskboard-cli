#!/usr/bin/env bun
import { parseFlags } from "./flags.js";
import { closeDb } from "./db.js";
import { C, setPretty } from "./render.js";

import { cmdGet }      from "./commands/get.js";
import { cmdSearch }   from "./commands/search.js";
import { cmdCreate }   from "./commands/create.js";
import { cmdStatus }   from "./commands/status.js";
import { cmdEdit }     from "./commands/edit.js";
import { cmdBlocker }  from "./commands/blocker.js";
import { cmdPriority } from "./commands/priority.js";
import { cmdNote }     from "./commands/note.js";
import { cmdActivity } from "./commands/activity.js";
import { cmdDebug }    from "./commands/debug.js";
import { cmdConfig }   from "./commands/config.js";

// ─── Help ─────────────────────────────────────────────────────────────────────

function printHelp(): void {
  console.log(`
${C.bold}taskboard${C.reset}  v0.1.4 — openclaw terminal taskboard

${C.bold}USAGE${C.reset}
  taskboard <command> [args] [flags]

${C.bold}READ COMMANDS${C.reset}
  ${C.cyan}get${C.reset}                          List tasks  (filters below)
  ${C.cyan}search${C.reset}  <query>              Full-text search (top 10 results)
  ${C.cyan}activity${C.reset} [task_id]           Activity log  [--panel]
  ${C.cyan}debug${C.reset}                        Credential sources + connection check
  ${C.cyan}debug --verbose${C.reset}              Full diagnostics (distributions, indexes, sample)

${C.bold}WRITE COMMANDS${C.reset}
  ${C.cyan}create${C.reset}   --title --panel      Create a task
  ${C.cyan}status${C.reset}   <id> <status>        Update status
  ${C.cyan}edit${C.reset}     <id> [flags]         Edit task fields
  ${C.cyan}blocker${C.reset}  <id> --blocked       Flag/unflag a blocker
  ${C.cyan}priority${C.reset} <id> <priority>      Change priority
  ${C.cyan}note${C.reset}     <id> --note "..."    Add activity note

${C.bold}CONFIG COMMAND${C.reset}
  ${C.cyan}config${C.reset}                        Show current preferences
  ${C.cyan}config${C.reset} set <key> <value>      Set a preference
  ${C.cyan}config${C.reset} unset <key>            Clear a preference
  ${C.cyan}config${C.reset} reset                  Clear all preferences

  ${C.bold}Keys:${C.reset} mongo-uri | db-name | view | pretty | limit | panel

${C.bold}FILTER FLAGS${C.reset}  (get / search)
  --panel    <name>            Scope to panel
  --status   <todo|in_progress|done>
  --priority <low|medium|high|critical>
  --tag      <name>            Repeatable: --tag bug --tag auth
  --section  <name>
  --blocked                    Only blocked tasks
  --overdue                    Past due_date, not done
  --include-done               Show done tasks (hidden by default)
  --limit    <n>               Max results  (default from config or 20)
  --verbose                    Print filter, counts, and index info before results

${C.bold}OUTPUT FLAGS${C.reset}
  --view     <mini|standard|full>   Column preset  (default from config or standard)
  --pretty                          Enable ANSI colors  (default from config or off)
  --no-pretty                       Force plain text even if config has pretty=true

${C.bold}CREATE / EDIT FLAGS${C.reset}
  --title    <text>
  --panel    <name>
  --priority <low|medium|high|critical>
  --tag      <name>            Repeatable
  --section  <name>
  --desc     <text>
  --due      <YYYY-MM-DD>

${C.bold}WRITE-ONLY FLAGS${C.reset}
  --blocked  <true|false>      Used with: blocker command
  --reason   <text>            Used with: blocker, priority
  --note     <text>            Used with: note command

${C.bold}ID FORMAT${C.reset}
  Short 8-char IDs shown in table output.
  Write commands accept the 8-char prefix OR the full 24-char ObjectId.

${C.bold}FIRST-RUN SETUP${C.reset}
  taskboard config set mongo-uri "mongodb+srv://..."
  taskboard config set view mini
  taskboard config set pretty true    ${C.dim}# humans only${C.reset}
  taskboard debug                     ${C.dim}# verify connection${C.reset}

${C.bold}EXAMPLES${C.reset}
  taskboard get --panel xote --priority critical
  taskboard get --blocked --view mini
  taskboard search "auth redirect" --panel xote
  taskboard create --title "Fix token refresh" --panel xote --priority high --tag auth
  taskboard status a1b2c3d4 in_progress
  taskboard edit a1b2c3d4 --priority critical
  taskboard blocker a1b2c3d4 --blocked true --reason "waiting on infra team"
  taskboard note a1b2c3d4 --note "reproduced on prod, not staging"
  taskboard activity --panel xote
`);
}

// ─── Router ───────────────────────────────────────────────────────────────────

const argv  = process.argv.slice(2);
const flags = parseFlags(argv);

// Apply pretty preference (config default, overrideable per-call via --pretty / --no-pretty)
setPretty(flags.pretty);

try {
  switch (flags.command) {
    case "get":      await cmdGet(flags);      break;
    case "search":   await cmdSearch(flags);   break;
    case "create":   await cmdCreate(flags);   break;
    case "status":   await cmdStatus(flags);   break;
    case "edit":     await cmdEdit(flags);     break;
    case "blocker":  await cmdBlocker(flags);  break;
    case "priority": await cmdPriority(flags); break;
    case "note":     await cmdNote(flags);     break;
    case "activity": await cmdActivity(flags); break;
    case "debug":    await cmdDebug(flags);    break;
    case "config":   await cmdConfig(flags);   break;
    case "help":
    case "--help":
    case "-h":
    default:
      printHelp();
  }
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  process.stderr.write(`${C.red}✗${C.reset} ${msg}\n`);
  process.exit(1);
} finally {
  // config command doesn't open DB — closeDb is a no-op if nothing connected
  await closeDb();
}
