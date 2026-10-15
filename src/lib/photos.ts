import "server-only";
import { and, count, desc, eq, inArray, lt, ne, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { photos, type EventRow, type PhotoRow } from "@/lib/db/schema";
import type { Viewer } from "@/lib/policy";
import { deletePhotoFiles } from "@/lib/storage/files";

/** The client only ever receives ids and URLs that go back through `/api/media`. */
export interface PhotoDto {
  id: string;
  width: number;
  height: number;
  guestName: string | null;
  status: PhotoRow["status"];
  mine: boolean;
  downloads?: number;
  createdAt: number;
}

export function toPhotoDto(photo: PhotoRow, viewer: Viewer): PhotoDto {
  return {
    id: photo.id,
    width: photo.width,
    height: photo.height,
    guestName: photo.guestName,
    status: photo.status,
    mine: viewer.guestId !== undefined && photo.guestId === viewer.guestId,
    ...(viewer.isAdmin ? { downloads: photo.downloads } : {}),
    createdAt: photo.createdAt,
  };
}

export function getPhoto(id: string): PhotoRow | undefined {
  return getDb().select().from(photos).where(eq(photos.id, id)).get();
}

export function insertPhoto(photo: Omit<PhotoRow, "downloads" | "createdAt">): PhotoRow {
  return getDb().insert(photos).values(photo).returning().get();
}

export function countGuestPhotos(eventId: string, guestId: string): number {
  return (
    getDb()
      .select({ n: count() })
      .from(photos)
      .where(and(eq(photos.eventId, eventId), eq(photos.guestId, guestId), ne(photos.status, "hidden")))
      .get()?.n ?? 0
  );
}

export interface ListOptions {
  /** `createdAt` of the last photo already shown; newest-first pagination. */
  before?: number;
  limit?: number;
  status?: PhotoRow["status"];
}

/** Applies the same visibility rules as `canViewPhoto`, as a SQL filter: guests get their own photos only. */
export function listPhotos(event: EventRow, viewer: Viewer, options: ListOptions = {}): PhotoRow[] {
  const limit = Math.min(Math.max(options.limit ?? 60, 1), 200);
  const filters: SQL[] = [eq(photos.eventId, event.id)];

  if (viewer.isAdmin) {
    if (options.status) filters.push(eq(photos.status, options.status));
  } else {
    if (!viewer.guestId) return [];
    filters.push(eq(photos.guestId, viewer.guestId), ne(photos.status, "hidden"));
  }
  if (options.before) filters.push(lt(photos.createdAt, options.before));

  return getDb()
    .select()
    .from(photos)
    .where(and(...filters))
    .orderBy(desc(photos.createdAt), desc(photos.id))
    .limit(limit)
    .all();
}

export function listForArchive(eventId: string, includeHidden: boolean): PhotoRow[] {
  return getDb()
    .select()
    .from(photos)
    .where(includeHidden ? eq(photos.eventId, eventId) : and(eq(photos.eventId, eventId), eq(photos.status, "visible")))
    .orderBy(photos.createdAt)
    .all();
}

export function setPhotoStatus(ids: string[], eventId: string, status: PhotoRow["status"]): number {
  if (ids.length === 0) return 0;
  return getDb()
    .update(photos)
    .set({ status })
    .where(and(eq(photos.eventId, eventId), inArray(photos.id, ids)))
    .run().changes;
}

export async function deletePhotos(ids: string[], eventId: string): Promise<number> {
  if (ids.length === 0) return 0;
  const deleted = getDb()
    .delete(photos)
    .where(and(eq(photos.eventId, eventId), inArray(photos.id, ids)))
    .returning({ id: photos.id })
    .all();
  await Promise.all(deleted.map((p) => deletePhotoFiles(eventId, p.id)));
  return deleted.length;
}

export function incrementDownloads(ids: string[]): void {
  if (ids.length === 0) return;
  getDb()
    .update(photos)
    .set({ downloads: sql`${photos.downloads} + 1` })
    .where(inArray(photos.id, ids))
    .run();
}

export function countVisiblePhotos(eventId: string): number {
  return (
    getDb()
      .select({ n: count() })
      .from(photos)
      .where(and(eq(photos.eventId, eventId), eq(photos.status, "visible")))
      .get()?.n ?? 0
  );
}
