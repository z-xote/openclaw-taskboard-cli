import { ObjectId, type Collection } from "mongodb";
import type { Task, Activity, ActionType, Actor } from "./types.js";

// ─── ID Resolution ────────────────────────────────────────────────────────────

/**
 * Accepts a full 24-char ObjectId string OR an 8-char prefix shown in table output.
 * Returns the matching ObjectId, or null if not found.
 */
export async function resolveTaskId(
  input: string,
  col: Collection<Task>
): Promise<ObjectId | null> {
  // Full ObjectId
  if (input.length === 24) {
    try {
      return new ObjectId(input);
    } catch {
      return null;
    }
  }

  // Prefix match: fetch all IDs and find match in JS
  // Acceptable for taskboard scale (<10k tasks)
  const docs = await col
    .find({}, { projection: { _id: 1 } })
    .toArray();

  const match = docs.find(d => d._id.toString().startsWith(input));
  return match?._id ?? null;
}

// ─── Date / Time Formatting ──────────────────────────────────────────────────

export function timeAgo(d: Date): string {
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function fmtDue(d: Date | null): string {
  if (!d) return "—";
  const now  = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.round(diff / 86_400_000);

  if (days === 0)  return "today";
  if (days === 1)  return "tomorrow";
  if (days === -1) return "yesterday";
  if (days < -1)   return `${Math.abs(days)}d overdue`;
  return `in ${days}d`;
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

export async function logActivity(
  taskId: ObjectId,
  panel: string,
  action: ActionType,
  extras: {
    field?:        string;
    oldValue?:     unknown;
    newValue?:     unknown;
    note?:         string;
    triggered_by?: Actor;
  },
  col: Collection<Activity>
): Promise<void> {
  await col.insertOne({
    taskId,
    panel,
    action,
    field:        extras.field        ?? null,
    oldValue:     extras.oldValue     ?? null,
    newValue:     extras.newValue     ?? null,
    note:         extras.note         ?? null,
    triggered_by: extras.triggered_by ?? "ai",
    createdAt:    new Date(),
  });
}
