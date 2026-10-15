import "server-only";
import { and, count, countDistinct, desc, eq, gte, sql, sum, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { activity, events, photos } from "@/lib/db/schema";

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
}

function activityCount(type: (typeof activity.$inferSelect)["type"], eventId?: string): number {
  const where = eventId ? and(eq(activity.type, type), eq(activity.eventId, eventId)) : eq(activity.type, type);
  return getDb().select({ n: count() }).from(activity).where(where).get()?.n ?? 0;
}

/**
 * With an `eventId`, buckets are hours (a party lasts one night); across all
 * events they are days over the last 30 days.
 */
export function getStats(eventId?: string): Stats {
  const db = getDb();
  const byEvent: SQL | undefined = eventId ? eq(photos.eventId, eventId) : undefined;

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
    events: eventId ? 1 : (db.select({ n: count() }).from(events).get()?.n ?? 0),
    photos: photoTotals?.photos ?? 0,
    pending: Number(photoTotals?.pending ?? 0),
    bytes: Number(photoTotals?.bytes ?? 0),
    guests: photoTotals?.guests ?? 0,
    views: activityCount("view", eventId),
    downloads: activityCount("download", eventId),
    zips: activityCount("zip", eventId),
    failedUnlocks: activityCount("unlock_failed", eventId),
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
    .where(and(gte(activity.createdAt, since), eventId ? eq(activity.eventId, eventId) : undefined))
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

  return { totals, series: rows, topGuests };
}
