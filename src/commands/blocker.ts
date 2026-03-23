import type { ParsedFlags } from "../types.js";
import { getDb } from "../db.js";
import { resolveTaskId, logActivity } from "../utils.js";
import { renderDiff, renderError, shortId } from "../render.js";

export async function cmdBlocker(flags: ParsedFlags): Promise<void> {
  const [taskInput] = flags.args;

  if (!taskInput) {
    process.stdout.write(
      renderError("usage: taskboard blocker <id> --blocked <true|false> [--reason \"...\"]")
    );
    return;
  }
  if (flags.blocked === undefined) {
    process.stdout.write(renderError("--blocked true|false is required"));
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

  const newBlocked    = flags.blocked;
  const newBlockerNote = flags.reason ?? null;

  await taskboard.updateOne(
    { _id: id },
    { $set: { blocked: newBlocked, blockerNote: newBlockerNote, updatedAt: new Date() } }
  );

  await logActivity(
    id,
    task.panel,
    "updated",
    {
      field:        "blocked",
      oldValue:     task.blocked,
      newValue:     newBlocked,
      note:         newBlockerNote ?? undefined,
      triggered_by: "ai",
    },
    activity
  );

  const diffs: Array<{ field: string; from: unknown; to: unknown }> = [
    { field: "blocked", from: task.blocked, to: newBlocked },
  ];
  if (newBlockerNote !== task.blockerNote) {
    diffs.push({ field: "blockerNote", from: task.blockerNote, to: newBlockerNote });
  }

  process.stdout.write(renderDiff("blocker updated", shortId(id), diffs));
}
