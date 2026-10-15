import "server-only";
import { config } from "@/lib/config";
import { endEvent, eventsToEnd, failedLoginAlert, pendingPhotoAlerts, storageAlert } from "@/lib/mail/automation";
import { processOutbox } from "@/lib/mail/outbox";
import { mailEnabled } from "@/lib/mail/settings";
import { processWebhooks } from "@/lib/webhooks/queue";
import { cleanTempFiles } from "@/lib/backup";
import { runRetention } from "@/lib/retention";
import { maybeCheckForUpdate } from "@/lib/updates";

/** One pass of everything time-based. Exported for tests and the admin's "run now". */
export async function tick(now = Date.now()): Promise<void> {
  for (const event of eventsToEnd(now)) endEvent(event, now);
  pendingPhotoAlerts(now);
  failedLoginAlert(now);
  await storageAlert(now);
  await runRetention(now);
  await cleanTempFiles();
  // A public demo sends nothing out: queued mails and webhooks stay queued, reset at night.
  if (config.demo.enabled) return;
  // Mails are queued even without SMTP, so configuring it later still delivers them.
  if (mailEnabled()) await processOutbox(undefined, now);
  await maybeCheckForUpdate(now);
  await processWebhooks(undefined, now);
}

const globalForScheduler = globalThis as unknown as { guestrollScheduler?: NodeJS.Timeout };

/** Started once per process from instrumentation.ts. */
export function startScheduler(): void {
  if (globalForScheduler.guestrollScheduler || config.schedulerIntervalMs === 0) return;
  const run = () =>
    tick().catch((error) => {
      console.error("[scheduler]", error);
    });
  globalForScheduler.guestrollScheduler = setInterval(run, config.schedulerIntervalMs);
  globalForScheduler.guestrollScheduler.unref();
  setTimeout(run, 5_000).unref();
}
