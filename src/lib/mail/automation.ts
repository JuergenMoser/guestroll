import "server-only";
import { startExport } from "@/lib/cloud/export";
import { getCloudSettings } from "@/lib/cloud/settings";
import { and, count, eq, gte, isNotNull, isNull, lte } from "drizzle-orm";
import { config } from "@/lib/config";
import { listGuestContacts, uniqueRecipients } from "@/lib/contacts";
import { getDb } from "@/lib/db/client";
import { activity, events, photos, type EventRow } from "@/lib/db/schema";
import { formatBytes } from "@/lib/format";
import { createShareLink, generateSharePassword } from "@/lib/shares";
import { readSetting, writeSetting } from "@/lib/settings";
import { getStats } from "@/lib/stats";
import { countMessages } from "@/lib/messages";
import { storage } from "@/lib/storage";
import { backgroundBaseUrl } from "@/lib/urls";
import { mailMessages } from "./messages";
import { enqueueMail } from "./outbox";
import { eventRecipients, getAlertSettings, instanceRecipients } from "./settings";
import { notify } from "@/lib/webhooks/queue";
import { webhooksFor } from "@/lib/webhooks/settings";
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
  // The album goes to the cloud on its own when the owners asked for it.
  if (getCloudSettings()?.autoExport) startExport(event.id, "visible");

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
      favoritesOnly: event.galleryLinkFavorites,
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
      messages: countMessages(event.id),
    });
    for (const to of hosts) {
      if (enqueueMail({ to, mail, kind: "summary", eventId: event.id, dedupeKey: `summary:${event.id}:${to}` })) result.summaryQueued = true;
    }
  }

  const m = mailMessages[config.locale];
  const stats = getStats(event.id);
  notify(
    {
      kind: "event_ended",
      title: m.summary.title.replace("{event}", event.name),
      message: [`${m.summary.photos}: ${stats.totals.photos}`, `${m.summary.guests}: ${stats.totals.guests}`, `${m.summary.pending}: ${stats.totals.pending}`].join("\n"),
      url: `${base}/admin/events/${event.id}`,
      event: { id: event.id, name: event.name },
      data: { photos: stats.totals.photos, guests: stats.totals.guests, pending: stats.totals.pending, galleryRecipients: result.galleryRecipients },
    },
    `ended:${event.id}`,
  );
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
  const byEmail = getAlertSettings().pendingPhotos;
  if (!byEmail && !webhooksFor("photos_pending").length) return 0;
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
    const url = `${backgroundBaseUrl()}/admin/events/${event.id}`;
    const mail = pendingMail({ ...common(), event: event.name, accent: event.accentColor, url, count: pending });
    for (const to of byEmail ? eventRecipients(event.id) : []) {
      if (enqueueMail({ to, mail, kind: "alert:pending", eventId: event.id, dedupeKey: `pending:${event.id}:${pending}:${to}` })) queued++;
    }
    queued += notify({ kind: "photos_pending", title: mail.subject, message: mail.text.split("\n")[2] ?? "", url, event: { id: event.id, name: event.name }, data: { pending } }, `pending:${event.id}:${pending}`);
    writeSetting(key, JSON.stringify({ count: pending, at: now }));
  }
  return queued;
}

/** 10+ wrong admin passwords in 15 minutes: one alert per hour at most. */
export function failedLoginAlert(now = Date.now()): boolean {
  const recipients = getAlertSettings().failedLogins ? instanceRecipients() : [];
  if (!recipients.length && !webhooksFor("failed_logins").length) return false;
  const failures =
    getDb()
      .select({ n: count() })
      .from(activity)
      .where(and(eq(activity.type, "login_failed"), gte(activity.createdAt, now - 15 * 60_000)))
      .get()?.n ?? 0;
  if (failures < 10) return false;
  const hour = Math.floor(now / 3_600_000);
  const mail = failedLoginsMail({ ...common(), url: `${backgroundBaseUrl()}/admin`, count: failures });
  const mailed = recipients.map((to) => enqueueMail({ to, mail, kind: "alert:logins", dedupeKey: `logins:${hour}:${to}` })).some(Boolean);
  const hooked = notify({ kind: "failed_logins", title: mail.subject, message: mailMessages[config.locale].failedLogins.body.replace("{count}", String(failures)), url: `${backgroundBaseUrl()}/admin`, data: { failures } }, `logins:${hour}`) > 0;
  return mailed || hooked;
}

/** The data disk is 90%+ full: one alert per day at most. */
export async function storageAlert(now = Date.now()): Promise<boolean> {
  const recipients = getAlertSettings().storage ? instanceRecipients() : [];
  if (!recipients.length && !webhooksFor("storage").length) return false;
  const disk = await storage().capacity();
  if (!disk) return false;
  const percent = Math.round(100 - (disk.free / disk.total) * 100);
  if (percent < 90) return false;
  const day = Math.floor(now / DAY);
  const free = formatBytes(disk.free, config.locale);
  const mail = storageMail({ ...common(), url: `${backgroundBaseUrl()}/admin`, percent, free });
  const mailed = recipients.map((to) => enqueueMail({ to, mail, kind: "alert:storage", dedupeKey: `storage:${day}:${to}` })).some(Boolean);
  const body = mailMessages[config.locale].storage.body.replace("{percent}", String(percent)).replace("{free}", free);
  const hooked = notify({ kind: "storage", title: mail.subject, message: body, url: `${backgroundBaseUrl()}/admin`, data: { percent, freeBytes: disk.free } }, `storage:${day}`) > 0;
  return mailed || hooked;
}

/** Tells subscribed webhooks a guest left a message; email stays quiet, the summary counts them. */
export function guestbookNotice(event: Pick<EventRow, "id" | "name">, message: { guestName: string | null; text: string; hasAudio: boolean }): void {
  const m = mailMessages[config.locale].notice;
  const lines = [message.guestName ? m.from.replace("{name}", message.guestName) : "", message.text, message.hasAudio ? m.voiceNote : ""].filter(Boolean);
  notify({ kind: "guestbook_message", title: m.guestbook.replace("{event}", event.name), message: lines.join("\n").slice(0, 1000), url: `${backgroundBaseUrl()}/admin/events/${event.id}?tab=guestbook`, event: { id: event.id, name: event.name } });
}
