import { NextResponse } from "next/server";
import { BackupError } from "@/lib/backup";
import { runBackup } from "@/lib/backupSchedule";
import { apiError, readJson, requireAdmin } from "@/lib/http";
import { availableUpdate, VERSION_PATTERN } from "@/lib/updates";
import { startUpdate, updaterConfigured } from "@/lib/updater";

/**
 * Installs the available version: a full backup first (the update stops if it
 * fails, unless `skipBackup`), then the updater replaces this very container.
 * The page then waits for the new version to answer.
 */
export async function POST(request: Request) {
  const { denied } = await requireAdmin(request, { owner: true });
  if (denied) return denied;
  if (!updaterConfigured()) return apiError("bad_request", { updater: "not_configured" });
  const body = (await readJson(request)) as { version?: unknown; skipBackup?: unknown } | undefined;
  const available = availableUpdate();
  // Only the version GitHub announced: the request can't name an arbitrary tag.
  if (!available || body?.version !== available.version || !VERSION_PATTERN.test(available.version)) return apiError("bad_request", { version: "not_available" });

  let backup: string | null = null;
  if (body?.skipBackup !== true) {
    try {
      backup = (await runBackup("before-update")).name ?? null;
    } catch (error) {
      const message = (error as Error).message.slice(0, 300);
      return NextResponse.json({ error: "backup_failed", message }, { status: error instanceof BackupError ? 409 : 502 });
    }
  }
  try {
    const job = await startUpdate(available.version);
    return NextResponse.json({ job, backup }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: "updater_failed", message: (error as Error).message.slice(0, 300), backup }, { status: 502 });
  }
}
