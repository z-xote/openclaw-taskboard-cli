import type { ParsedFlags, Status, Priority, View } from "./types.js";
import { STATUSES, PRIORITIES, VIEWS } from "./types.js";
import { loadConfig } from "./config.js";

// ─── Validation helpers ───────────────────────────────────────────────────────

function isStatus(v: string): v is Status     { return (STATUSES   as readonly string[]).includes(v); }
function isPriority(v: string): v is Priority { return (PRIORITIES as readonly string[]).includes(v); }
function isView(v: string): v is View         { return (VIEWS      as readonly string[]).includes(v); }

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parses process.argv (everything after "bun src/index.ts") into typed flags.
 *
 * Default resolution order (lowest → highest priority):
 *   1. Built-in hardcoded defaults
 *   2. ~/.config/taskboard/config.json  (set via `taskboard config set`)
 *   3. CLI flags passed at runtime      (always win)
 *
 * Supports:
 *   --key value
 *   --key=value
 *   --boolean-flag     (no value → true)
 *   --no-boolean-flag  (explicit false override, e.g. --no-pretty)
 */
export function parseFlags(argv: string[]): ParsedFlags {
  // Seed defaults from config file — CLI flags override these below
  const cfg = loadConfig();

  const [command = "help", ...rest] = argv;

  const flags: ParsedFlags = {
    command,
    args:        [],
    tags:        [],
    overdue:     false,
    includeDone: false,
    verbose:     false,
    // Config-aware defaults — CLI flags can still override
    view:        cfg.defaultView    ?? "standard",
    limit:       cfg.defaultLimit   ?? 20,
    pretty:      cfg.defaultPretty  ?? false,
    panel:       cfg.defaultPanel,
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

      // ── pretty: explicit on/off overrides config default ──────────────────
      case "pretty":
      case "p":
        flags.pretty = true;
        break;

      case "no-pretty":
        flags.pretty = false;
        break;

      // ── output control ────────────────────────────────────────────────────
      // Accepts both --view full (space) and --view-full (hyphenated shorthand)
      case "view-mini":     flags.view = "mini";     break;
      case "view-standard": flags.view = "standard"; break;
      case "view-full":     flags.view = "full";     break;
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
