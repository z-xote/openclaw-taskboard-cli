import type { ObjectId } from "mongodb";

// ─── Domain Enums ────────────────────────────────────────────────────────────

export type Status     = "todo" | "in_progress" | "done";
export type Priority   = "low" | "medium" | "high" | "critical";
export type Actor      = "user" | "ai";
export type View       = "mini" | "standard" | "full";
export type ActionType = "created" | "updated" | "completed" | "deleted" | "note";

export const STATUSES:   readonly Status[]   = ["todo", "in_progress", "done"];
export const PRIORITIES: readonly Priority[] = ["low", "medium", "high", "critical"];
export const VIEWS:      readonly View[]     = ["mini", "standard", "full"];
export const ACTORS:     readonly Actor[]    = ["user", "ai"];

// ─── DB Documents ────────────────────────────────────────────────────────────

export interface Task {
  _id:         ObjectId;
  panel:       string;
  type:        string;
  section:     string | null;
  title:       string;
  completed:   boolean;
  status:      Status;
  priority:    Priority;
  tags:        string[];
  description: string;
  blocked:     boolean;
  blockerNote: string | null;
  due_date:    Date | null;
  createdAt:   Date;
  updatedAt:   Date;
}

export interface Activity {
  _id?:         ObjectId;
  taskId:       ObjectId;
  panel:        string;
  action:       ActionType;
  field:        string | null;
  oldValue:     unknown;
  newValue:     unknown;
  note:         string | null;
  triggered_by: Actor;
  createdAt:    Date;
}

// ─── CLI Flags ───────────────────────────────────────────────────────────────

export interface ParsedFlags {
  // routing
  command:     string;
  args:        string[];  // positional args after command

  // read filters
  panel?:      string;
  status?:     Status;
  priority?:   Priority;
  tags:        string[];  // --tag (repeatable)
  section?:    string;
  blocked?:    boolean;
  overdue:     boolean;
  includeDone: boolean;

  // output control
  view:        View;
  limit:       number;
  verbose:     boolean;
  pretty:      boolean;   // ANSI color + formatting — off by default (agent-safe)

  // write flags
  title?:      string;
  desc?:       string;
  due?:        string;
  reason?:     string;
  note?:       string;
}
