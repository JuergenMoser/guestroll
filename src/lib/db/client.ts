import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { config } from "@/lib/config";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

// Survives Next's dev hot reloads, which would otherwise open a new handle per edit.
const globalForDb = globalThis as unknown as { guestrollDb?: Db };

function open(): Db {
  fs.mkdirSync(config.dataDir, { recursive: true });

  const sqlite = new Database(config.dbFile);
  // WAL lets the gallery keep reading while a burst of uploads writes.
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

let migratedThisModule = false;

export function getDb(): Db {
  if (!globalForDb.guestrollDb) {
    globalForDb.guestrollDb = open();
    migratedThisModule = true;
  } else if (!migratedThisModule) {
    // Dev hot reload keeps the handle but brings new code: apply migrations
    // added since the server started (a no-op when there are none).
    migrate(globalForDb.guestrollDb, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    migratedThisModule = true;
  }
  return globalForDb.guestrollDb;
}
