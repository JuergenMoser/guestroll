import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { freshEnv } from "../helpers/env";

let env: Awaited<ReturnType<typeof freshEnv>>;
let backups: string;
beforeEach(async () => {
  env = await freshEnv({ ADMIN_EMAIL: "host@x.test", SESSION_SECRET: "" });
  backups = path.join(env.dir, "elsewhere");
  process.env.BACKUP_DIR = backups;
});
afterEach(() => {
  delete process.env.BACKUP_DIR;
  env.cleanup();
});

describe("scheduled backups", () => {
  it("write to the destination and keep only the newest", async () => {
    const { saveSchedule, runBackup, listStoredBackups, getSchedule } = await import("@/lib/backupSchedule");
    const events = await import("@/lib/events");
    events.createEvent({ name: "Kept" });
    saveSchedule({ enabled: false, cron: "0 3 * * *", keep: 2 });
    for (let i = 0; i < 3; i++) {
      const run = await runBackup("manual");
      expect(run).toMatchObject({ ok: true, name: expect.stringMatching(/^guestroll-backup-[0-9-]+\.zip$/) });
    }
    const stored = await listStoredBackups();
    expect(stored).toHaveLength(2);
    expect(fs.readdirSync(backups).sort()).toEqual(stored.map((b) => b.name).sort());
    expect(getSchedule().keep).toBe(2);
    // No temporary file left in the data folder.
    expect(fs.readdirSync(env.dir).filter((f) => f.endsWith(".tmp"))).toEqual([]);
  });

  it("restore from the list", async () => {
    const { runBackup, restoreStoredBackup } = await import("@/lib/backupSchedule");
    const events = await import("@/lib/events");
    const kept = events.createEvent({ name: "Before" });
    const { name } = await runBackup();
    const later = events.createEvent({ name: "After" });
    await restoreStoredBackup(name!);
    const fresh = await import("@/lib/events");
    expect(fresh.getEventById(kept.id)?.name).toBe("Before");
    expect(fresh.getEventById(later.id)).toBeUndefined();
    await expect(restoreStoredBackup("../../etc/passwd")).rejects.toThrow(/Unknown backup/);
  });

  it("alert the owners when a backup fails", async () => {
    // A file where the folder should be: writing fails.
    fs.writeFileSync(backups, "not a folder");
    const { runBackup, lastRun } = await import("@/lib/backupSchedule");
    const { outboxSummary } = await import("@/lib/mail/outbox");
    await expect(runBackup("scheduled")).rejects.toThrow();
    expect(lastRun()).toMatchObject({ ok: false, error: expect.any(String) });
    expect(outboxSummary().recent[0]).toMatchObject({ to: "host@x.test", kind: "alert:backup" });
  });

  it("validate schedules and know the next run", async () => {
    const { validCron, saveSchedule, nextBackupAt, startBackupSchedule } = await import("@/lib/backupSchedule");
    expect(validCron("0 3 * * *")).toBe(true);
    expect(validCron("*/5 * * * * *")).toBe(false);
    expect(validCron("not cron")).toBe(false);
    saveSchedule({ enabled: true, cron: "0 3 * * *", keep: 7 });
    const next = nextBackupAt()!;
    expect(next).toBeGreaterThan(Date.now());
    expect(next - Date.now()).toBeLessThanOrEqual(86_400_000);
    saveSchedule({ enabled: false, cron: "0 3 * * *", keep: 7 });
    expect(nextBackupAt()).toBeNull();
    startBackupSchedule();
  });
});
