import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { apiError, rateLimited, requireEventAdmin } from "@/lib/http";
import { ImageQueueFullError, InvalidImageError, processPhoto } from "@/lib/images/process";
import { insertPhoto, toPhotoDto } from "@/lib/photos";
import { newId } from "@/lib/security/ids";
import { BodyTooLargeError, readBodyCapped } from "@/lib/security/request";
import { deletePhotoFiles, writePhotoFiles } from "@/lib/storage/files";
import { parseGuestName } from "@/lib/validation";

/**
 * The hosts add photos themselves, typically the photographer's: one file per
 * request (the browser sends them in turn), published at once, outside guest
 * quotas and closing times, credited to `credit`.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/admin/events/[id]/photos/import">) {
  const { admin, event, denied } = await requireEventAdmin(request, (await params).id);
  if (denied) return denied;

  let file: File | null = null;
  let credit: string | null = null;
  try {
    const body = await readBodyCapped(request, config.maxUploadBytes + 64 * 1024);
    const form = await new Response(body, { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
    const value = form.get("photo");
    file = value instanceof File ? value : null;
    credit = parseGuestName(form.get("credit"));
  } catch (error) {
    return apiError(error instanceof BodyTooLargeError ? "too_large" : "bad_request");
  }
  if (!file || file.size === 0) return apiError("bad_request", { photo: "required" });

  let processed;
  try {
    processed = await processPhoto(Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    if (error instanceof InvalidImageError) return apiError("invalid_image");
    if (error instanceof ImageQueueFullError) return rateLimited(2_000);
    throw error;
  }

  const id = newId();
  await writePhotoFiles(event.id, id, processed.files);
  try {
    const photo = insertPhoto({
      id,
      eventId: event.id,
      // One pseudo-guest per admin account: their imports group together in stats and the ZIP names.
      guestId: `host:${admin.id}`,
      guestName: credit || admin.name || null,
      width: processed.width,
      height: processed.height,
      bytes: processed.files.original.length,
      status: "visible",
    });
    return NextResponse.json({ photo: toPhotoDto(photo, { admin: admin.scope }) }, { status: 201 });
  } catch (error) {
    await deletePhotoFiles(event.id, id);
    throw error;
  }
}
