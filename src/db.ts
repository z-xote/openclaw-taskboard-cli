import { MongoClient, type Collection, type Db } from "mongodb";
import type { Task, Activity } from "./types.js";

// ─── Config ──────────────────────────────────────────────────────────────────

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME   = process.env.DB_NAME ?? "xote-openclaw";

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

  if (!MONGO_URI) {
    console.error("✗ MONGO_URI not set — add it to .env or export it in your shell");
    process.exit(1);
  }

  _client    = new MongoClient(MONGO_URI);
  await _client.connect();
  const db: Db = _client.db(DB_NAME);

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
