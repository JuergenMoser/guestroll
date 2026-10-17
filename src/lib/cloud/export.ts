import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { photoFileName } from "@/lib/archive";
import { config } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import { cloudExports, type CloudExportRow } from "@/lib/db/schema";
import { getEventById } from "@/lib/events";
import { listForArchive } from "@/lib/photos";
import { newId } from "@/lib/security/ids";
import { fileMime, openPhotoStream } from "@/lib/storage/files";
import { getCloudSettings } from "./settings";
import { ensureFolders, putFile } from "./webdav";

export type CloudExportDto = Pick<CloudExportRow, "id" | "scope" | "status" | "done" | "total" | "error" | "createdAt" | "finishedAt">;

export const toCloudExportDto = ({ id, scope, status, done, total, error, createdAt, finishedAt }: CloudExportRow): CloudExportDto => ({ id, scope, status, done, total, error, createdAt, finishedAt });

/** Queues the event's album; a second click while one is queued or running returns that one. */
export function startExport(eventId: string, scope: CloudExportRow["scope"]): CloudExportRow {
  const active = getDb()
    .select()
    .from(cloudExports)
    .where(and(eq(cloudExports.eventId, eventId), inArray(cloudExports.status, ["pending", "running"])))
    .get();
  if (active) return active;
  const row = getDb().insert(cloudExports).values({ id: newId(), eventId, scope, createdAt: Date.now() }).returning().get();
  void runExports();
  return row;
}

export function listExports(eventId: string, limit = 5): CloudExportRow[] {
  return getDb().select().from(cloudExports).where(eq(cloudExports.eventId, eventId)).orderBy(desc(cloudExports.createdAt)).limit(limit).all();
}

/** `2026-10-17 Julie & Thomas`: sorts by date in the cloud folder, readable by a person. */
function eventFolder(event: { name: string; eventDate: string | null }): string {
  // No leading dots either: a name of dots would be a `..` segment, a parent folder.
  const name = event.name.replace(/[\u0000-\u001f/\\:*?"<>|]/g, " ").replace(/\s+/g, " ").trim().replace(/^\.+/, "").trim().slice(0, 80) || "event";
  return event.eventDate ? `${event.eventDate} ${name}` : name;
}

const globalForExports = globalThis as unknown as { guestrollCloudRun?: Promise<void>; guestrollCloudRecovered?: boolean };

/**
 * Sends the queued albums, one after the other. Each photo is streamed from
 * storage to the server, its progress saved: a restart (or a failure) sends the
 * album again from the start, which is harmless, a PUT overwrites. A call while
 * a run is going returns that run, which also picks up what was queued since.
 */
export function runExports(): Promise<void> {
  if (config.demo.enabled) return Promise.resolve();
  globalForExports.guestrollCloudRun ??= drain().finally(() => {
    globalForExports.guestrollCloudRun = undefined;
  });
  return globalForExports.guestrollCloudRun;
}

async function drain(): Promise<void> {
  // A run cut short by a restart was left `running`: it goes back in the queue, once per process.
  if (!globalForExports.guestrollCloudRecovered) {
    globalForExports.guestrollCloudRecovered = true;
    getDb().update(cloudExports).set({ status: "pending" }).where(eq(cloudExports.status, "running")).run();
  }
  for (;;) {
    const job = getDb().select().from(cloudExports).where(eq(cloudExports.status, "pending")).orderBy(asc(cloudExports.createdAt)).limit(1).get();
    if (!job) return;
    await runOne(job);
  }
}

async function runOne(job: CloudExportRow): Promise<void> {
  const update = (values: Partial<CloudExportRow>) => getDb().update(cloudExports).set(values).where(eq(cloudExports.id, job.id)).run();
  const cloud = getCloudSettings();
  const event = getEventById(job.eventId);
  if (!cloud || !event) return void update({ status: "failed", error: cloud ? "Event deleted" : "Cloud export isn't set up", finishedAt: Date.now() });

  const photos = listForArchive(event.id, job.scope);
  update({ status: "running", done: 0, total: photos.length, error: null });
  try {
    const folder = [...cloud.folder.split("/").filter(Boolean), eventFolder(event)];
    await ensureFolders(cloud, folder);
    for (const [i, photo] of photos.entries()) {
      const file = await openPhotoStream(event.id, photo.id, "original", photo.mediaType);
      if (file) await putFile(cloud, [...folder, photoFileName(i, photo)], file, fileMime("original", photo.mediaType));
      update({ done: i + 1 });
    }
    update({ status: "done", finishedAt: Date.now() });
  } catch (error) {
    update({ status: "failed", error: (error as Error).message.slice(0, 300), finishedAt: Date.now() });
  }
}
