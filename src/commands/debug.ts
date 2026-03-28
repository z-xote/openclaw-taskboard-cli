import { getDb } from "../db.js";
import { loadConfig, CONFIG_PATH } from "../config.js";
import { C } from "../render.js";
import type { ParsedFlags } from "../types.js";

function redactUri(uri: string): string {
  try {
    const u = new URL(uri);
    const user = u.username ? u.username : "???";
    return `${u.protocol}//${user}:***@${u.host}${u.pathname}`;
  } catch {
    return "(unparseable URI)";
  }
}

/**
 * `taskboard debug`
 *
 * Default: credential sources + connection check (counts only).
 * --verbose: full diagnostics — distributions, indexes, sample document.
 */
export async function cmdDebug(flags: ParsedFlags): Promise<void> {
  const cfg    = loadConfig();
  const envUri = process.env.MONGO_URI;
  const cfgUri = cfg.mongoUri;

  const h = (s: string) =>
    `\n${C.bold}${C.cyan}── ${s} ${"─".repeat(Math.max(0, 44 - s.length))}${C.reset}\n`;
  const row = (label: string, value: string) =>
    `  ${C.gray}${label.padEnd(20)}${C.reset}${value}\n`;

  // ── Credentials (always shown) ────────────────────────────────────────────
  let out = h("credential sources");
  out += row("config file", CONFIG_PATH);

  if (envUri) {
    out += row("$MONGO_URI",      C.yellow + "SET — this wins over config file" + C.reset);
    out += row("  resolved to",   redactUri(envUri));
  } else {
    out += row("$MONGO_URI",      C.dim + "not set" + C.reset);
  }

  out += row(
    "config mongo-uri",
    cfgUri ? redactUri(cfgUri) : C.dim + "not set" + C.reset
  );

  const activeUri = envUri ?? cfgUri;
  if (!activeUri) {
    out += `\n  ${C.red}✗ no URI found — run: taskboard config set mongo-uri "..."${C.reset}\n`;
    process.stdout.write(out);
    return;
  }

  out += row("active URI",    C.green + redactUri(activeUri) + C.reset);
  out += row("active source", envUri ? "shell env $MONGO_URI" : "config file");
  process.stdout.write(out);

  // ── DB connection ─────────────────────────────────────────────────────────
  const { taskboard, activity } = await getDb();
  const dbName = process.env.DB_NAME ?? cfg.dbName ?? "xote-openclaw";

  const taskCount     = await taskboard.countDocuments({});
  const activityCount = await activity.countDocuments({});

  out = h("connection");
  out += row("db",             dbName);
  out += row("taskboard coll", taskboard.collectionName);
  out += row("activity coll",  activity.collectionName);
  out += row("task docs",      String(taskCount));
  out += row("activity docs",  String(activityCount));

  if (!flags.verbose) {
    out += `\n  ${C.dim}pass --verbose for full diagnostics (distributions, indexes, sample)${C.reset}\n`;
    out += `\n${C.bold}${C.cyan}${"─".repeat(48)}${C.reset}\n\n`;
    process.stdout.write(out);
    return;
  }

  // ── Verbose-only: distributions + indexes + sample ────────────────────────

  const statusGroups = await taskboard.aggregate<{ _id: unknown; count: number }>([
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort:  { count: -1 } },
  ]).toArray();

  const priorityGroups = await taskboard.aggregate<{ _id: unknown; count: number }>([
    { $group: { _id: "$priority", count: { $sum: 1 } } },
    { $sort:  { count: -1 } },
  ]).toArray();

  const panelGroups = await taskboard.aggregate<{ _id: unknown; count: number }>([
    { $group: { _id: "$panel", count: { $sum: 1 } } },
    { $sort:  { count: -1 } },
  ]).toArray();

  const indexes = await taskboard.listIndexes().toArray();
  const sample  = await taskboard.findOne({});

  out += h("status distribution");
  if (statusGroups.length === 0) {
    out += `  ${C.red}no documents found — collection may be empty or wrong name${C.reset}\n`;
  } else {
    for (const g of statusGroups) {
      out += row(String(g._id ?? "null"), `${g.count} tasks`);
    }
  }

  out += h("priority distribution");
  if (priorityGroups.length === 0) {
    out += `  ${C.dim}(empty)${C.reset}\n`;
  } else {
    for (const g of priorityGroups) {
      out += row(String(g._id ?? "null"), `${g.count} tasks`);
    }
  }

  out += h("panel distribution");
  if (panelGroups.length === 0) {
    out += `  ${C.dim}(empty)${C.reset}\n`;
  } else {
    for (const g of panelGroups) {
      out += row(String(g._id ?? "null"), `${g.count} tasks`);
    }
  }

  out += h("indexes on taskboard");
  for (const ix of indexes) {
    const keys   = JSON.stringify(ix.key);
    const isText = Object.values(ix.key ?? {}).includes("text");
    const label  = isText ? C.green + keys + " (text)" + C.reset : keys;
    out += `  ${label}\n`;
  }

  out += h("sample document (first unfiltered)");
  if (!sample) {
    out += `  ${C.red}no documents in collection${C.reset}\n`;
  } else {
    for (const [key, val] of Object.entries(sample)) {
      const display =
        val instanceof Date      ? `${C.blue}${val.toISOString()}${C.reset}` :
        val === null             ? `${C.dim}null${C.reset}` :
        Array.isArray(val)       ? `${C.magenta}[${(val as unknown[]).join(", ")}]${C.reset}` :
        typeof val === "boolean" ? (val ? C.green : C.red) + String(val) + C.reset :
        typeof val === "object"  ? `${C.gray}${JSON.stringify(val)}${C.reset}` :
                                   String(val);
      out += row(key, display);
    }
  }

  out += `\n${C.bold}${C.cyan}${"─".repeat(48)}${C.reset}\n\n`;
  process.stdout.write(out);
}
