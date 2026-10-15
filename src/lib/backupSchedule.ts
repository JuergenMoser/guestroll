import "server-only";
import fsp from "node:fs/promises";
import cron, { type ScheduledTask } from "node-cron";
import { BackupError, restoreBackup, writeBackupFile } from "@/lib/backup";
import { config } from "@/lib/config";
import { backupFailedMail } from "@/lib/mail/templates";
import { enqueueMail } from "@/lib/mail/outbox";
import { instanceRecipients } from "@/lib/mail/settings";
import { readSetting, writeSetting } from "@/lib/settings";
import { localDriver } from "@/lib/storage/local";
import { s3Driver } from "@/lib/storage/s3";
import type { StorageDriver } from "@/lib/storage/driver";
import { backgroundBaseUrl } from "@/lib/urls";
import { notify } from "@/lib/webhooks/queue";

/**
 * Backups on a schedule (node-cron), to a folder or an S3 bucket kept apart
 * from the photos, the oldest removed beyond `keep`. The environment
 * (BACKUP_CRON…) wins over the admin's settings, like SMTP.
 */

export interface BackupSchedule {
  enabled: boolean;
  cron: string;
  keep: number;
}

export interface BackupRun {
  at: number;
  ok: boolean;
  name?: string;
  bytes?: number;
  error?: string;
}

const KEY = "backup_schedule";
const LAST = "backup_last_run";
const NAME = /^guestroll-backup-[0-9-]+\.zip$/;

export const scheduleFromEnv = () => Boolean(config.backup.cron);

export function getSchedule(): BackupSchedule {
  if (config.backup.cron) return { enabled: true, cron: config.backup.cron, keep: config.backup.keep };
  try {
    const saved = JSON.parse(readSetting(KEY) ?? "null") as Partial<BackupSchedule> | null;
    return { enabled: saved?.enabled === true, cron: saved?.cron || "0 3 * * *", keep: saved?.keep ?? 7 };
  } catch {
    return { enabled: false, cron: "0 3 * * *", keep: 7 };
  }
}

export function validCron(expression: string): boolean {
  // Five fields only: a seconds field would allow a backup every second.
  return expression.trim().split(/\s+/).length === 5 && cron.validate(expression);
}

export function saveSchedule(schedule: BackupSchedule): void {
  writeSetting(KEY, JSON.stringify(schedule));
  startBackupSchedule();
}

export const lastRun = (): BackupRun | null => {
  try {
    return JSON.parse(readSetting(LAST) ?? "null");
  } catch {
    return null;
  }
};

/** Where scheduled backups go. */
export function backupTarget(): StorageDriver {
  const s3 = config.backup.s3;
  return s3.bucket ? s3Driver(s3) : localDriver(config.backup.dir);
}

export const targetDescription = () =>
  config.backup.s3.bucket ? `s3://${config.backup.s3.bucket}${config.backup.s3.prefix ? `/${config.backup.s3.prefix}` : ""}` : config.backup.dir;

export async function listStoredBackups(): Promise<{ name: string; bytes: number }[]> {
  const out: { name: string; bytes: number }[] = [];
  try {
    for await (const item of backupTarget().list()) if (NAME.test(item.key)) out.push({ name: item.key, bytes: item.size });
  } catch {
    return [];
  }
  // Names carry the date: newest first.
  return out.sort((a, b) => b.name.localeCompare(a.name));
}

const globalForRun = globalThis as unknown as { guestrollBackupRunning?: boolean; guestrollBackupTask?: ScheduledTask };

/** Makes one backup now, sends it to the target, then keeps only the newest `keep`. */
export async function runBackup(reason: "scheduled" | "manual" | "before-update" = "manual"): Promise<BackupRun> {
  if (globalForRun.guestrollBackupRunning) throw new BackupError("A backup is already running");
  globalForRun.guestrollBackupRunning = true;
  let file: string | null = null;
  try {
    const written = await writeBackupFile();
    file = written.file;
    const { size } = await fsp.stat(file);
    await backupTarget().putFile(written.name, file, "application/zip");
    const keep = getSchedule().keep;
    for (const old of (await listStoredBackups()).slice(keep)) await backupTarget().delete(old.name);
    const run: BackupRun = { at: Date.now(), ok: true, name: written.name, bytes: size };
    writeSetting(LAST, JSON.stringify(run));
    return run;
  } catch (error) {
    const message = (error as Error).message.slice(0, 300);
    const run: BackupRun = { at: Date.now(), ok: false, error: message };
    writeSetting(LAST, JSON.stringify(run));
    alertFailure(message, reason);
    throw error;
  } finally {
    globalForRun.guestrollBackupRunning = false;
    if (file) await fsp.rm(file, { force: true });
  }
}

function alertFailure(error: string, reason: string) {
  const url = `${backgroundBaseUrl()}/admin/settings`;
  const mail = backupFailedMail({ app: config.appName, locale: config.locale, url, error });
  const day = Math.floor(Date.now() / 86_400_000);
  for (const to of instanceRecipients()) enqueueMail({ to, mail, kind: "alert:backup", dedupeKey: `backup-failed:${day}:${to}` });
  notify({ kind: "backup_failed", title: mail.subject, message: error, url, data: { reason } }, `backup-failed:${day}`);
}

/** Restores one of the stored backups (fetched to a temporary file first, for S3). */
export async function restoreStoredBackup(name: string) {
  if (!NAME.test(name)) throw new BackupError("Unknown backup");
  const opened = await backupTarget().open(name);
  if (!opened) throw new BackupError("Unknown backup");
  const { saveUpload } = await import("@/lib/backup");
  const { Readable } = await import("node:stream");
  const file = await saveUpload(Readable.toWeb(opened.stream) as ReadableStream<Uint8Array>);
  return restoreBackup(file);
}

/** (Re)starts the schedule: at boot, and whenever the admin changes it. */
export function startBackupSchedule(): void {
  void globalForRun.guestrollBackupTask?.stop();
  globalForRun.guestrollBackupTask = undefined;
  const schedule = getSchedule();
  if (!schedule.enabled || !validCron(schedule.cron)) return;
  globalForRun.guestrollBackupTask = cron.schedule(
    schedule.cron,
    () =>
      runBackup("scheduled").catch((error) => {
        console.error("[backup]", (error as Error).message);
      }),
    { name: "guestroll-backup", timezone: config.timeZone, noOverlap: true },
  );
}

export function nextBackupAt(): number | null {
  return globalForRun.guestrollBackupTask?.getNextRun()?.getTime() ?? null;
}
