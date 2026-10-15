import { NextResponse } from "next/server";
import { BackupError, restoreBackup, saveUpload } from "@/lib/backup";
import { apiError, requireAdmin } from "@/lib/http";

const globalForRestore = globalThis as unknown as { guestrollRestoring?: boolean };

/**
 * The raw ZIP as the body. Replaces the database and every file: whoever is
 * signed in is signed out, since accounts come from the backup.
 */
export async function POST(request: Request) {
  const { denied } = await requireAdmin(request, { owner: true });
  if (denied) return denied;
  if (!request.body) return apiError("bad_request", { file: "required" });
  if (globalForRestore.guestrollRestoring) return apiError("bad_request", { file: "busy" });
  globalForRestore.guestrollRestoring = true;
  try {
    const file = await saveUpload(request.body);
    const manifest = await restoreBackup(file);
    return NextResponse.json({ ok: true, manifest });
  } catch (error) {
    if (error instanceof BackupError) return apiError("bad_request", { file: error.message });
    console.error("[restore]", error);
    return apiError("bad_request", { file: "unreadable" });
  } finally {
    globalForRestore.guestrollRestoring = false;
  }
}
