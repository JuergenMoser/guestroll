import { NextResponse } from "next/server";
import { setLogoVersion, toAdminEvent } from "@/lib/events";
import { apiError, rateLimited, requireEventAdmin } from "@/lib/http";
import { ImageQueueFullError, InvalidImageError, processLogo } from "@/lib/images/process";
import { BodyTooLargeError, readBodyCapped } from "@/lib/security/request";
import { deleteLogo, writeLogo } from "@/lib/storage/files";

type Context = RouteContext<"/api/admin/events/[id]/logo">;
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request, { params }: Context) {
  const { event, denied } = await requireEventAdmin(request, (await params).id);
  if (denied) return denied;

  let file: File | null;
  try {
    const body = await readBodyCapped(request, MAX_LOGO_BYTES + 64 * 1024);
    const form = await new Response(body, { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
    const value = form.get("logo");
    file = value instanceof File ? value : null;
  } catch (error) {
    return apiError(error instanceof BodyTooLargeError ? "too_large" : "bad_request");
  }
  if (!file || file.size === 0) return apiError("bad_request", { logo: "required" });

  try {
    await writeLogo(event.id, await processLogo(Buffer.from(await file.arrayBuffer())));
  } catch (error) {
    if (error instanceof InvalidImageError) return apiError("invalid_image");
    if (error instanceof ImageQueueFullError) return rateLimited(2_000);
    throw error;
  }
  return NextResponse.json({ event: toAdminEvent(setLogoVersion(event.id, Date.now())!) });
}

export async function DELETE(request: Request, { params }: Context) {
  const { event, denied } = await requireEventAdmin(request, (await params).id);
  if (denied) return denied;
  await deleteLogo(event.id);
  return NextResponse.json({ event: toAdminEvent(setLogoVersion(event.id, null)!) });
}
