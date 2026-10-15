import { NextResponse } from "next/server";
import { BackupError } from "@/lib/backup";
import { runBackup } from "@/lib/backupSchedule";
import { apiError, requireAdmin } from "@/lib/http";

/** A backup now, to the scheduled backups' destination. Waits for it: the admin sees the result. */
export async function POST(request: Request) {
  const { denied } = await requireAdmin(request, { owner: true });
  if (denied) return denied;
  try {
    return NextResponse.json({ run: await runBackup("manual") });
  } catch (error) {
    const message = (error as Error).message.slice(0, 300);
    return error instanceof BackupError ? apiError("bad_request", { backup: message }) : NextResponse.json({ error: "backup_failed", message }, { status: 502 });
  }
}
