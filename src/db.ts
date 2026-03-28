import { MongoClient, type Collection, type Db } from "mongodb";
import type { Task, Activity } from "./types.js";
import { loadConfig } from "./config.js";

// ─── Config resolution ────────────────────────────────────────────────────────
//
// Priority order:
//   1. Shell environment variable MONGO_URI / DB_NAME  (highest — allows per-session overrides)
//   2. ~/.config/taskboard/config.json                 (set once via `taskboard config set`)
//   3. Hard-coded fallback for DB_NAME only

function resolveCredentials(): { uri: string | undefined; dbName: string } {
  const cfg    = loadConfig();
  const uri    = process.env.MONGO_URI ?? cfg.mongoUri;
  const dbName = process.env.DB_NAME   ?? cfg.dbName ?? "xote-openclaw";
  return { uri, dbName };
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let _client:    MongoClient | null = null;
let _taskboard: Collection<Task>     | null = null;
let _activity:  Collection<Activity> | null = null;

export interface DbHandle {
  taskboard: Collection<Task>;
  activity:  Collection<Activity>;
}

export async function getDb(): Promise<DbHandle> {
  if (_taskboard && _activity) return { taskboard: _taskboard, activity: _activity };

  const { uri, dbName } = resolveCredentials();

  if (!uri) {
    console.error(
      "✗ MongoDB URI not found.\n" +
      "  Set it once:  taskboard config set mongo-uri \"mongodb+srv://...\"\n" +
      "  Or per-session: export MONGO_URI=\"...\""
    );
    process.exit(1);
  }

  _client    = new MongoClient(uri);
  await _client.connect();
  const db: Db = _client.db(dbName);

  _taskboard = db.collection<Task>("taskboard");
  _activity  = db.collection<Activity>("activity");

  return { taskboard: _taskboard, activity: _activity };
}

export async function closeDb(): Promise<void> {
  if (_client) {
    await _client.close();
    _client    = null;
    _taskboard = null;
    _activity  = null;
  }
}
