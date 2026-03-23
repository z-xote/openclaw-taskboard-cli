import type { ParsedFlags } from "../types.js";
import { getDb } from "../db.js";
import { renderTasks, renderError, C } from "../render.js";

export async function cmdSearch(flags: ParsedFlags): Promise<void> {
  const query = flags.args[0];

  if (!query) {
    process.stdout.write(renderError("usage: taskboard search <query> [--panel] [--view]"));
    return;
  }

  const { taskboard } = await getDb();

  const filter: Record<string, unknown> = {
    $text: { $search: query },
  };

  if (flags.panel) filter.panel = flags.panel;

  // By default, hide done tasks in search too
  if (!flags.includeDone) filter.status = { $ne: "done" };

  // ── Verbose: show raw filter and index info ───────────────────────────────
  if (flags.verbose) {
    const total = await taskboard.countDocuments({});

    // Check if text index exists
    const indexes = await taskboard.listIndexes().toArray();
    const textIdx = indexes.find(ix => Object.values(ix.key ?? {}).includes("text"));

    process.stderr.write(
      `\n${C.bold}${C.cyan}── verbose ────────────────────────────────────${C.reset}\n` +
      `${C.gray}collection  ${C.reset}${taskboard.collectionName}\n` +
      `${C.gray}total docs  ${C.reset}${total}\n` +
      `${C.gray}text index  ${C.reset}${textIdx ? C.green + "found: " + JSON.stringify(textIdx.key) + C.reset : C.red + "MISSING — run createIndex({ title: 'text' }) on the server" + C.reset}\n` +
      `${C.gray}query       ${C.reset}"${query}"\n` +
      `${C.gray}filter      ${C.reset}${JSON.stringify(filter, null, 2)}\n` +
      `${C.bold}${C.cyan}───────────────────────────────────────────────${C.reset}\n\n`
    );
  }

  const tasks = await taskboard
    .find(filter, { projection: { score: { $meta: "textScore" } } })
    .sort({ score: { $meta: "textScore" } })
    .limit(Math.min(flags.limit, 10))
    .toArray();

  if (tasks.length === 0) {
    process.stdout.write(renderError(`no results for "${query}"`));
    if (!flags.verbose) {
      process.stdout.write(
        `  ${C.dim}hint: try --include-done or --verbose to inspect indexes and filter${C.reset}\n`
      );
    }
    return;
  }

  process.stdout.write(renderTasks(tasks, flags.view));
}
