import type { Task, Activity, View, Status, Priority } from "./types.js";
import { timeAgo, fmtDue } from "./utils.js";
import type { ObjectId } from "mongodb";

// ─── ANSI Colors ─────────────────────────────────────────────────────────────

export const C = {
  reset:   "\x1b[0m",
  bold:    "\x1b[1m",
  dim:     "\x1b[2m",
  red:     "\x1b[31m",
  green:   "\x1b[32m",
  yellow:  "\x1b[33m",
  blue:    "\x1b[34m",
  magenta: "\x1b[35m",
  cyan:    "\x1b[36m",
  white:   "\x1b[37m",
  gray:    "\x1b[90m",
} as const;

// ─── Visual Length (strips ANSI escapes) ─────────────────────────────────────

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

export function visLen(s: string): number {
  return stripAnsi(s).length;
}

function pad(s: string, targetWidth: number): string {
  const vis = visLen(s);
  return s + " ".repeat(Math.max(0, targetWidth - vis));
}

function trunc(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// ─── Short ID ────────────────────────────────────────────────────────────────

export function shortId(id: ObjectId): string {
  return id.toString().slice(0, 8);
}

// ─── Color tokens ────────────────────────────────────────────────────────────

export function colorStatus(s: Status): string {
  switch (s) {
    case "todo":        return C.gray    + "todo"        + C.reset;
    case "in_progress": return C.yellow  + "in_progress" + C.reset;
    case "done":        return C.green   + "done"        + C.reset;
  }
}

export function colorPriority(p: Priority): string {
  switch (p) {
    case "low":      return C.dim    + "low"      + C.reset;
    case "medium":   return C.blue   + "medium"   + C.reset;
    case "high":     return C.yellow + "high"     + C.reset;
    case "critical": return C.red    + C.bold + "critical" + C.reset;
  }
}

function colorBlocked(b: boolean, note: string | null): string {
  if (!b) return C.dim + "no" + C.reset;
  return C.red + "⚠ yes" + C.reset + (note ? C.gray + ` (${trunc(note, 20)})` + C.reset : "");
}

// ─── ASCII Table ─────────────────────────────────────────────────────────────

function renderTable(headers: string[], rows: string[][]): string {
  if (rows.length === 0) return C.dim + "  (no results)" + C.reset;

  // Calculate visual column widths (max of header vs all cell values)
  const widths = headers.map((h, i) =>
    Math.max(
      h.length,
      ...rows.map(r => visLen(r[i] ?? ""))
    )
  );

  const fmtLine = (cells: string[], isHeader = false): string => {
    const parts = cells.map((cell, i) => {
      const content = isHeader ? C.bold + cell + C.reset : cell;
      return pad(content, widths[i]! + (isHeader ? C.bold.length + C.reset.length : 0));
    });
    return "  " + parts.join("  ");
  };

  const sep = "  " + widths.map(w => "─".repeat(w)).join("  ");

  return [
    fmtLine(headers, true),
    sep,
    ...rows.map(r => fmtLine(r)),
    "",
  ].join("\n");
}

// ─── Task → Row helpers ──────────────────────────────────────────────────────

function taskToMini(t: Task): string[] {
  return [
    C.cyan + shortId(t._id) + C.reset,
    trunc(t.title, 52),
    colorStatus(t.status),
    colorPriority(t.priority),
  ];
}

function taskToStandard(t: Task): string[] {
  return [
    C.cyan + shortId(t._id) + C.reset,
    trunc(t.title, 42),
    colorStatus(t.status),
    colorPriority(t.priority),
    t.panel,
    t.section ?? "—",
    t.tags.length > 0 ? t.tags.join(", ") : C.dim + "none" + C.reset,
    colorBlocked(t.blocked, t.blockerNote),
    fmtDue(t.due_date),
  ];
}

// ─── Full Card (per task, vertical layout) ───────────────────────────────────

function renderFullCard(t: Task): string {
  const id   = C.cyan + shortId(t._id) + C.reset;
  const full = C.gray + " (" + t._id.toString() + ")" + C.reset;
  const bar  = "  " + "━".repeat(60);

  const row = (label: string, value: string) =>
    `  ${C.bold}${label.padEnd(14)}${C.reset}${value}`;

  const lines = [
    bar,
    `  ${C.bold}${id}${full}  ${trunc(t.title, 44)}${C.reset}`,
    bar,
    row("Status:",    colorStatus(t.status)),
    row("Priority:",  colorPriority(t.priority)),
    row("Panel:",     t.panel),
    row("Section:",   t.section ?? "—"),
    row("Tags:",      t.tags.length > 0 ? t.tags.join(", ") : C.dim + "none" + C.reset),
    row("Blocked:",   colorBlocked(t.blocked, t.blockerNote)),
    row("Due:",       fmtDue(t.due_date)),
    row("Created:",   timeAgo(t.createdAt)),
    row("Updated:",   timeAgo(t.updatedAt)),
  ];

  if (t.description) {
    lines.push(row("Description:", ""));
    // Wrap description at 60 chars
    const words = t.description.split(" ");
    let line = "                ";
    for (const w of words) {
      if (line.length + w.length > 74) {
        lines.push(line);
        line = "                " + w + " ";
      } else {
        line += w + " ";
      }
    }
    if (line.trim()) lines.push(line);
  }

  lines.push("");
  return lines.join("\n");
}

// ─── Public render functions ──────────────────────────────────────────────────

export function renderTasks(tasks: Task[], view: View): string {
  if (tasks.length === 0) return C.dim + "  (no results)" + C.reset + "\n";

  if (view === "full") {
    return tasks.map(renderFullCard).join("\n");
  }

  if (view === "mini") {
    return renderTable(
      ["ID", "TITLE", "STATUS", "PRIORITY"],
      tasks.map(taskToMini)
    );
  }

  // standard (default)
  return renderTable(
    ["ID", "TITLE", "STATUS", "PRIORITY", "PANEL", "SECTION", "TAGS", "BLOCKED", "DUE"],
    tasks.map(taskToStandard)
  );
}

// ─── Write diff output ───────────────────────────────────────────────────────

export function renderDiff(
  label: string,
  taskId: string,
  changes: Array<{ field: string; from: unknown; to: unknown }>
): string {
  const header = `${C.green}✓${C.reset} ${C.bold}${label}${C.reset}  ${C.cyan}${taskId}${C.reset}`;
  const rows = changes.map(c => {
    const from = String(c.from ?? "—");
    const to   = String(c.to   ?? "—");
    return `  ${C.gray}${c.field.padEnd(16)}${C.reset}${C.dim}${from}${C.reset}  ${C.dim}→${C.reset}  ${to}`;
  });
  return [header, ...rows, ""].join("\n");
}

export function renderCreated(taskId: string, title: string, panel: string): string {
  return [
    `${C.green}✓${C.reset} ${C.bold}Task created${C.reset}  ${C.cyan}${taskId}${C.reset}`,
    `  ${C.gray}title${C.reset.padEnd(0)}   ${title}`,
    `  ${C.gray}panel   ${C.reset}${panel}`,
    "",
  ].join("\n");
}

export function renderNote(taskId: string, note: string): string {
  return [
    `${C.green}✓${C.reset} ${C.bold}Note added${C.reset}  ${C.cyan}${taskId}${C.reset}`,
    `  ${C.gray}"${note}"${C.reset}`,
    "",
  ].join("\n");
}

// ─── Activity log ────────────────────────────────────────────────────────────

export function renderActivity(records: Activity[]): string {
  if (records.length === 0) return C.dim + "  (no activity)" + C.reset + "\n";

  const rows = records.map(a => [
    C.gray + timeAgo(a.createdAt) + C.reset,
    a.action === "created"   ? C.green  + "created"   + C.reset :
    a.action === "completed" ? C.green  + "completed" + C.reset :
    a.action === "deleted"   ? C.red    + "deleted"   + C.reset :
    a.action === "note"      ? C.cyan   + "note"      + C.reset :
                               C.yellow + "updated"   + C.reset,
    a.field ?? C.dim + "—" + C.reset,
    a.oldValue != null ? trunc(String(a.oldValue), 18) : C.dim + "—" + C.reset,
    a.newValue != null ? trunc(String(a.newValue), 18) : C.dim + "—" + C.reset,
    a.note ? C.dim + `"${trunc(a.note, 24)}"` + C.reset : C.dim + "—" + C.reset,
    C.gray + (a.triggered_by ?? "ai") + C.reset,
  ]);

  return renderTable(
    ["WHEN", "ACTION", "FIELD", "FROM", "TO", "NOTE", "BY"],
    rows
  );
}

// ─── Error / info ────────────────────────────────────────────────────────────

export function renderError(msg: string): string {
  return `${C.red}✗${C.reset} ${msg}\n`;
}

export function renderInfo(msg: string): string {
  return `${C.blue}ℹ${C.reset} ${msg}\n`;
}

export function renderCount(n: number, label = "task"): string {
  return C.gray + `  ${n} ${label}${n !== 1 ? "s" : ""}` + C.reset + "\n";
}
