import type { ParsedFlags, Priority } from "../types.js";
import { PRIORITIES } from "../types.js";
import { getDb } from "../db.js";
import { resolveTaskId, logActivity } from "../utils.js";
import { renderDiff, renderError, shortId } from "../render.js";

export async function cmdPriority(flags: ParsedFlags): Promise<void> {
  const [taskInput, rawPriority] = flags.args;

  if (!taskInput) {
    process.stdout.write(
      renderError("usage: taskboard priority <id> <low|medium|high|critical> [--reason \"...\"]")
    );
    return;
  }
  if (!rawPriority || !(PRIORITIES as readonly string[]).includes(rawPriority)) {
    process.stdout.write(
      renderError(`invalid priority "${rawPriority ?? ""}". valid: ${PRIORITIES.join(" | ")}`)
    );
    return;
  }

  const newPriority = rawPriority as Priority;
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

  await taskboard.updateOne(
    { _id: id },
    { $set: { priority: newPriority, updatedAt: new Date() } }
  );

  await logActivity(
    id,
    task.panel,
    "updated",
    {
      field:        "priority",
      oldValue:     task.priority,
      newValue:     newPriority,
      note:         flags.reason,
      triggered_by: "ai",
    },
    activity
  );

  process.stdout.write(
    renderDiff("priority updated", shortId(id), [
      { field: "priority", from: task.priority, to: newPriority },
      ...(flags.reason ? [{ field: "reason", from: null, to: flags.reason }] : []),
    ])
  );
}
