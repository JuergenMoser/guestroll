import { Readable } from "node:stream";
import { track } from "@/lib/activity";
import { getViewer } from "@/lib/auth/viewer";
import { getEventById } from "@/lib/events";
import { apiError } from "@/lib/http";
import { getPhoto, incrementDownloads } from "@/lib/photos";
import { canViewPhoto, type PhotoVariant } from "@/lib/policy";
import { MIME, openPhotoStream } from "@/lib/storage/files";

const VARIANTS = new Set<PhotoVariant>(["thumb", "display", "original"]);

/**
 * The only way a photo leaves the server. Every request re-checks access, so a
 * copied URL is useless to someone without the guest or admin cookie, and the
 * full-resolution file is only served when the organiser allowed it.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/media/[photoId]">) {
  const { photoId } = await params;
  const url = new URL(request.url);
  const variant = (url.searchParams.get("v") ?? "display") as PhotoVariant;
  if (!VARIANTS.has(variant)) return apiError("bad_request");

  const photo = getPhoto(photoId);
  const event = photo && getEventById(photo.eventId);
  // Same answer for "doesn't exist" and "not yours": ids must not be probeable.
  if (!photo || !event) return apiError("not_found");

  const viewer = await getViewer();
  if (!canViewPhoto(event, photo, viewer, variant)) return apiError("not_found");

  const opened = await openPhotoStream(event.id, photo.id, variant);
  if (!opened) return apiError("not_found");

  const download = variant === "original" && url.searchParams.get("download") === "1";
  if (download) {
    incrementDownloads([photo.id]);
    track("download", event.id, viewer.guestId);
  }

  return new Response(Readable.toWeb(opened.stream) as ReadableStream, {
    headers: {
      "Content-Type": MIME[variant],
      "Content-Length": String(opened.size),
      // Private: a shared proxy or CDN must never keep a copy another visitor could get.
      "Cache-Control": variant === "original" ? "private, no-store" : "private, max-age=3600",
      "Content-Disposition": download ? `attachment; filename="${photo.id}.jpg"` : "inline",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
