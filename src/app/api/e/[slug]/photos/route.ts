import { NextResponse } from "next/server";
import { track } from "@/lib/activity";
import { ensureGuestId, getGuestSession } from "@/lib/auth/session";
import { getViewer } from "@/lib/auth/viewer";
import { config } from "@/lib/config";
import { getEventBySlug } from "@/lib/events";
import { apiError, rateLimited } from "@/lib/http";
import { InvalidImageError, processPhoto } from "@/lib/images/process";
import { countGuestPhotos, insertPhoto, listPhotos, toPhotoDto } from "@/lib/photos";
import { canEnterEvent, uploadState } from "@/lib/policy";
import { newId } from "@/lib/security/ids";
import { limiters } from "@/lib/security/limiters";
import { isSameOrigin } from "@/lib/security/request";
import { deletePhotoFiles, writePhotoFiles } from "@/lib/storage/files";

// Multipart framing around a single file stays far below this.
const MULTIPART_OVERHEAD = 64 * 1024;

export async function GET(request: Request, { params }: RouteContext<"/api/e/[slug]/photos">) {
  const event = getEventBySlug((await params).slug);
  if (!event) return apiError("not_found");
  const viewer = await getViewer();
  if (!canEnterEvent(event, viewer)) return apiError("forbidden");

  const before = Number(new URL(request.url).searchParams.get("before")) || undefined;
  const rows = listPhotos(event, viewer, { before, limit: 48 });
  return NextResponse.json(
    { photos: rows.map((p) => toPhotoDto(p, viewer)), nextCursor: rows.length === 48 ? rows[rows.length - 1].createdAt : null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: Request, { params }: RouteContext<"/api/e/[slug]/photos">) {
  if (!isSameOrigin(request)) return apiError("forbidden");
  const event = getEventBySlug((await params).slug);
  if (!event) return apiError("not_found");

  // Refuse oversized bodies before reading them into memory.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > config.maxUploadBytes + MULTIPART_OVERHEAD) return apiError("too_large");

  const session = await getGuestSession();
  const guestId = ensureGuestId(session);
  const viewer = await getViewer();
  const viewerWithId = { ...viewer, guestId };

  const state = uploadState(event, viewerWithId, countGuestPhotos(event.id, guestId));
  if (!state.open) {
    return apiError(state.reason === "locked" ? "forbidden" : state.reason === "quota" ? "quota_reached" : "uploads_closed");
  }

  const limit = limiters.upload.consume(guestId);
  if (!limit.allowed) return rateLimited(limit.retryAfterMs);

  let file: File | null = null;
  try {
    const form = await request.formData();
    const value = form.get("photo");
    file = value instanceof File ? value : null;
  } catch {
    return apiError("bad_request");
  }
  if (!file || file.size === 0) return apiError("bad_request", { photo: "required" });
  if (file.size > config.maxUploadBytes) return apiError("too_large");

  let processed;
  try {
    processed = await processPhoto(Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    if (error instanceof InvalidImageError) return apiError("invalid_image");
    throw error;
  }

  const id = newId();
  await writePhotoFiles(event.id, id, processed.files);
  try {
    const photo = insertPhoto({
      id,
      eventId: event.id,
      guestId,
      guestName: event.askGuestName ? (session.name ?? null) : null,
      width: processed.width,
      height: processed.height,
      bytes: processed.files.original.length,
      status: event.moderation === "pre" ? "pending" : "visible",
    });
    await session.save();
    track("upload", event.id, guestId);
    return NextResponse.json({ photo: toPhotoDto(photo, viewerWithId) }, { status: 201 });
  } catch (error) {
    // Don't leave orphan files behind when the row can't be written (event deleted meanwhile).
    await deletePhotoFiles(event.id, id);
    throw error;
  }
}
