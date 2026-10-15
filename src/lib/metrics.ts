import "server-only";
import { count, sql, sum } from "drizzle-orm";
import { lastRun } from "@/lib/backupSchedule";
import { getDb } from "@/lib/db/client";
import { cloudExports, events, messages, outbox, photos, webhookDeliveries } from "@/lib/db/schema";
import { storage } from "@/lib/storage";
import { currentVersion } from "@/lib/updates";

type Sample = { labels?: Record<string, string>; value: number };
interface Metric {
  name: string;
  help: string;
  type: "gauge" | "counter";
  samples: Sample[];
}

const escapeLabel = (v: string) => v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/"/g, '\\"');

/** Prometheus' text exposition format, version 0.0.4. */
export function renderMetrics(metrics: Metric[]): string {
  return (
    metrics
      .flatMap((m) => [
        `# HELP ${m.name} ${m.help}`,
        `# TYPE ${m.name} ${m.type}`,
        ...m.samples.map((s) => {
          const labels = s.labels && Object.keys(s.labels).length ? `{${Object.entries(s.labels).map(([k, v]) => `${k}="${escapeLabel(v)}"`).join(",")}}` : "";
          return `${m.name}${labels} ${Number.isFinite(s.value) ? s.value : 0}`;
        }),
      ])
      .join("\n") + "\n"
  );
}

/** Group-by counts as one sample per value, every known value present (0 when absent). */
function byStatus<T extends string>(rows: { status: T; n: number }[], all: readonly T[]): Sample[] {
  const found = new Map(rows.map((r) => [r.status, r.n]));
  return all.map((status) => ({ labels: { status }, value: found.get(status) ?? 0 }));
}

/**
 * The instance at the time of the scrape: a few aggregate queries, no per-event
 * labels (their names are the hosts' data, and their number has no bound).
 */
export async function collectMetrics(now = Date.now()): Promise<Metric[]> {
  const db = getDb();
  const eventTotals = db
    .select({
      total: count(),
      open: sql<number>`coalesce(sum(case when ${events.uploadsOpen} = 1 and (${events.uploadsCloseAt} is null or ${events.uploadsCloseAt} > ${now}) then 1 else 0 end), 0)`,
    })
    .from(events)
    .get()!;
  const photoRows = db.select({ status: photos.status, n: count() }).from(photos).groupBy(photos.status).all();
  const photoBytes = db.select({ bytes: sum(photos.bytes) }).from(photos).get();
  const guests = db.select({ n: sql<number>`count(distinct ${photos.eventId} || ':' || ${photos.guestId})` }).from(photos).get();
  const messageRows = db.select({ status: messages.status, n: count() }).from(messages).groupBy(messages.status).all();
  const mailRows = db.select({ status: outbox.status, n: count() }).from(outbox).groupBy(outbox.status).all();
  const hookRows = db.select({ status: webhookDeliveries.status, n: count() }).from(webhookDeliveries).groupBy(webhookDeliveries.status).all();
  const cloudRows = db.select({ status: cloudExports.status, n: count() }).from(cloudExports).groupBy(cloudExports.status).all();
  const disk = await storage().capacity().catch(() => null);
  const backup = lastRun();
  const memory = process.memoryUsage();

  return [
    { name: "guestroll_info", help: "The running version, as a label.", type: "gauge", samples: [{ labels: { version: currentVersion() }, value: 1 }] },
    { name: "guestroll_uptime_seconds", help: "Seconds since the server started.", type: "gauge", samples: [{ value: Math.round(process.uptime()) }] },
    { name: "guestroll_memory_bytes", help: "Resident memory of the server process.", type: "gauge", samples: [{ value: memory.rss }] },
    { name: "guestroll_events", help: "Events on the instance.", type: "gauge", samples: [{ value: eventTotals.total }] },
    { name: "guestroll_events_open", help: "Events accepting uploads right now.", type: "gauge", samples: [{ value: eventTotals.open }] },
    { name: "guestroll_photos", help: "Photos, by moderation status.", type: "gauge", samples: byStatus(photoRows, ["visible", "pending", "hidden"] as const) },
    { name: "guestroll_photos_bytes", help: "Size of the originals, in bytes.", type: "gauge", samples: [{ value: Number(photoBytes?.bytes ?? 0) }] },
    { name: "guestroll_guests", help: "Guests who sent at least one photo, across events.", type: "gauge", samples: [{ value: guests?.n ?? 0 }] },
    { name: "guestroll_messages", help: "Guestbook messages, by moderation status.", type: "gauge", samples: byStatus(messageRows, ["visible", "pending", "hidden"] as const) },
    { name: "guestroll_mail_queue", help: "Emails in the outgoing queue, by state.", type: "gauge", samples: byStatus(mailRows, ["pending", "sent", "failed"] as const) },
    { name: "guestroll_webhook_queue", help: "Webhook deliveries, by state.", type: "gauge", samples: byStatus(hookRows, ["pending", "sent", "failed"] as const) },
    { name: "guestroll_cloud_exports", help: "Albums sent to the cloud, by state.", type: "gauge", samples: byStatus(cloudRows, ["pending", "running", "done", "failed"] as const) },
    ...(disk
      ? [
          { name: "guestroll_storage_free_bytes", help: "Free space on the photos' disk.", type: "gauge" as const, samples: [{ value: disk.free }] },
          { name: "guestroll_storage_total_bytes", help: "Size of the photos' disk.", type: "gauge" as const, samples: [{ value: disk.total }] },
        ]
      : []),
    ...(backup
      ? [
          { name: "guestroll_backup_last_run_timestamp_seconds", help: "When the last scheduled backup ran.", type: "gauge" as const, samples: [{ value: Math.round(backup.at / 1000) }] },
          { name: "guestroll_backup_last_success", help: "1 when the last scheduled backup succeeded.", type: "gauge" as const, samples: [{ value: backup.ok ? 1 : 0 }] },
        ]
      : []),
  ];
}
