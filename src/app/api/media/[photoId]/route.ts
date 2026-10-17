import { Readable } from "node:stream";
import { track } from "@/lib/activity";
import { getViewer } from "@/lib/auth/viewer";
import { getEventById } from "@/lib/events";
import { apiError } from "@/lib/http";
import { getPhoto, incrementDownloads } from "@/lib/photos";
import { canViewPhoto, type MediaAccess, type PhotoVariant } from "@/lib/policy";
import { parseRange } from "@/lib/range";
import { fileExt, fileMime, openPhotoStream } from "@/lib/storage/files";

// `play` is the video's original file, granted by its own rule (see `MediaAccess`).
const VARIANTS = new Set<string>(["thumb", "display", "original", "play"] satisfies MediaAccess[]);

/**
 * The only way a photo leaves the server. Every request re-checks access, so a
 * copied URL is useless to someone without the guest or admin cookie, and the
 * full-resolution file is only served when the organiser allowed it.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/media/[photoId]">) {
  const { photoId } = await params;
  const url = new URL(request.url);
  const asked = url.searchParams.get("v") ?? "display";
  if (!VARIANTS.has(asked)) return apiError("bad_request");

  const photo = getPhoto(photoId);
  const event = photo && getEventById(photo.eventId);
  // Same answer for "doesn't exist" and "not yours": ids must not be probeable.
  if (!photo || !event) return apiError("not_found");

  const viewer = await getViewer();
  if (!canViewPhoto(event, photo, viewer, asked as MediaAccess)) return apiError("not_found");
  const variant: PhotoVariant = asked === "play" ? "original" : (asked as PhotoVariant);

  // Only originals have a known size (`bytes`); the small copies are always sent whole.
  const range = variant === "original" ? parseRange(request.headers.get("range"), photo.bytes) : null;
  if (range === "unsatisfiable") return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${photo.bytes}` } });

  const opened = await openPhotoStream(event.id, photo.id, variant, photo.mediaType, range ?? undefined);
  if (!opened) return apiError("not_found");

  const download = asked === "original" && url.searchParams.get("download") === "1";
  // A video player fetches a download in pieces: count the first one only.
  if (download && (!range || range.start === 0)) {
    incrementDownloads([photo.id]);
    track("download", event.id, viewer.guestId);
  }

  return new Response(Readable.toWeb(opened.stream) as ReadableStream, {
    status: range ? 206 : 200,
    headers: {
      "Content-Type": fileMime(variant, photo.mediaType),
      "Content-Length": String(opened.size),
      ...(variant === "original" ? { "Accept-Ranges": "bytes" } : {}),
      ...(range ? { "Content-Range": `bytes ${range.start}-${range.end}/${photo.bytes}` } : {}),
      // Private: a shared proxy or CDN must never keep a copy another visitor could get.
      "Cache-Control": variant === "original" ? "private, no-store" : "private, max-age=3600",
      "Content-Disposition": download ? `attachment; filename="${photo.id}.${fileExt(variant, photo.mediaType)}"` : "inline",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
