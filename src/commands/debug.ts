import { getDb } from "../db.js";
import { C } from "../render.js";

/**
 * `taskboard debug`
 *
 * Dumps everything you need to diagnose connection and data issues:
 *   - DB name + collection names
 *   - Document counts per collection
 *   - Status value distribution (shows real values from your data)
 *   - All indexes on the taskboard collection
 *   - First raw document (unfiltered) so you can see actual field names/values
 */
export async function cmdDebug(): Promise<void> {
  const { taskboard, activity } = await getDb();

  // ── Grab raw DB handle via the collection namespace ──────────────────────
  const dbName = process.env.DB_NAME ?? "xote-openclaw";

  // Counts
  const taskCount     = await taskboard.countDocuments({});
  const activityCount = await activity.countDocuments({});

  // Status distribution — what values actually exist in the data
  const statusGroups = await taskboard.aggregate<{ _id: unknown; count: number }>([
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort:  { count: -1 } },
  ]).toArray();

  // Priority distribution
  const priorityGroups = await taskboard.aggregate<{ _id: unknown; count: number }>([
    { $group: { _id: "$priority", count: { $sum: 1 } } },
    { $sort:  { count: -1 } },
  ]).toArray();

  // Panel distribution
  const panelGroups = await taskboard.aggregate<{ _id: unknown; count: number }>([
    { $group: { _id: "$panel", count: { $sum: 1 } } },
    { $sort:  { count: -1 } },
  ]).toArray();

  // Indexes
  const indexes = await taskboard.listIndexes().toArray();

  // First raw document (no filter)
  const sample = await taskboard.findOne({});

  // ── Output ────────────────────────────────────────────────────────────────

  const h = (s: string) =>
    `\n${C.bold}${C.cyan}── ${s} ${"─".repeat(Math.max(0, 44 - s.length))}${C.reset}\n`;

  const row = (label: string, value: string) =>
    `  ${C.gray}${label.padEnd(18)}${C.reset}${value}\n`;

  let out = h("connection");
  out += row("db",               dbName);
  out += row("taskboard coll",   taskboard.collectionName);
  out += row("activity coll",    activity.collectionName);
  out += row("task docs",        String(taskCount));
  out += row("activity docs",    String(activityCount));

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
    // Pretty-print with type hints
    for (const [key, val] of Object.entries(sample)) {
      const display =
        val instanceof Date    ? `${C.blue}${val.toISOString()}${C.reset}` :
        val === null           ? `${C.dim}null${C.reset}` :
        Array.isArray(val)     ? `${C.magenta}[${(val as unknown[]).join(", ")}]${C.reset}` :
        typeof val === "boolean" ? (val ? C.green : C.red) + String(val) + C.reset :
        typeof val === "object"  ? `${C.gray}${JSON.stringify(val)}${C.reset}` :
                                   String(val);
      out += row(key, display);
    }
  }

  out += `\n${C.bold}${C.cyan}${"─".repeat(48)}${C.reset}\n\n`;

  process.stdout.write(out);
}
