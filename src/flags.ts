import type { ParsedFlags, Status, Priority, View } from "./types.js";
import { STATUSES, PRIORITIES, VIEWS } from "./types.js";

// ─── Validation helpers ───────────────────────────────────────────────────────

function isStatus(v: string): v is Status     { return (STATUSES   as readonly string[]).includes(v); }
function isPriority(v: string): v is Priority { return (PRIORITIES as readonly string[]).includes(v); }
function isView(v: string): v is View         { return (VIEWS      as readonly string[]).includes(v); }

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parses process.argv (everything after "bun src/index.ts") into typed flags.
 *
 * Supports:
 *   --key value
 *   --key=value
 *   --boolean-flag   (no value, treated as true)
 */
export function parseFlags(argv: string[]): ParsedFlags {
  const [command = "help", ...rest] = argv;

  const flags: ParsedFlags = {
    command,
    args:        [],
    tags:        [],
    overdue:     false,
    includeDone: false,
    view:        "standard",
    limit:       20,
    verbose:     false,
  };

  for (let i = 0; i < rest.length; i++) {
    const token = rest[i]!;

    // Positional arg (no leading --)
    if (!token.startsWith("--")) {
      flags.args.push(token);
      continue;
    }

    // Split on = if present
    const eqIdx = token.indexOf("=");
    let key: string;
    let val: string | undefined;

    if (eqIdx !== -1) {
      key = token.slice(2, eqIdx);
      val = token.slice(eqIdx + 1);
    } else {
      key = token.slice(2);
      const peek = rest[i + 1];
      if (peek !== undefined && !peek.startsWith("--")) {
        val = peek;
        i++;
      }
    }

    switch (key) {
      // ── read filters ──────────────────────────────────────────────────────
      case "panel":
        flags.panel = val;
        break;

      case "status":
        if (val && isStatus(val)) flags.status = val;
        else if (val) console.error(`⚠ Invalid status "${val}". Valid: ${STATUSES.join(" | ")}`);
        break;

      case "priority":
        if (val && isPriority(val)) flags.priority = val;
        else if (val) console.error(`⚠ Invalid priority "${val}". Valid: ${PRIORITIES.join(" | ")}`);
        break;

      case "tag":
        if (val) flags.tags.push(val);
        break;

      case "section":
        flags.section = val;
        break;

      case "blocked":
        // --blocked (no val = true) | --blocked true | --blocked false
        flags.blocked = val !== "false";
        break;

      case "overdue":
        flags.overdue = true;
        break;

      case "include-done":
        flags.includeDone = true;
        break;

      case "verbose":
      case "v":
        flags.verbose = true;
        break;

      // ── output control ────────────────────────────────────────────────────
      case "view":
        if (val && isView(val)) flags.view = val;
        else if (val) console.error(`⚠ Invalid view "${val}". Valid: ${VIEWS.join(" | ")}`);
        break;

      case "limit": {
        const n = parseInt(val ?? "", 10);
        if (!isNaN(n) && n > 0) flags.limit = n;
        break;
      }

      // ── write flags ───────────────────────────────────────────────────────
      case "title":  flags.title  = val; break;
      case "desc":   flags.desc   = val; break;
      case "due":    flags.due    = val; break;
      case "reason": flags.reason = val; break;
      case "note":   flags.note   = val; break;
    }
  }

  return flags;
}
