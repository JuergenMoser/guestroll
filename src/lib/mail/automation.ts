import "server-only";
import { and, count, eq, gte, isNotNull, isNull, lte } from "drizzle-orm";
import { config } from "@/lib/config";
import { listGuestContacts, uniqueRecipients } from "@/lib/contacts";
import { getDb } from "@/lib/db/client";
import { activity, events, photos, type EventRow } from "@/lib/db/schema";
import { formatBytes } from "@/lib/format";
import { createShareLink, generateSharePassword } from "@/lib/shares";
import { readSetting, writeSetting } from "@/lib/settings";
import { getStats } from "@/lib/stats";
import { storage } from "@/lib/storage";
import { backgroundBaseUrl } from "@/lib/urls";
import { mailMessages } from "./messages";
import { enqueueMail } from "./outbox";
import { eventRecipients, getAlertSettings, instanceRecipients } from "./settings";
import { failedLoginsMail, galleryMail, pendingMail, storageMail, summaryMail } from "./templates";

const DAY = 86_400_000;
const common = () => ({ app: config.appName, locale: config.locale });

export interface EndResult {
  summaryQueued: boolean;
  galleryRecipients: number;
  shareId: string | null;
  /**
   * Set only when guests were emailed WITHOUT the password: it is hashed in the
   * database, so this answer and the admin summary are the only places it exists.
   */
  galleryPassword: string | null;
}

/**
 * Runs what the event asked for once its uploads close: the admin summary and
 * the gallery link for guests who left their email. Idempotent: the atomic
 * claim on `ended_at` makes a second call (another tick, a double click) a no-op.
 */
export function endEvent(event: EventRow, now = Date.now()): EndResult | null {
  const claimed = getDb()
    .update(events)
    .set({ endedAt: now })
    .where(and(eq(events.id, event.id), isNull(events.endedAt)))
    .run();
  if (claimed.changes === 0) return null;

  const base = backgroundBaseUrl();
  const result: EndResult = { summaryQueued: false, galleryRecipients: 0, shareId: null, galleryPassword: null };
  let gallery: { url: string; password: string } | undefined;

  const recipients = event.emailGuestsGallery ? uniqueRecipients(listGuestContacts(event.id)) : [];
  if (recipients.length > 0) {
    const password = generateSharePassword();
    const expiresAt = event.galleryLinkDays > 0 ? now + event.galleryLinkDays * DAY : null;
    const share = createShareLink({
      eventId: event.id,
      password,
      label: mailMessages[config.locale].gallery.linkLabel,
      allowDownload: event.galleryLinkDownload,
      expiresAt,
    });
    result.shareId = share.id;
    if (!event.galleryMailIncludesPassword) {
      result.galleryPassword = password;
      gallery = { url: `${base}/g/${share.token}`, password };
    }
    for (const contact of recipients) {
      const mail = galleryMail({
        app: config.appName,
        locale: contact.locale,
        event: event.name,
        accent: event.accentColor,
        url: `${base}/g/${share.token}`,
        password: event.galleryMailIncludesPassword ? password : null,
        expiresAt,
        downloads: event.galleryLinkDownload,
      });
      if (enqueueMail({ to: contact.email, mail, kind: "gallery", eventId: event.id, dedupeKey: `gallery:${event.id}:${contact.email}` })) {
        result.galleryRecipients++;
      }
    }
  }

  const hosts = eventRecipients(event.id);
  // Guests were told to ask the hosts for the password: the summary carrying it
  // goes out even if the host turned summaries off.
  const summaryWanted = event.notifyAdminSummary && getAlertSettings().eventEnded;
  if (hosts.length && (summaryWanted || (gallery && result.galleryRecipients > 0))) {
    const stats = getStats(event.id);
    const mail = summaryMail({
      ...common(),
      event: event.name,
      accent: event.accentColor,
      url: `${base}/admin/events/${event.id}`,
      photos: stats.totals.photos,
      guests: stats.totals.guests,
      pending: stats.totals.pending,
      views: stats.totals.views,
      topGuests: stats.topGuests,
      galleryRecipients: result.galleryRecipients,
      gallery,
    });
    for (const to of hosts) {
      if (enqueueMail({ to, mail, kind: "summary", eventId: event.id, dedupeKey: `summary:${event.id}:${to}` })) result.summaryQueued = true;
    }
  }
  return result;
}

/** Events whose scheduled closing time passed and that weren't processed yet. */
export function eventsToEnd(now = Date.now()): EventRow[] {
  return getDb()
    .select()
    .from(events)
    .where(and(isNull(events.endedAt), isNotNull(events.uploadsCloseAt), lte(events.uploadsCloseAt, now)))
    .all();
}

/**
 * Digest of photos waiting for approval: at most one mail per event every 30
 * minutes, and only when the count went up since the last one.
 */
export function pendingPhotoAlerts(now = Date.now()): number {
  if (!getAlertSettings().pendingPhotos) return 0;
  const rows = getDb()
    .select({ event: events, pending: count(photos.id) })
    .from(events)
    .innerJoin(photos, and(eq(photos.eventId, events.id), eq(photos.status, "pending")))
    .where(and(eq(events.moderation, "pre"), isNull(events.endedAt)))
    .groupBy(events.id)
    .all();
  let queued = 0;
  for (const { event, pending } of rows) {
    const key = `alert:pending:${event.id}`;
    const last = JSON.parse(readSetting(key) ?? '{"count":0,"at":0}') as { count: number; at: number };
    if (pending <= last.count || now - last.at < 30 * 60_000) continue;
    const mail = pendingMail({ ...common(), event: event.name, accent: event.accentColor, url: `${backgroundBaseUrl()}/admin/events/${event.id}`, count: pending });
    for (const to of eventRecipients(event.id)) {
      if (enqueueMail({ to, mail, kind: "alert:pending", eventId: event.id, dedupeKey: `pending:${event.id}:${pending}:${to}` })) queued++;
    }
    writeSetting(key, JSON.stringify({ count: pending, at: now }));
  }
  return queued;
}

/** 10+ wrong admin passwords in 15 minutes: one alert per hour at most. */
export function failedLoginAlert(now = Date.now()): boolean {
  const recipients = instanceRecipients();
  if (!recipients.length || !getAlertSettings().failedLogins) return false;
  const failures =
    getDb()
      .select({ n: count() })
      .from(activity)
      .where(and(eq(activity.type, "login_failed"), gte(activity.createdAt, now - 15 * 60_000)))
      .get()?.n ?? 0;
  if (failures < 10) return false;
  const mail = failedLoginsMail({ ...common(), url: `${backgroundBaseUrl()}/admin`, count: failures });
  return recipients.map((to) => enqueueMail({ to, mail, kind: "alert:logins", dedupeKey: `logins:${Math.floor(now / 3_600_000)}:${to}` })).some(Boolean);
}

/** The data disk is 90%+ full: one alert per day at most. */
export async function storageAlert(now = Date.now()): Promise<boolean> {
  const recipients = instanceRecipients();
  if (!recipients.length || !getAlertSettings().storage) return false;
  const disk = await storage().capacity();
  if (!disk) return false;
  const percent = Math.round(100 - (disk.free / disk.total) * 100);
  if (percent < 90) return false;
  const mail = storageMail({ ...common(), url: `${backgroundBaseUrl()}/admin`, percent, free: formatBytes(disk.free, config.locale) });
  return recipients.map((to) => enqueueMail({ to, mail, kind: "alert:storage", dedupeKey: `storage:${Math.floor(now / DAY)}:${to}` })).some(Boolean);
}
