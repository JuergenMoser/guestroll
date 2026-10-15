import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { config } from "@/lib/config";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema> & { $client: Database.Database };

// Survives Next's dev hot reloads, which would otherwise open a new handle per edit.
const globalForDb = globalThis as unknown as { guestrollDb?: Db; guestrollMigrationsApplied?: string[] };

function open(): Db {
  fs.mkdirSync(config.dataDir, { recursive: true });

  const sqlite = new Database(config.dbFile);
  // WAL lets the gallery keep reading while a burst of uploads writes.
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  const db = drizzle(sqlite, { schema });
  const before = appliedCount(sqlite);
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  // Which migrations this start applied, for the admin's update history.
  const journal = readJournal();
  globalForDb.guestrollMigrationsApplied = journal.slice(before, appliedCount(sqlite));
  return db;
}

function appliedCount(sqlite: Database.Database): number {
  try {
    return (sqlite.prepare("select count(*) as n from __drizzle_migrations").get() as { n: number }).n;
  } catch {
    return 0;
  }
}

function readJournal(): string[] {
  try {
    const journal = JSON.parse(fs.readFileSync(path.join(process.cwd(), "drizzle/meta/_journal.json"), "utf8")) as { entries: { tag: string }[] };
    return journal.entries.map((e) => e.tag);
  } catch {
    return [];
  }
}

/** Migrations the current process applied when it opened the database (empty when it was up to date). */
export const migrationsAppliedAtStart = (): string[] => globalForDb.guestrollMigrationsApplied ?? [];

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

/**
 * Closes the database so a restore can replace its file. The next `getDb()`
 * opens the new one and applies any migration it lacks.
 */
export function closeDb(): void {
  globalForDb.guestrollDb?.$client.close();
  globalForDb.guestrollDb = undefined;
}

/** A consistent copy of the live database, safe while it's being written to (SQLite's online backup). */
export async function snapshotDb(target: string): Promise<void> {
  await getDb().$client.backup(target);
}
