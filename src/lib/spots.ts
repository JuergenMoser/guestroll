import "server-only";
import { and, asc, count, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { photos, spots, type SpotRow } from "@/lib/db/schema";
import { randomToken } from "@/lib/security/ids";

export const MAX_SPOTS = 100;
export const SPOT_ID = /^[a-z0-9]{10}$/;

export interface SpotDto {
  id: string;
  label: string;
  photos: number;
}

export function parseSpotLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const label = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return label.length >= 1 && label.length <= 40 ? label : null;
}

export function listSpots(eventId: string): SpotDto[] {
  const counts = new Map(
    getDb()
      .select({ spotId: photos.spotId, n: count() })
      .from(photos)
      // Like the challenge counts: hidden photos don't count.
      .where(and(eq(photos.eventId, eventId), ne(photos.status, "hidden")))
      .groupBy(photos.spotId)
      .all()
      .map((r) => [r.spotId, r.n]),
  );
  return getDb()
    .select()
    .from(spots)
    .where(eq(spots.eventId, eventId))
    .orderBy(asc(spots.createdAt), asc(spots.label))
    .all()
    .map((s) => ({ id: s.id, label: s.label, photos: counts.get(s.id) ?? 0 }));
}

/** The spot only if it belongs to this event: an id from another event's QR code is ignored. */
export function getSpot(eventId: string, id: unknown): SpotRow | undefined {
  if (typeof id !== "string" || !SPOT_ID.test(id)) return undefined;
  return getDb().select().from(spots).where(and(eq(spots.id, id), eq(spots.eventId, eventId))).get();
}

export function countSpots(eventId: string): number {
  return getDb().select({ n: count() }).from(spots).where(eq(spots.eventId, eventId)).get()?.n ?? 0;
}

export function createSpot(eventId: string, label: string): SpotRow {
  return getDb().insert(spots).values({ id: randomToken(10), eventId, label }).returning().get();
}

export function renameSpot(eventId: string, id: string, label: string): SpotRow | undefined {
  return getDb().update(spots).set({ label }).where(and(eq(spots.id, id), eq(spots.eventId, eventId))).returning().get();
}

/** Its photos stay in the album, untagged. */
export function deleteSpot(eventId: string, id: string): boolean {
  return getDb().transaction(() => {
    getDb().update(photos).set({ spotId: null }).where(and(eq(photos.eventId, eventId), eq(photos.spotId, id))).run();
    return getDb().delete(spots).where(and(eq(spots.id, id), eq(spots.eventId, eventId))).run().changes > 0;
  });
}

/** For a duplicated event: the same places, new codes (the old ones keep pointing at the old event). */
export function copySpots(fromEventId: string, toEventId: string): void {
  const labels = getDb().select({ label: spots.label }).from(spots).where(eq(spots.eventId, fromEventId)).orderBy(asc(spots.createdAt)).all();
  if (labels.length) getDb().insert(spots).values(labels.map((s) => ({ id: randomToken(10), eventId: toEventId, label: s.label }))).run();
}
