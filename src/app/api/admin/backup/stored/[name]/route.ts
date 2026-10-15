import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { backupTarget } from "@/lib/backupSchedule";
import { apiError, requireAdmin } from "@/lib/http";

type Context = RouteContext<"/api/admin/backup/stored/[name]">;
const NAME = /^guestroll-backup-[0-9-]+\.zip$/;

export async function GET(request: Request, { params }: Context) {
  const { denied } = await requireAdmin(request, { owner: true });
  if (denied) return denied;
  const { name } = await params;
  if (!NAME.test(name)) return apiError("not_found");
  const opened = await backupTarget().open(name);
  if (!opened) return apiError("not_found");
  return new Response(Readable.toWeb(opened.stream) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(opened.size),
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function DELETE(request: Request, { params }: Context) {
  const { denied } = await requireAdmin(request, { owner: true });
  if (denied) return denied;
  const { name } = await params;
  if (!NAME.test(name)) return apiError("not_found");
  await backupTarget().delete(name);
  return NextResponse.json({ ok: true });
}
