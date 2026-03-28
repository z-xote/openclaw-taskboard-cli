import { homedir } from "os";
import { join }    from "path";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import type { View } from "./types.js";

// ─── Paths ────────────────────────────────────────────────────────────────────
//
// Stored in ~/.config/taskboard/config.json — always resolvable via os.homedir(),
// so the binary can be moved anywhere (/usr/local/bin, ~/bin, etc.) and still
// find its config without any path configuration.

export const CONFIG_DIR  = join(homedir(), ".config", "taskboard");
export const CONFIG_PATH = join(CONFIG_DIR, "config.json");

// ─── Schema ───────────────────────────────────────────────────────────────────

export interface Config {
  mongoUri?:      string;   // MongoDB connection string
  dbName?:        string;   // DB name override  (default: xote-openclaw)
  defaultView?:   View;     // Output column preset (default: standard)
  defaultPretty?: boolean;  // ANSI colors on/off  (default: false)
  defaultLimit?:  number;   // Max results per query (default: 20)
  defaultPanel?:  string;   // Auto-scope all queries to this panel
}

export const CONFIG_KEYS = [
  "mongo-uri",
  "db-name",
  "view",
  "pretty",
  "limit",
  "panel",
] as const;

export type ConfigKey = typeof CONFIG_KEYS[number];

// ─── I/O ─────────────────────────────────────────────────────────────────────

export function loadConfig(): Config {
  if (!existsSync(CONFIG_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as Config;
  } catch {
    return {};
  }
}

export function saveConfig(config: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf-8");
}
