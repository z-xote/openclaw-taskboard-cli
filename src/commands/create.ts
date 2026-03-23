import type { ParsedFlags, Task, Priority, Status } from "../types.js";
import { getDb } from "../db.js";
import { logActivity } from "../utils.js";
import { renderCreated, renderError, shortId } from "../render.js";

export async function cmdCreate(flags: ParsedFlags): Promise<void> {
  if (!flags.title) {
    process.stdout.write(renderError("--title is required"));
    return;
  }
  if (!flags.panel) {
    process.stdout.write(renderError("--panel is required"));
    return;
  }

  const { taskboard, activity } = await getDb();
  const now = new Date();

  const doc: Omit<Task, "_id"> = {
    panel:       flags.panel,
    type:        "kanban",
    section:     flags.section    ?? null,
    title:       flags.title,
    completed:   false,
    status:      "todo" as Status,
    priority:    (flags.priority  ?? "medium") as Priority,
    tags:        flags.tags,
    description: flags.desc       ?? "",
    blocked:     false,
    blockerNote: null,
    due_date:    flags.due ? new Date(flags.due) : null,
    createdAt:   now,
    updatedAt:   now,
  };

  const result = await taskboard.insertOne(doc as Task);

  await logActivity(
    result.insertedId,
    doc.panel,
    "created",
    { triggered_by: "ai" },
    activity
  );

  process.stdout.write(
    renderCreated(shortId(result.insertedId), doc.title, doc.panel)
  );
  // Print full ID on second line so agents can reference it
  process.stdout.write(
    `  full id  ${result.insertedId.toString()}\n\n`
  );
}
