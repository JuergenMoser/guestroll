import "server-only";
import { and, isNotNull, lte } from "drizzle-orm";
import { config } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import { events, type EventRow } from "@/lib/db/schema";
import { deleteEvent } from "@/lib/events";
import { enqueueMail } from "@/lib/mail/outbox";
import { eventRecipients } from "@/lib/mail/settings";
import { purgeMail } from "@/lib/mail/templates";
import { readSetting, writeSetting } from "@/lib/settings";
import { backgroundBaseUrl } from "@/lib/urls";

const KEY = "retention";
const DAY = 86_400_000;
export const WARNING_DAYS = 7;

/** 0 = keep events forever (the default: deleting photos is never a surprise). */
export function getRetentionDays(): number {
  const n = Number(readSetting(KEY) ?? 0);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

export function saveRetentionDays(days: number): void {
  writeSetting(KEY, String(days));
}

/** When an event is deleted: N days after it ended. Events that never ended (no closing time) are never purged. */
export function purgeDate(event: Pick<EventRow, "endedAt">, days = getRetentionDays()): number | null {
  return days > 0 && event.endedAt ? event.endedAt + days * DAY : null;
}

/**
 * Warns the hosts a week before (once per event), then deletes the events
 * whose date passed, photos and messages included.
 */
export async function runRetention(now = Date.now()): Promise<{ warned: number; purged: number }> {
  const days = getRetentionDays();
  if (!days) return { warned: 0, purged: 0 };
  const ended = getDb()
    .select()
    .from(events)
    .where(and(isNotNull(events.endedAt), lte(events.endedAt, now - (days - WARNING_DAYS) * DAY)))
    .all();
  let warned = 0;
  let purged = 0;
  for (const event of ended) {
    const date = purgeDate(event, days)!;
    if (date <= now) {
      await deleteEvent(event.id);
      purged++;
      continue;
    }
    const locale = config.locale;
    const mail = purgeMail({
      app: config.appName,
      locale,
      event: event.name,
      accent: event.accentColor,
      url: `${backgroundBaseUrl()}/admin/events/${event.id}`,
      date: new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(date)),
    });
    for (const to of eventRecipients(event.id)) {
      if (enqueueMail({ to, mail, kind: "purge-warning", eventId: event.id, dedupeKey: `purge-warning:${event.id}:${to}` })) warned++;
    }
  }
  return { warned, purged };
}

