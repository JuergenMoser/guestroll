import "server-only";
import { and, count, countDistinct, desc, eq, gte, inArray, isNotNull, ne, sql, sum, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { activity, events, photos } from "@/lib/db/schema";
import type { AdminScope } from "@/lib/policy";

export interface Totals {
  events: number;
  photos: number;
  pending: number;
  bytes: number;
  guests: number;
  views: number;
  downloads: number;
  zips: number;
  failedUnlocks: number;
}

export interface SeriesPoint {
  bucket: string;
  uploads: number;
  views: number;
  downloads: number;
}

export interface Stats {
  totals: Totals;
  series: SeriesPoint[];
  topGuests: { name: string; photos: number }[];
  /** One event only: photos per challenge id (visible and pending). */
  challenges: { id: string; photos: number }[];
}

/**
 * One event (an id): buckets are hours, a party lasts one night. Several events
 * (an admin's scope): days over the last 30 days. An organizer's dashboard only
 * ever counts their own events.
 */
export function getStats(target: string | AdminScope = { all: true }): Stats {
  const db = getDb();
  const eventId = typeof target === "string" ? target : undefined;
  const ids = typeof target === "string" ? [target] : target.all ? null : [...target.eventIds];
  // An organizer without events: `inArray` with an empty list matches nothing, which is right.
  const byEvent: SQL | undefined = ids ? inArray(photos.eventId, ids) : undefined;
  const activityScope: SQL | undefined = ids ? inArray(activity.eventId, ids) : undefined;
  const activityCount = (type: (typeof activity.$inferSelect)["type"]) =>
    db.select({ n: count() }).from(activity).where(and(eq(activity.type, type), activityScope)).get()?.n ?? 0;

  const photoTotals = db
    .select({
      photos: count(),
      pending: sql<number>`coalesce(sum(case when ${photos.status} = 'pending' then 1 else 0 end), 0)`,
      bytes: sum(photos.bytes),
      guests: countDistinct(photos.guestId),
    })
    .from(photos)
    .where(byEvent)
    .get();

  const totals: Totals = {
    events: ids ? ids.length : (db.select({ n: count() }).from(events).get()?.n ?? 0),
    photos: photoTotals?.photos ?? 0,
    pending: Number(photoTotals?.pending ?? 0),
    bytes: Number(photoTotals?.bytes ?? 0),
    guests: photoTotals?.guests ?? 0,
    views: activityCount("view"),
    downloads: activityCount("download"),
    zips: activityCount("zip"),
    failedUnlocks: activityCount("unlock_failed"),
  };

  const format = eventId ? "%Y-%m-%d %H:00" : "%Y-%m-%d";
  const since = eventId ? 0 : Date.now() - 30 * 24 * 60 * 60 * 1000;
  const bucket = sql<string>`strftime(${format}, ${activity.createdAt} / 1000, 'unixepoch', 'localtime')`;
  const rows = db
    .select({
      bucket,
      uploads: sql<number>`sum(case when ${activity.type} = 'upload' then 1 else 0 end)`,
      views: sql<number>`sum(case when ${activity.type} = 'view' then 1 else 0 end)`,
      downloads: sql<number>`sum(case when ${activity.type} in ('download', 'zip') then 1 else 0 end)`,
    })
    .from(activity)
    .where(and(gte(activity.createdAt, since), activityScope))
    .groupBy(bucket)
    .orderBy(bucket)
    .all();

  const topGuests = db
    .select({ name: sql<string>`coalesce(${photos.guestName}, '')`, photos: count() })
    .from(photos)
    .where(byEvent)
    .groupBy(photos.guestId)
    .orderBy(desc(count()))
    .limit(5)
    .all();

  const challenges = eventId
    ? db
        .select({ id: sql<string>`${photos.challengeId}`, photos: count() })
        .from(photos)
        .where(and(eq(photos.eventId, eventId), isNotNull(photos.challengeId), ne(photos.status, "hidden")))
        .groupBy(photos.challengeId)
        .all()
    : [];

  return { totals, series: rows, topGuests, challenges };
}
