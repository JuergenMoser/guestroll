import "server-only";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import archiver from "archiver";
import yauzl from "yauzl";
import { forgetSessionSecret } from "@/lib/auth/secret";
import { config } from "@/lib/config";
import { closeDb, getDb, snapshotDb } from "@/lib/db/client";
import { newId } from "@/lib/security/ids";
import { storage } from "@/lib/storage";
import pkg from "../../package.json";

/**
 * A backup is one ZIP: `manifest.json`, `guestroll.db` (an online snapshot,
 * consistent while uploads keep coming), `uploads/<key>` for every stored file
 * whatever the storage driver, and `session-secret` when the instance generated
 * its own (so sealed settings and the restored accounts' cookies keep working).
 * Restoring into another driver is how photos move from disk to S3.
 */

export interface Manifest {
  app: "guestroll";
  version: string;
  createdAt: string;
  storage: string;
  files: number;
  bytes: number;
}

export class BackupError extends Error {}

const tmpPath = (name: string) => path.join(/*turbopackIgnore: true*/ config.dataDir, `.${name}-${newId()}.tmp`);

export async function backupResponse(): Promise<Response> {
  const dbCopy = tmpPath("backup-db");
  await snapshotDb(dbCopy);
  const files: { key: string; size: number }[] = [];
  for await (const item of storage().list()) if (!item.key.startsWith(".")) files.push(item);
  const manifest: Manifest = {
    app: "guestroll",
    version: pkg.version,
    createdAt: new Date().toISOString(),
    storage: storage().name,
    files: files.length,
    bytes: files.reduce((n, f) => n + f.size, 0),
  };

  const zip = archiver("zip", { zlib: { level: 1 } });
  zip.on("warning", (error: Error) => console.warn("[backup]", error));
  zip.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });
  zip.file(dbCopy, { name: "guestroll.db" });
  if (!config.sessionSecret && fs.existsSync(/*turbopackIgnore: true*/ config.secretFile)) zip.file(config.secretFile, { name: "session-secret" });

  void (async () => {
    for (const file of files) {
      const opened = await storage().open(file.key).catch(() => null);
      if (!opened) continue;
      // Photos and voice notes are already compressed.
      zip.append(opened.stream, { name: `uploads/${file.key}`, store: true });
      await new Promise<void>((resolve, reject) => {
        zip.once("entry", () => resolve());
        opened.stream.once("error", reject);
      });
    }
    await zip.finalize();
  })()
    .catch((error) => {
      console.error("[backup]", error);
      zip.abort();
    })
    // The ZIP reads the snapshot lazily: give it time before removing it.
    .finally(() => setTimeout(() => fsp.rm(dbCopy, { force: true }), 60_000).unref());

  const stamp = manifest.createdAt.slice(0, 16).replace(/[:T]/g, "-");
  return new Response(Readable.toWeb(zip) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="guestroll-backup-${stamp}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}

const openZip = (file: string) =>
  new Promise<yauzl.ZipFile>((resolve, reject) => yauzl.open(file, { lazyEntries: true, autoClose: false }, (err, zip) => (err ? reject(err) : resolve(zip!))));

const readEntry = (zip: yauzl.ZipFile, entry: yauzl.Entry) =>
  new Promise<Readable>((resolve, reject) => zip.openReadStream(entry, (err, stream) => (err ? reject(err) : resolve(stream!))));

async function* entries(zip: yauzl.ZipFile): AsyncIterable<yauzl.Entry> {
  while (true) {
    const next = await new Promise<yauzl.Entry | null>((resolve, reject) => {
      zip.once("entry", resolve);
      zip.once("end", () => resolve(null));
      zip.once("error", reject);
      zip.readEntry();
    });
    if (!next) return;
    yield next;
  }
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

// Keys come from the archive: only accept the shapes this app writes.
const SAFE_KEY = /^[0-9a-f-]{36}\/(?:messages\/)?[0-9a-z.-]+$/;

/** Saves the uploaded body to a temporary file first: a backup can be several GB. */
export async function saveUpload(body: ReadableStream<Uint8Array>): Promise<string> {
  const file = tmpPath("restore");
  await pipeline(Readable.fromWeb(body as import("node:stream/web").ReadableStream), fs.createWriteStream(/*turbopackIgnore: true*/ file, { mode: 0o600 }));
  return file;
}

/**
 * Replaces the database and every stored file with the archive's. Checks the
 * whole archive before touching anything: a bad file leaves the instance as it was.
 */
export async function restoreBackup(file: string): Promise<Manifest> {
  try {
    return await restore(file);
  } catch (error) {
    if (error instanceof BackupError) throw error;
    // yauzl refuses unsafe archives itself (`../` paths, bad headers): say so instead of a 500.
    throw new BackupError(`Unreadable archive (${(error as Error).message.slice(0, 120)})`);
  }
}

async function restore(file: string): Promise<Manifest> {
  const zip = await openZip(file);
  try {
    let manifest: Manifest | null = null;
    let hasDb = false;
    const keys: yauzl.Entry[] = [];
    for await (const entry of entries(zip)) {
      if (entry.fileName === "manifest.json") manifest = JSON.parse((await streamToBuffer(await readEntry(zip, entry))).toString("utf8"));
      else if (entry.fileName === "guestroll.db") hasDb = true;
      else if (entry.fileName.startsWith("uploads/") && !entry.fileName.endsWith("/")) {
        if (!SAFE_KEY.test(entry.fileName.slice("uploads/".length))) throw new BackupError(`Unexpected file in the archive: ${entry.fileName}`);
        keys.push(entry);
      }
    }
    if (manifest?.app !== "guestroll" || !hasDb) throw new BackupError("Not a Guestroll backup");
    zip.close();

    // Second pass, now that the archive is known to be ours.
    const second = await openZip(file);
    const dbTmp = tmpPath("restore-db");
    try {
      for await (const entry of entries(second)) {
        if (entry.fileName === "guestroll.db") {
          await pipeline(await readEntry(second, entry), fs.createWriteStream(/*turbopackIgnore: true*/ dbTmp, { mode: 0o640 }));
          const header = Buffer.alloc(16);
          const fd = await fsp.open(dbTmp, "r");
          await fd.read(header, 0, 16, 0);
          await fd.close();
          if (header.toString("latin1") !== "SQLite format 3\u0000") throw new BackupError("The database in the archive is damaged");
        }
      }

      // From here on the instance changes. Files first: if this fails halfway,
      // the old database still points at files that are mostly there.
      for await (const item of storage().list()) if (!item.key.startsWith(".")) await storage().delete(item.key);
      const third = await openZip(file);
      try {
        for await (const entry of entries(third)) {
          if (entry.fileName.startsWith("uploads/") && !entry.fileName.endsWith("/")) {
            const key = entry.fileName.slice("uploads/".length);
            if (!SAFE_KEY.test(key)) continue;
            await storage().put(key, await streamToBuffer(await readEntry(third, entry)), "application/octet-stream");
          } else if (entry.fileName === "session-secret" && !config.sessionSecret) {
            await fsp.writeFile(config.secretFile, (await streamToBuffer(await readEntry(third, entry))).toString("utf8").trim(), { mode: 0o600 });
            forgetSessionSecret();
          }
        }
      } finally {
        third.close();
      }

      closeDb();
      await fsp.rm(`${config.dbFile}-wal`, { force: true });
      await fsp.rm(`${config.dbFile}-shm`, { force: true });
      await fsp.rename(dbTmp, config.dbFile);
      getDb();
      return manifest;
    } finally {
      second.close();
      await fsp.rm(dbTmp, { force: true });
    }
  } finally {
    zip.close();
    await fsp.rm(file, { force: true });
  }
}

/** Keeps a disk from filling with abandoned uploads if a restore crashed. */
export async function cleanTempFiles(maxAgeMs = 86_400_000): Promise<void> {
  const now = Date.now();
  for (const name of await fsp.readdir(config.dataDir).catch(() => [] as string[])) {
    if (!name.endsWith(".tmp") || !name.startsWith(".")) continue;
    const full = path.join(config.dataDir, name);
    const stat = await fsp.stat(full).catch(() => null);
    if (stat && now - stat.mtimeMs > maxAgeMs) await fsp.rm(full, { force: true });
  }
}

