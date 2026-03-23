import type { ParsedFlags } from "../types.js";
import { getDb } from "../db.js";
import { renderTasks, renderCount, renderError, C } from "../render.js";

export async function cmdGet(flags: ParsedFlags): Promise<void> {
  const { taskboard } = await getDb();

  const filter: Record<string, unknown> = {};

  if (flags.panel)    filter.panel    = flags.panel;
  if (flags.priority) filter.priority = flags.priority;
  if (flags.section)  filter.section  = flags.section;
  if (flags.tags.length > 0) filter.tags = { $in: flags.tags };

  // Status filtering — explicit status overrides done-hidden default
  if (flags.status) {
    filter.status = flags.status;
  } else if (!flags.includeDone) {
    filter.status = { $ne: "done" };
  }

  // Blocked shortcut
  if (flags.blocked === true) filter.blocked = true;

  // Overdue shortcut — overrides status filter
  if (flags.overdue) {
    filter.due_date = { $lt: new Date() };
    filter.status   = { $ne: "done" };
  }

  // ── Verbose: show filter + collection stats before querying ──────────────
  if (flags.verbose) {
    const total    = await taskboard.countDocuments({});
    const filtered = await taskboard.countDocuments(filter as Parameters<typeof taskboard.countDocuments>[0]);
    const dbName   = (taskboard as unknown as { s?: { namespace?: { db?: string } } })
                       .s?.namespace?.db ?? process.env.DB_NAME ?? "xote-openclaw";

    process.stderr.write(
      `\n${C.bold}${C.cyan}── verbose ────────────────────────────────────${C.reset}\n` +
      `${C.gray}db         ${C.reset}${dbName}\n` +
      `${C.gray}collection ${C.reset}${taskboard.collectionName}\n` +
      `${C.gray}total docs ${C.reset}${total}\n` +
      `${C.gray}filter     ${C.reset}${JSON.stringify(filter, null, 2)}\n` +
      `${C.gray}matches    ${C.reset}${filtered}\n` +
      `${C.bold}${C.cyan}───────────────────────────────────────────────${C.reset}\n\n`
    );
  }

  const tasks = await taskboard
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(flags.limit)
    .toArray();

  if (tasks.length === 0) {
    process.stdout.write(renderError("no tasks match that filter"));
    if (!flags.verbose) {
      process.stdout.write(
        `  ${C.dim}hint: try --include-done or --verbose to inspect the filter${C.reset}\n`
      );
    }
    return;
  }

  process.stdout.write(renderTasks(tasks, flags.view));
  process.stdout.write(renderCount(tasks.length));
}
