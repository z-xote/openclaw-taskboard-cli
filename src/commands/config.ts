import { loadConfig, saveConfig, CONFIG_PATH, CONFIG_KEYS } from "../config.js";
import type { ConfigKey } from "../config.js";
import type { ParsedFlags, View } from "../types.js";
import { VIEWS } from "../types.js";
import { C } from "../render.js";

// ─── Display helpers ──────────────────────────────────────────────────────────

function val(v: unknown, fallback: string): string {
  if (v === undefined || v === null) return C.dim + `(not set — default: ${fallback})` + C.reset;
  return String(v);
}

function redact(uri: string): string {
  // Show scheme + host only, hide credentials and path
  try {
    const u = new URL(uri);
    return `${u.protocol}//${u.host}/***`;
  } catch {
    return "*** (set)";
  }
}

// ─── Command ─────────────────────────────────────────────────────────────────

export async function cmdConfig(flags: ParsedFlags): Promise<void> {
  const [sub, key, ...rest] = flags.args;

  // ── show (default when no subcommand) ──────────────────────────────────────
  if (!sub || sub === "show") {
    const cfg = loadConfig();

    // Resolve the URI that will actually be used, and where it came from
    const envUri    = process.env.MONGO_URI;
    const cfgUri    = cfg.mongoUri;
    const activeUri = envUri ?? cfgUri;
    const uriSource = envUri
      ? "shell env $MONGO_URI"
      : cfgUri
        ? "config file"
        : null;

    const uriDisplay = activeUri
      ? `${redact(activeUri)}  ${C.gray}[source: ${uriSource}]${C.reset}`
      : C.red + "(not set — run: taskboard config set mongo-uri \"...\")" + C.reset;

    const out = [
      `${C.bold}config${C.reset}  ${C.gray}${CONFIG_PATH}${C.reset}\n\n`,
      `  ${C.cyan}mongo-uri${C.reset}     ${uriDisplay}\n`,
      `  ${C.cyan}db-name${C.reset}       ${val(cfg.dbName,        "xote-openclaw")}\n`,
      `  ${C.cyan}view${C.reset}          ${val(cfg.defaultView,   "standard")}\n`,
      `  ${C.cyan}pretty${C.reset}        ${val(cfg.defaultPretty, "false")}\n`,
      `  ${C.cyan}limit${C.reset}         ${val(cfg.defaultLimit,  "20")}\n`,
      `  ${C.cyan}panel${C.reset}         ${val(cfg.defaultPanel,  "none")}\n`,
      `\n${C.gray}  to update: taskboard config set <key> <value>${C.reset}\n`,
    ];
    process.stdout.write(out.join(""));
    return;
  }

  // ── set ────────────────────────────────────────────────────────────────────
  if (sub === "set") {
    if (!key || !(CONFIG_KEYS as readonly string[]).includes(key)) {
      process.stdout.write(
        `${C.red}✗${C.reset} invalid key "${key ?? ""}"\n` +
        `  valid: ${CONFIG_KEYS.join(" | ")}\n`
      );
      return;
    }

    const rawValue = rest.join(" ");
    if (!rawValue) {
      process.stdout.write(`${C.red}✗${C.reset} value is required\n`);
      return;
    }

    const cfg = loadConfig();

    switch (key as ConfigKey) {
      case "mongo-uri":
        cfg.mongoUri = rawValue;
        break;

      case "db-name":
        cfg.dbName = rawValue;
        break;

      case "view":
        if (!(VIEWS as readonly string[]).includes(rawValue)) {
          process.stdout.write(
            `${C.red}✗${C.reset} invalid view "${rawValue}"\n` +
            `  valid: ${VIEWS.join(" | ")}\n`
          );
          return;
        }
        cfg.defaultView = rawValue as View;
        break;

      case "pretty":
        if (rawValue !== "true" && rawValue !== "false") {
          process.stdout.write(`${C.red}✗${C.reset} pretty must be "true" or "false"\n`);
          return;
        }
        cfg.defaultPretty = rawValue === "true";
        break;

      case "limit": {
        const n = parseInt(rawValue, 10);
        if (isNaN(n) || n < 1) {
          process.stdout.write(`${C.red}✗${C.reset} limit must be a positive integer\n`);
          return;
        }
        cfg.defaultLimit = n;
        break;
      }

      case "panel":
        cfg.defaultPanel = rawValue;
        break;
    }

    saveConfig(cfg);
    process.stdout.write(`${C.green}✓${C.reset} ${key} saved\n`);
    return;
  }

  // ── unset ──────────────────────────────────────────────────────────────────
  if (sub === "unset") {
    if (!key || !(CONFIG_KEYS as readonly string[]).includes(key)) {
      process.stdout.write(
        `${C.red}✗${C.reset} invalid key "${key ?? ""}"\n` +
        `  valid: ${CONFIG_KEYS.join(" | ")}\n`
      );
      return;
    }

    const cfg = loadConfig();

    switch (key as ConfigKey) {
      case "mongo-uri": delete cfg.mongoUri;      break;
      case "db-name":   delete cfg.dbName;        break;
      case "view":      delete cfg.defaultView;   break;
      case "pretty":    delete cfg.defaultPretty; break;
      case "limit":     delete cfg.defaultLimit;  break;
      case "panel":     delete cfg.defaultPanel;  break;
    }

    saveConfig(cfg);
    process.stdout.write(`${C.green}✓${C.reset} ${key} cleared\n`);
    return;
  }

  // ── reset ──────────────────────────────────────────────────────────────────
  if (sub === "reset") {
    saveConfig({});
    process.stdout.write(`${C.green}✓${C.reset} config reset\n`);
    return;
  }

  process.stdout.write(
    `${C.red}✗${C.reset} unknown subcommand "${sub}"\n` +
    `  valid: show | set <key> <value> | unset <key> | reset\n`
  );
}
