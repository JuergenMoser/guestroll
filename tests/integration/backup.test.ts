import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import archiver from "archiver";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshEnv } from "../helpers/env";

let env: Awaited<ReturnType<typeof freshEnv>>;
beforeEach(async () => (env = await freshEnv({ SESSION_SECRET: "" })));
afterEach(() => env.cleanup());

async function download(dir: string): Promise<string> {
  const { backupResponse } = await import("@/lib/backup");
  const res = await backupResponse();
  const file = path.join(dir, `backup-${Date.now()}.zip`);
  await pipeline(Readable.fromWeb(res.body as import("node:stream/web").ReadableStream), fs.createWriteStream(file));
  return file;
}

async function zipOf(dir: string, files: Record<string, string>): Promise<string> {
  const file = path.join(dir, `crafted-${Date.now()}.zip`);
  const zip = archiver("zip");
  const out = fs.createWriteStream(file);
  zip.pipe(out);
  for (const [name, body] of Object.entries(files)) zip.append(body, { name });
  await zip.finalize();
  await new Promise<void>((resolve) => out.on("close", () => resolve()));
  return file;
}

describe("backup and restore", () => {
  it("round-trips the database and every stored file", async () => {
    const events = await import("@/lib/events");
    const files = await import("@/lib/storage/files");
    const { storage } = await import("@/lib/storage");
    const kept = events.createEvent({ name: "Kept" });
    await files.writePhotoFiles(kept.id, "00000000-0000-0000-0000-000000000001", { original: Buffer.from("o"), display: Buffer.from("d"), thumb: Buffer.from("t") });
    await files.writeLogo(kept.id, Buffer.from("logo"));
    const backup = await download(env.dir);

    // Things change after the backup…
    const later = events.createEvent({ name: "Later" });
    await files.writeLogo(later.id, Buffer.from("later"));
    await events.deleteEvent(kept.id);

    // …and the restore brings the instance back to the backup.
    const { restoreBackup } = await import("@/lib/backup");
    const manifest = await restoreBackup(backup);
    expect(manifest).toMatchObject({ app: "guestroll", files: 4, storage: "local" });
    const { getEventById } = await import("@/lib/events");
    expect(getEventById(kept.id)?.name).toBe("Kept");
    expect(getEventById(later.id)).toBeUndefined();
    expect((await files.readLogo(kept.id))?.toString()).toBe("logo");
    expect(await storage().read(`${later.id}/logo.png`)).toBeNull();
    expect(fs.existsSync(backup)).toBe(false);
  });

  it("refuses archives that aren't Guestroll backups, without touching anything", async () => {
    const events = await import("@/lib/events");
    const { restoreBackup, BackupError } = await import("@/lib/backup");
    const event = events.createEvent({ name: "Untouched" });
    const notOurs = await zipOf(env.dir, { "manifest.json": JSON.stringify({ app: "other" }), "guestroll.db": "x" });
    await expect(restoreBackup(notOurs)).rejects.toBeInstanceOf(BackupError);
    const sneaky = await zipOf(env.dir, { "manifest.json": JSON.stringify({ app: "guestroll" }), "guestroll.db": "x", "uploads/../../etc/passwd": "x" });
    await expect(restoreBackup(sneaky)).rejects.toThrow(/Unexpected file|invalid relative path/);
    const damaged = await zipOf(env.dir, { "manifest.json": JSON.stringify({ app: "guestroll" }), "guestroll.db": "not sqlite at all" });
    await expect(restoreBackup(damaged)).rejects.toThrow(/damaged/);
    expect((await import("@/lib/events")).getEventById(event.id)?.name).toBe("Untouched");
  });

  it("carries the generated session secret, so sealed settings still open", async () => {
    const { seal, open } = await import("@/lib/crypto/secretBox");
    const { writeSetting, readSetting } = await import("@/lib/settings");
    writeSetting("probe", seal("still readable"));
    const backup = await download(env.dir);
    fs.writeFileSync(path.join(env.dir, ".session-secret"), "another-secret-of-at-least-thirty-two-characters");
    (await import("@/lib/auth/secret")).forgetSessionSecret();
    const { restoreBackup } = await import("@/lib/backup");
    await restoreBackup(backup);
    expect(open(readSetting("probe")!)).toBe("still readable");
  });
});

describe("retention", () => {
  it("warns a week before, then deletes ended events; open-ended ones stay", async () => {
    vi.stubEnv("ADMIN_EMAIL", "host@x.test");
    const events = await import("@/lib/events");
    const { endEvent } = await import("@/lib/mail/automation");
    const { runRetention, saveRetentionDays, purgeDate } = await import("@/lib/retention");
    const DAY = 86_400_000;
    const t0 = Date.UTC(2026, 9, 1);
    const ended = events.createEvent({ name: "Ended" });
    endEvent(ended, t0);
    const open = events.createEvent({ name: "Open" });

    expect(await runRetention(t0 + 100 * DAY)).toEqual({ warned: 0, purged: 0 });
    saveRetentionDays(30);
    expect(purgeDate(events.getEventById(ended.id)!)).toBe(t0 + 30 * DAY);
    expect(await runRetention(t0 + 20 * DAY)).toEqual({ warned: 0, purged: 0 });
    expect((await runRetention(t0 + 24 * DAY)).warned).toBe(1);
    expect((await runRetention(t0 + 25 * DAY)).warned).toBe(0);
    expect(await runRetention(t0 + 30 * DAY)).toEqual({ warned: 0, purged: 1 });
    expect(events.getEventById(ended.id)).toBeUndefined();
    expect(events.getEventById(open.id)).toBeDefined();
  });
});
