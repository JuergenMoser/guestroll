import { NextResponse } from "next/server";
import { backupResponse } from "@/lib/backup";
import { requireAdmin } from "@/lib/http";
import { getRetentionDays } from "@/lib/retention";
import { storage } from "@/lib/storage";

/** `?download=1` streams the backup; otherwise what it would hold, for the settings page. */
export async function GET(request: Request) {
  const { denied } = await requireAdmin(request, { owner: true });
  if (denied) return denied;
  if (new URL(request.url).searchParams.get("download") === "1") return backupResponse();
  let files = 0;
  let bytes = 0;
  for await (const item of storage().list()) {
    if (item.key.startsWith(".")) continue;
    files++;
    bytes += item.size;
  }
  return NextResponse.json({ files, bytes, storage: storage().name, retentionDays: getRetentionDays() });
}
