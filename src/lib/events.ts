import "server-only";
import bcrypt from "bcryptjs";
import { and, asc, count, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { accountEvents, events, photos, type EventRow } from "@/lib/db/schema";
import { config } from "@/lib/config";
import { eventSlug, newId } from "@/lib/security/ids";
import { deleteEventFiles, readLogo, writeLogo } from "@/lib/storage/files";
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
  captureFilters: boolean;
  frame: EventRow["frame"];
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
    captureFilters: event.captureFilters,
    frame: event.frame,
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

export interface EventPage {
  events: EventSummary[];
  total: number;
  page: number;
  pageCount: number;
}

export const EVENTS_PER_PAGE = 20;

function scopeFilter(scope: AdminScope, q?: string): SQL | undefined {
  const search = q?.trim();
  return and(
    scope.all ? undefined : inArray(events.id, [...scope.eventIds]),
    // LIKE with its own wildcards escaped: a search for "50%" means those characters.
    search ? sql`${events.name} like ${`%${search.replace(/[\\%_]/g, "\\$&")}%`} escape '\\'` : undefined,
  );
}

/**
 * Photo counts for the given events only: aggregating the whole photos table
 * to show twenty rows is what made the list slow once albums grew.
 */
function summarize(rows: EventRow[]): EventSummary[] {
  if (rows.length === 0) return [];
  const stats = new Map(
    getDb()
      .select({
        eventId: photos.eventId,
        photoCount: count(),
        pendingCount: sql<number>`coalesce(sum(case when ${photos.status} = 'pending' then 1 else 0 end), 0)`,
        bytes: sql<number>`coalesce(sum(${photos.bytes}), 0)`,
      })
      .from(photos)
      .where(inArray(photos.eventId, rows.map((r) => r.id)))
      .groupBy(photos.eventId)
      .all()
      .map((s) => [s.eventId, s]),
  );
  const now = Date.now();
  return rows.map((event) => {
    const s = stats.get(event.id);
    return {
      ...toAdminEvent(event),
      photoCount: s?.photoCount ?? 0,
      pendingCount: s?.pendingCount ?? 0,
      bytes: s?.bytes ?? 0,
      acceptingUploads: event.uploadsOpen && (event.uploadsCloseAt === null || event.uploadsCloseAt > now),
    };
  });
}

/** One page of the events `scope` may see, newest first, optionally filtered by name. */
export function pageEvents(scope: AdminScope, { page = 1, perPage = EVENTS_PER_PAGE, q }: { page?: number; perPage?: number; q?: string } = {}): EventPage {
  if (!scope.all && scope.eventIds.length === 0) return { events: [], total: 0, page: 1, pageCount: 1 };
  const where = scopeFilter(scope, q);
  const total = getDb().select({ n: count() }).from(events).where(where).get()?.n ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  // A page past the end (events deleted since the link was made) shows the last one.
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const rows = getDb()
    .select()
    .from(events)
    .where(where)
    .orderBy(desc(events.createdAt), asc(events.id))
    .limit(perPage)
    .offset((current - 1) * perPage)
    .all();
  return { events: summarize(rows), total, page: current, pageCount };
}

/** Every event `scope` may see, with its counts: for scripts and the API without paging. */
export function listEvents(scope: AdminScope): EventSummary[] {
  if (!scope.all && scope.eventIds.length === 0) return [];
  return summarize(getDb().select().from(events).where(scopeFilter(scope)).orderBy(desc(events.createdAt), asc(events.id)).all());
}

/** Names only, for pickers: no photo counts to compute. */
export function listEventNames(scope: AdminScope): { id: string; name: string }[] {
  if (!scope.all && scope.eventIds.length === 0) return [];
  return getDb().select({ id: events.id, name: events.name }).from(events).where(scopeFilter(scope)).orderBy(desc(events.createdAt)).all();
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

/**
 * A new event with the same settings, look, QR style, logo, challenges and
 * organizers, and none of the photos, guests or links. Its own slug, so the
 * old QR code keeps pointing at the old event; uploads open, no closing time.
 */
export async function duplicateEvent(source: EventRow, name: string): Promise<EventRow> {
  const { id: _id, slug: _slug, createdAt: _createdAt, endedAt: _endedAt, uploadsCloseAt: _close, logoVersion, ...settings } = source;
  const copy = getDb().transaction(() => {
    const row = getDb()
      .insert(events)
      .values({ ...settings, id: newId(), slug: eventSlug(name), name, uploadsOpen: true, uploadsCloseAt: null, endedAt: null, logoVersion: null })
      .returning()
      .get();
    const organizers = getDb().select({ accountId: accountEvents.accountId }).from(accountEvents).where(eq(accountEvents.eventId, source.id)).all();
    if (organizers.length) getDb().insert(accountEvents).values(organizers.map((o) => ({ accountId: o.accountId, eventId: row.id }))).run();
    return row;
  });
  if (logoVersion) {
    const logo = await readLogo(source.id);
    if (logo) {
      await writeLogo(copy.id, logo);
      return setLogoVersion(copy.id, Date.now())!;
    }
  }
  return copy;
}
