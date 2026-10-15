import "server-only";
import { and, count, desc, eq, inArray, lt, ne, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { photos, type EventRow, type PhotoRow } from "@/lib/db/schema";
import { isEventAdmin, type Viewer } from "@/lib/policy";
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
  favorite?: boolean;
  challengeId: string | null;
  createdAt: number;
}

export function toPhotoDto(photo: PhotoRow, viewer: Pick<Viewer, "admin" | "guestId">): PhotoDto {
  return {
    id: photo.id,
    width: photo.width,
    height: photo.height,
    guestName: photo.guestName,
    status: photo.status,
    mine: viewer.guestId !== undefined && photo.guestId === viewer.guestId,
    challengeId: photo.challengeId,
    // The hosts' picks and counters stay theirs: guests and links never see them.
    ...(isEventAdmin(photo.eventId, viewer) ? { downloads: photo.downloads, favorite: photo.favorite } : {}),
    createdAt: photo.createdAt,
  };
}

export function getPhoto(id: string): PhotoRow | undefined {
  return getDb().select().from(photos).where(eq(photos.id, id)).get();
}

export function insertPhoto(photo: Omit<PhotoRow, "downloads" | "createdAt" | "favorite" | "challengeId"> & { challengeId?: string | null }): PhotoRow {
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
  favorite?: boolean;
  challengeId?: string;
}

/**
 * `"album"` lists the whole album (the caller already checked it may: an admin
 * of the event, or a gallery link with `status: "visible"`). A guest id lists
 * that guest's own photos, with the same rule as `canViewPhoto`; with `shared`
 * (the caller checked `albumShared`), the others' visible photos too.
 */
export function listPhotos(event: EventRow, who: "album" | { guestId?: string; shared?: boolean }, options: ListOptions = {}): PhotoRow[] {
  const limit = Math.min(Math.max(options.limit ?? 60, 1), 200);
  const filters: SQL[] = [eq(photos.eventId, event.id)];

  if (options.challengeId) filters.push(eq(photos.challengeId, options.challengeId));
  if (who === "album") {
    if (options.status) filters.push(eq(photos.status, options.status));
    if (options.favorite) filters.push(eq(photos.favorite, true));
  } else if (who.shared) {
    const own = who.guestId ? and(eq(photos.guestId, who.guestId), ne(photos.status, "hidden")) : undefined;
    filters.push(or(eq(photos.status, "visible"), own)!);
  } else {
    if (!who.guestId) return [];
    filters.push(eq(photos.guestId, who.guestId), ne(photos.status, "hidden"));
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

/** `visible`: the album as links show it; `favorites`: the visible favorites; `all`: everything, hidden included. */
export function listForArchive(eventId: string, scope: "visible" | "favorites" | "all"): PhotoRow[] {
  const filters: SQL[] = [eq(photos.eventId, eventId)];
  if (scope !== "all") filters.push(eq(photos.status, "visible"));
  if (scope === "favorites") filters.push(eq(photos.favorite, true));
  return getDb()
    .select()
    .from(photos)
    .where(and(...filters))
    .orderBy(photos.createdAt)
    .all();
}

export function setFavorite(ids: string[], eventId: string, favorite: boolean): number {
  if (ids.length === 0) return 0;
  return getDb()
    .update(photos)
    .set({ favorite })
    .where(and(eq(photos.eventId, eventId), inArray(photos.id, ids)))
    .run().changes;
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

export function countVisiblePhotos(eventId: string, favoritesOnly = false): number {
  const filters: SQL[] = [eq(photos.eventId, eventId), eq(photos.status, "visible")];
  if (favoritesOnly) filters.push(eq(photos.favorite, true));
  return getDb().select({ n: count() }).from(photos).where(and(...filters)).get()?.n ?? 0;
}

export function countFavorites(eventId: string): number {
  return getDb().select({ n: count() }).from(photos).where(and(eq(photos.eventId, eventId), eq(photos.favorite, true))).get()?.n ?? 0;
}

/** Only the guest who took it: the row is matched on event, photo AND guest. */
export async function deleteGuestPhoto(photoId: string, eventId: string, guestId: string): Promise<boolean> {
  const deleted = getDb()
    .delete(photos)
    .where(and(eq(photos.id, photoId), eq(photos.eventId, eventId), eq(photos.guestId, guestId)))
    .returning({ id: photos.id })
    .get();
  if (deleted) await deletePhotoFiles(eventId, deleted.id);
  return Boolean(deleted);
}
