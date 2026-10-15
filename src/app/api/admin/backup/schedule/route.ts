import { NextResponse } from "next/server";
import { getSchedule, nextBackupAt, saveSchedule, scheduleFromEnv, validCron } from "@/lib/backupSchedule";
import { apiError, readJson, requireAdmin } from "@/lib/http";

/** `{ enabled, cron, keep }`. Refused when BACKUP_CRON sets it from the environment. */
export async function PUT(request: Request) {
  const { denied } = await requireAdmin(request, { owner: true });
  if (denied) return denied;
  if (scheduleFromEnv()) return apiError("forbidden", { schedule: "managed_by_env" });
  const body = (await readJson(request)) as { enabled?: unknown; cron?: unknown; keep?: unknown } | undefined;
  const cron = typeof body?.cron === "string" ? body.cron.trim() : "";
  const keep = body?.keep;
  const errors: Record<string, string> = {};
  if (!validCron(cron)) errors.cron = "invalid";
  if (typeof keep !== "number" || !Number.isInteger(keep) || keep < 1 || keep > 365) errors.keep = "invalid";
  if (Object.keys(errors).length) return apiError("bad_request", errors);
  saveSchedule({ enabled: body?.enabled === true, cron, keep: keep as number });
  return NextResponse.json({ schedule: getSchedule(), nextRun: nextBackupAt() });
}
