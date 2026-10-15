import "server-only";
import cron from "node-cron";
import { config } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import { events } from "@/lib/db/schema";
import { resetDemo, seedDemo } from "./seed";

const globalForDemo = globalThis as unknown as { guestrollDemoTask?: ReturnType<typeof cron.schedule> };

/** Seeds an empty demo at start, and resets it on DEMO_RESET_CRON (every night at 4:00 by default). */
export async function startDemo(): Promise<void> {
  if (!getDb().select({ id: events.id }).from(events).limit(1).get()) {
    console.log("[demo] seeding");
    await seedDemo();
  }
  if (globalForDemo.guestrollDemoTask) return;
  globalForDemo.guestrollDemoTask = cron.schedule(
    config.demo.resetCron,
    () =>
      resetDemo()
        .then(() => console.log("[demo] reset"))
        .catch((error) => console.error("[demo] reset failed", error)),
    { name: "guestroll-demo-reset", timezone: config.timeZone, noOverlap: true },
  );
}

export const nextDemoReset = (): number | null => globalForDemo.guestrollDemoTask?.getNextRun()?.getTime() ?? null;
