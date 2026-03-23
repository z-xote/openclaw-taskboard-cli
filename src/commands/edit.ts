import type { ParsedFlags, Priority } from "../types.js";
import { getDb } from "../db.js";
import { resolveTaskId, logActivity } from "../utils.js";
import { renderDiff, renderError, shortId } from "../render.js";

export async function cmdEdit(flags: ParsedFlags): Promise<void> {
  const [taskInput] = flags.args;

  if (!taskInput) {
    process.stdout.write(
      renderError("usage: taskboard edit <id> [--title] [--priority] [--tag] [--section] [--desc] [--due]")
    );
    return;
  }

  const { taskboard, activity } = await getDb();

  const id = await resolveTaskId(taskInput, taskboard);
  if (!id) {
    process.stdout.write(renderError(`task not found [${taskInput}]`));
    return;
  }

  const task = await taskboard.findOne({ _id: id });
  if (!task) {
    process.stdout.write(renderError(`task not found [${taskInput}]`));
    return;
  }

  // Build update payload from flags
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const diffs: Array<{ field: string; from: unknown; to: unknown }> = [];

  const allowed: Array<[string, unknown]> = [
    ["title",       flags.title],
    ["priority",    flags.priority as Priority | undefined],
    ["section",     flags.section],
    ["description", flags.desc],
    ["due_date",    flags.due ? new Date(flags.due) : undefined],
    ["tags",        flags.tags.length > 0 ? flags.tags : undefined],
  ];

  for (const [key, val] of allowed) {
    if (val === undefined) continue;
    const old = (task as Record<string, unknown>)[key];
    updates[key] = val;
    diffs.push({ field: key, from: old, to: val });
  }

  if (diffs.length === 0) {
    process.stdout.write(renderError("no fields to update — pass at least one edit flag"));
    return;
  }

  await taskboard.updateOne({ _id: id }, { $set: updates });

  for (const d of diffs) {
    await logActivity(
      id,
      task.panel,
      "updated",
      { field: d.field, oldValue: d.from, newValue: d.to, triggered_by: "ai" },
      activity
    );
  }

  process.stdout.write(renderDiff("task edited", shortId(id), diffs));
}
