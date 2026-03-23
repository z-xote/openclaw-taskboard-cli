import type { ParsedFlags } from "../types.js";
import { getDb } from "../db.js";
import { resolveTaskId, logActivity } from "../utils.js";
import { renderNote, renderError, shortId } from "../render.js";

export async function cmdNote(flags: ParsedFlags): Promise<void> {
  const [taskInput] = flags.args;

  if (!taskInput) {
    process.stdout.write(renderError("usage: taskboard note <id> --note \"...\""));
    return;
  }
  if (!flags.note) {
    process.stdout.write(renderError("--note is required"));
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

  await logActivity(
    id,
    task.panel,
    "note",
    { note: flags.note, triggered_by: "ai" },
    activity
  );

  process.stdout.write(renderNote(shortId(id), flags.note));
}
