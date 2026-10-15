import "server-only";
import bcrypt from "bcryptjs";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { events, photos, type EventRow } from "@/lib/db/schema";
import { config } from "@/lib/config";
import { eventSlug, newId } from "@/lib/security/ids";
import { deleteEventFiles } from "@/lib/storage/files";
import type { EventInput } from "@/lib/validation";
import type { AdminScope } from "@/lib/policy";
import { parseQrStyle, type QrStyle } from "@/lib/qr/style";
import { readChallenges, type Challenge } from "@/lib/challenges";
import { readWallStyle, type WallStyle } from "@/lib/wall";

/** What the guest page may know about an event: no hash, no internal settings. */
export interface PublicEvent {
  id: string;
  slug: string;
  name: string;
  description: string;
  eventDate: string | null;
  accentColor: string;
  locked: boolean;
  captureMode: EventRow["captureMode"];
  askGuestName: boolean;
  moderation: EventRow["moderation"];
  maxPhotosPerGuest: number;
  logoVersion: number | null;
  defaultLocale: EventRow["defaultLocale"];
  collectGuestEmails: boolean;
  challenges: Challenge[];
  guestbookEnabled: boolean;
  guestbookVoice: boolean;
}

export function toPublicEvent(event: EventRow): PublicEvent {
  return {
    id: event.id,
    slug: event.slug,
    name: event.name,
    description: event.description,
    eventDate: event.eventDate,
    accentColor: event.accentColor,
    locked: event.accessCodeHash !== null,
    captureMode: event.captureMode,
    askGuestName: event.askGuestName,
    moderation: event.moderation,
    maxPhotosPerGuest: event.maxPhotosPerGuest,
    logoVersion: event.logoVersion,
    defaultLocale: event.defaultLocale,
    collectGuestEmails: event.collectGuestEmails,
    challenges: readChallenges(event.challenges),
    guestbookEnabled: event.guestbookEnabled,
    guestbookVoice: event.guestbookVoice,
  };
}

export type AdminEvent = Omit<EventRow, "accessCodeHash" | "qrStyle" | "challenges" | "wallStyle"> & {
  hasAccessCode: boolean;
  qrStyle: QrStyle;
  challenges: Challenge[];
  wallStyle: WallStyle;
};

export function toAdminEvent({ accessCodeHash, qrStyle, challenges, wallStyle, ...event }: EventRow): AdminEvent {
  return {
    ...event,
    wallStyle: readWallStyle(wallStyle),
    hasAccessCode: accessCodeHash !== null,
    qrStyle: parseQrStyle(qrStyle ? JSON.parse(qrStyle) : null),
    challenges: readChallenges(challenges),
  };
}

export function eventQrStyle(event: EventRow): QrStyle {
  return parseQrStyle(event.qrStyle ? JSON.parse(event.qrStyle) : null);
}

export function setLogoVersion(id: string, version: number | null): EventRow | undefined {
  return getDb().update(events).set({ logoVersion: version }).where(eq(events.id, id)).returning().get();
}

export function getEventBySlug(slug: string): EventRow | undefined {
  return getDb().select().from(events).where(eq(events.slug, slug)).get();
}

export function getEventById(id: string): EventRow | undefined {
  return getDb().select().from(events).where(eq(events.id, id)).get();
}

export interface EventSummary extends AdminEvent {
  photoCount: number;
  pendingCount: number;
  bytes: number;
  acceptingUploads: boolean;
}

export function listEvents(scope: AdminScope): EventSummary[] {
  if (!scope.all && scope.eventIds.length === 0) return [];
  const rows = getDb()
    .select({
      event: events,
      photoCount: sql<number>`count(${photos.id})`,
      pendingCount: sql<number>`coalesce(sum(case when ${photos.status} = 'pending' then 1 else 0 end), 0)`,
      bytes: sql<number>`coalesce(sum(${photos.bytes}), 0)`,
    })
    .from(events)
    .leftJoin(photos, eq(photos.eventId, events.id))
    .where(scope.all ? undefined : inArray(events.id, [...scope.eventIds]))
    .groupBy(events.id)
    .orderBy(desc(events.createdAt))
    .all();
  const now = Date.now();
  return rows.map((r) => ({
    ...toAdminEvent(r.event),
    photoCount: r.photoCount,
    pendingCount: r.pendingCount,
    bytes: r.bytes,
    acceptingUploads: r.event.uploadsOpen && (r.event.uploadsCloseAt === null || r.event.uploadsCloseAt > now),
  }));
}

function hashCode(code: string | null | undefined): string | null | undefined {
  if (code === undefined) return undefined;
  return code === null ? null : bcrypt.hashSync(code, 10);
}

export function createEvent(input: Partial<EventInput> & { name: string }): EventRow {
  const { accessCode, ...rest } = input;
  return getDb()
    .insert(events)
    .values({
      captureMode: config.defaultCaptureMode,
      ...rest,
      id: newId(),
      slug: eventSlug(input.name),
      accessCodeHash: hashCode(accessCode) ?? null,
    })
    .returning()
    .get();
}

export function updateEvent(id: string, input: Partial<EventInput>): EventRow | undefined {
  const { accessCode, ...rest } = input;
  const accessCodeHash = hashCode(accessCode);
  const patch = accessCodeHash === undefined ? rest : { ...rest, accessCodeHash };
  if (Object.keys(patch).length === 0) return getEventById(id);
  return getDb().update(events).set(patch).where(eq(events.id, id)).returning().get();
}

/** New slug = new QR code: the old one stops working, e.g. after it leaked on social media. */
export function rotateSlug(id: string): EventRow | undefined {
  const event = getEventById(id);
  if (!event) return undefined;
  return getDb().update(events).set({ slug: eventSlug(event.name) }).where(eq(events.id, id)).returning().get();
}

export async function deleteEvent(id: string): Promise<boolean> {
  const deleted = getDb().delete(events).where(eq(events.id, id)).returning({ id: events.id }).get();
  if (deleted) await deleteEventFiles(id);
  return Boolean(deleted);
}

export function checkAccessCode(event: EventRow, code: string): Promise<boolean> {
  return event.accessCodeHash ? bcrypt.compare(code, event.accessCodeHash) : Promise.resolve(true);
}
