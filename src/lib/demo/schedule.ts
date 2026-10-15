import "server-only";
import cron from "node-cron";
import { config } from "@/lib/config";
import { isDemoInstance, resetDemo, seedDemo } from "./seed";

const globalForDemo = globalThis as unknown as { guestrollDemoTask?: ReturnType<typeof cron.schedule> };

/** Seeds an empty demo at start, and resets it on DEMO_RESET_CRON (every night at 4:00 by default). */
export async function startDemo(): Promise<void> {
  if (!isDemoInstance()) {
    try {
      console.log("[demo] seeding");
      await seedDemo();
    } catch (error) {
      // No demo account, no nightly wipe: the instance runs as it was.
      console.error(`[demo] ${(error as Error).message}`);
      return;
    }
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
