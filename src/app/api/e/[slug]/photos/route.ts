import { NextResponse } from "next/server";
import { track } from "@/lib/activity";
import { ensureGuestId, getGuestSession } from "@/lib/auth/session";
import { getViewer } from "@/lib/auth/viewer";
import { config } from "@/lib/config";
import { getEventBySlug } from "@/lib/events";
import { apiError, rateLimited } from "@/lib/http";
import { ImageQueueFullError, InvalidImageError, processPhoto, type ProcessedPhoto } from "@/lib/images/process";
import {
  countGuestPhotos,
  insertPhoto,
  listPhotos,
  toPhotoDto,
} from "@/lib/photos";
import { canEnterEvent, uploadState, type Viewer } from "@/lib/policy";
import { readChallenges } from "@/lib/challenges";
import type { EventRow } from "@/lib/db/schema";
import { newId } from "@/lib/security/ids";
import { limiters, uploadLocks, uploadMemory } from "@/lib/security/limiters";
import {
  BodyTooLargeError,
  clientIp,
  isSameOrigin,
  readBodyCapped,
  ServerBusyError,
  type MemoryHold,
} from "@/lib/security/request";
import { storageFull } from "@/lib/storage";
import { deletePhotoFiles, writePhotoFiles } from "@/lib/storage/files";

// Multipart framing around a single file stays far below this.
const MULTIPART_OVERHEAD = 64 * 1024;

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/e/[slug]/photos">,
) {
  const event = getEventBySlug((await params).slug);
  if (!event) return apiError("not_found");
  const viewer = await getViewer();
  if (!canEnterEvent(event, viewer)) return apiError("forbidden");

  // Guest endpoint: own photos only, admin or not (admins list through /api/admin).
  const asGuest = { ...viewer, admin: undefined };
  const before =
    Number(new URL(request.url).searchParams.get("before")) || undefined;
  const rows = listPhotos(event, asGuest, { before, limit: 48 });
  return NextResponse.json(
    {
      photos: rows.map((p) => toPhotoDto(p, asGuest)),
      nextCursor: rows.length === 48 ? rows[rows.length - 1].createdAt : null,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/e/[slug]/photos">,
) {
  if (!isSameOrigin(request)) return apiError("forbidden");
  const event = getEventBySlug((await params).slug);
  if (!event) return apiError("not_found");

  const session = await getGuestSession();
  const isNewGuest = !session.guestId;
  const guestId = ensureGuestId(session);
  // Persist the id now: early returns below must not leave the browser without one.
  if (isNewGuest) await session.save();
  const viewer = { ...(await getViewer()), guestId };

  if (uploadLocks.has(guestId)) return rateLimited(1_000);
  uploadLocks.add(guestId);
  try {
    const state = uploadState(
      event,
      viewer,
      countGuestPhotos(event.id, guestId),
    );
    if (!state.open) {
      return apiError(
        state.reason === "locked"
          ? "forbidden"
          : state.reason === "quota"
            ? "quota_reached"
            : "uploads_closed",
      );
    }

    const limit = limiters.upload.consume(guestId);
    if (!limit.allowed) return rateLimited(limit.retryAfterMs);
    const ip = clientIp(request);
    for (const check of [
      limiters.uploadPerEvent.consume(event.id),
      ip === "direct" ? null : limiters.uploadPerIp.consume(ip),
    ]) {
      if (check && !check.allowed) return rateLimited(check.retryAfterMs);
    }
    if (await storageFull()) return apiError("storage_full");

    const hold = uploadMemory.hold();
    try {
      return await receive(request, event, guestId, session, viewer, hold);
    } finally {
      hold.release();
    }
  } finally {
    uploadLocks.delete(guestId);
  }
}

async function receive(
  request: Request,
  event: EventRow,
  guestId: string,
  session: Awaited<ReturnType<typeof getGuestSession>>,
  viewer: Viewer,
  hold: MemoryHold,
) {
  let file: File | null = null;
  let challengeId: string | null = null;
  try {
    const body = await readBodyCapped(
      request,
      config.maxUploadBytes + MULTIPART_OVERHEAD,
      hold,
    );
    const form = await new Response(body, {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData();
    const value = form.get("photo");
    file = value instanceof File ? value : null;
    const picked = form.get("challenge");
    // An unknown or removed challenge is dropped, not an error: the photo matters more than its tag.
    challengeId = readChallenges(event.challenges).some((c) => c.id === picked)
      ? (picked as string)
      : null;
  } catch (error) {
    if (error instanceof ServerBusyError) return rateLimited(2_000);
    return apiError(
      error instanceof BodyTooLargeError ? "too_large" : "bad_request",
    );
  }
  if (!file || file.size === 0)
    return apiError("bad_request", { photo: "required" });
  if (file.size > config.maxUploadBytes) return apiError("too_large");

  let processed;
  try {
    processed = await processPhoto(Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    if (error instanceof InvalidImageError) return apiError("invalid_image");
    // The guest's queue retries on its own: busy, not broken.
    if (error instanceof ImageQueueFullError) return rateLimited(2_000);
    throw error;
  }

  return await store(event, guestId, session, viewer, processed, challengeId);
}

async function store(
  event: EventRow,
  guestId: string,
  session: Awaited<ReturnType<typeof getGuestSession>>,
  viewer: Viewer,
  processed: ProcessedPhoto,
  challengeId: string | null,
) {
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
      challengeId,
    });
    track("upload", event.id, guestId);
    return NextResponse.json(
      { photo: toPhotoDto(photo, viewer) },
      { status: 201 },
    );
  } catch (error) {
    // Don't leave orphan files behind when the row can't be written (event deleted meanwhile).
    await deletePhotoFiles(event.id, id);
    throw error;
  }
}
