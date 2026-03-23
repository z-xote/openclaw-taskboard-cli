import type { ParsedFlags, Status } from "../types.js";
import { STATUSES } from "../types.js";
import { getDb } from "../db.js";
import { resolveTaskId, logActivity } from "../utils.js";
import { renderDiff, renderError, shortId } from "../render.js";

export async function cmdStatus(flags: ParsedFlags): Promise<void> {
  const [taskInput, rawStatus] = flags.args;

  if (!taskInput) {
    process.stdout.write(renderError("usage: taskboard status <id> <todo|in_progress|done>"));
    return;
  }
  if (!rawStatus || !(STATUSES as readonly string[]).includes(rawStatus)) {
    process.stdout.write(
      renderError(`invalid status "${rawStatus ?? ""}". valid: ${STATUSES.join(" | ")}`)
    );
    return;
  }

  const newStatus = rawStatus as Status;
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
    { $set: { status: newStatus, completed: newStatus === "done", updatedAt: new Date() } }
  );

  await logActivity(
    id,
    task.panel,
    newStatus === "done" ? "completed" : "updated",
    { field: "status", oldValue: task.status, newValue: newStatus, triggered_by: "ai" },
    activity
  );

  process.stdout.write(
    renderDiff("status updated", shortId(id), [
      { field: "status", from: task.status, to: newStatus },
    ])
  );
}
