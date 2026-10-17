import "server-only";
import type { PhotoRow } from "@/lib/db/schema";
import type { PhotoVariant } from "@/lib/policy";
import type { ByteRange } from "./driver";
import { storage } from "./index";

/**
 * Layout, whatever the driver: `<eventId>/<photoId>.<variant>.<ext>` and
 * `<eventId>/logo.png`. Files never sit under `public/` or in a public bucket:
 * every byte leaves through a route that checks access first.
 *
 * A video's `original` is the video as filmed (`.mp4`, `.mov`, `.webm`); its
 * `display` and `thumb` are its poster frame, so every grid stays an image grid.
 */

export type MediaType = PhotoRow["mediaType"];

const EXT: Record<PhotoVariant, string> = { original: "jpg", display: "webp", thumb: "webp" };
const MIME: Record<PhotoVariant, string> = { original: "image/jpeg", display: "image/webp", thumb: "image/webp" };
const VIDEO_EXT: Record<NonNullable<MediaType>, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };
const VARIANTS: PhotoVariant[] = ["original", "display", "thumb"];

export const fileExt = (variant: PhotoVariant, mediaType: MediaType = null) => (variant === "original" && mediaType ? VIDEO_EXT[mediaType] : EXT[variant]);
export const fileMime = (variant: PhotoVariant, mediaType: MediaType = null) => (variant === "original" && mediaType ? mediaType : MIME[variant]);

// Ids are UUIDs we generate; the check is defence in depth against path traversal.
const SAFE_ID = /^[0-9a-f-]{36}$/;

function checkIds(...ids: string[]) {
  for (const id of ids) if (!SAFE_ID.test(id)) throw new Error("Invalid storage id");
}

export function photoKey(eventId: string, photoId: string, variant: PhotoVariant, mediaType: MediaType = null): string {
  checkIds(eventId, photoId);
  return `${eventId}/${photoId}.${variant}.${fileExt(variant, mediaType)}`;
}

export function logoKey(eventId: string): string {
  checkIds(eventId);
  return `${eventId}/logo.png`;
}

export const writeLogo = (eventId: string, png: Buffer) => storage().put(logoKey(eventId), png, "image/png");
export const readLogo = (eventId: string) => storage().read(logoKey(eventId));
export const deleteLogo = (eventId: string) => storage().delete(logoKey(eventId));

export async function writePhotoFiles(eventId: string, photoId: string, files: Record<PhotoVariant, Buffer>): Promise<void> {
  await Promise.all(VARIANTS.map((v) => storage().put(photoKey(eventId, photoId, v), files[v], MIME[v])));
}

/** The poster's `display` and `thumb`, and the video itself as `original`, from a file on disk. */
export async function writeVideoFiles(eventId: string, photoId: string, mediaType: NonNullable<MediaType>, poster: Record<"display" | "thumb", Buffer>, videoPath: string): Promise<void> {
  await Promise.all([
    storage().put(photoKey(eventId, photoId, "display"), poster.display, MIME.display),
    storage().put(photoKey(eventId, photoId, "thumb"), poster.thumb, MIME.thumb),
    storage().putFile(photoKey(eventId, photoId, "original", mediaType), videoPath, mediaType),
  ]);
}

/** Every original a photo or a video may have: the callers needn't know which it was. */
export async function deletePhotoFiles(eventId: string, photoId: string): Promise<void> {
  const keys = [...VARIANTS.map((v) => photoKey(eventId, photoId, v)), ...Object.keys(VIDEO_EXT).map((t) => photoKey(eventId, photoId, "original", t as MediaType))];
  await Promise.all(keys.map((key) => storage().delete(key)));
}

export async function deleteEventFiles(eventId: string): Promise<void> {
  checkIds(eventId);
  await storage().deletePrefix(eventId);
}

export const openPhotoStream = (eventId: string, photoId: string, variant: PhotoVariant, mediaType: MediaType = null, range?: ByteRange) =>
  storage().open(photoKey(eventId, photoId, variant, mediaType), range);
