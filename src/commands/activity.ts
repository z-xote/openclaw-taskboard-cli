import type { ParsedFlags } from "../types.js";
import { ObjectId } from "mongodb";
import { getDb } from "../db.js";
import { renderActivity, renderError } from "../render.js";

export async function cmdActivity(flags: ParsedFlags): Promise<void> {
  const { activity } = await getDb();

  const filter: Record<string, unknown> = {};

  if (flags.panel) filter.panel = flags.panel;

  // --task-id can be a positional arg or a flag (handle both)
  const taskIdInput = flags.args[0];
  if (taskIdInput) {
    try {
      filter.taskId = new ObjectId(taskIdInput);
    } catch {
      process.stdout.write(renderError(`invalid task id [${taskIdInput}]`));
      return;
    }
  }

  const records = await activity
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(flags.limit)
    .toArray();

  process.stdout.write(renderActivity(records));
}
