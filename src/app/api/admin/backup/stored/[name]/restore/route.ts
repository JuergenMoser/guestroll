import { NextResponse } from "next/server";
import { BackupError } from "@/lib/backup";
import { restoreStoredBackup } from "@/lib/backupSchedule";
import { apiError, requireAdmin } from "@/lib/http";

/** Puts the instance back to one of the stored backups. Accounts come from it: sign in again after. */
export async function POST(request: Request, { params }: RouteContext<"/api/admin/backup/stored/[name]/restore">) {
  const { denied } = await requireAdmin(request, { owner: true, notInDemo: true });
  if (denied) return denied;
  try {
    return NextResponse.json({ ok: true, manifest: await restoreStoredBackup((await params).name) });
  } catch (error) {
    if (error instanceof BackupError) return apiError("bad_request", { file: error.message });
    throw error;
  }
}
