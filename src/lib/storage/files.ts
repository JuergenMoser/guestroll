import "server-only";
import type { PhotoVariant } from "@/lib/policy";
import { storage } from "./index";

/**
 * Layout, whatever the driver: `<eventId>/<photoId>.<variant>.<ext>` and
 * `<eventId>/logo.png`. Files never sit under `public/` or in a public bucket:
 * every byte leaves through a route that checks access first.
 */

const EXT: Record<PhotoVariant, string> = { original: "jpg", display: "webp", thumb: "webp" };
export const MIME: Record<PhotoVariant, string> = { original: "image/jpeg", display: "image/webp", thumb: "image/webp" };
const VARIANTS: PhotoVariant[] = ["original", "display", "thumb"];

// Ids are UUIDs we generate; the check is defence in depth against path traversal.
const SAFE_ID = /^[0-9a-f-]{36}$/;

function checkIds(...ids: string[]) {
  for (const id of ids) if (!SAFE_ID.test(id)) throw new Error("Invalid storage id");
}

export function photoKey(eventId: string, photoId: string, variant: PhotoVariant): string {
  checkIds(eventId, photoId);
  return `${eventId}/${photoId}.${variant}.${EXT[variant]}`;
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

export async function deletePhotoFiles(eventId: string, photoId: string): Promise<void> {
  await Promise.all(VARIANTS.map((v) => storage().delete(photoKey(eventId, photoId, v))));
}

export async function deleteEventFiles(eventId: string): Promise<void> {
  checkIds(eventId);
  await storage().deletePrefix(eventId);
}

export const openPhotoStream = (eventId: string, photoId: string, variant: PhotoVariant) => storage().open(photoKey(eventId, photoId, variant));
