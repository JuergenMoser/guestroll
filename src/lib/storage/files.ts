import "server-only";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { config } from "@/lib/config";
import type { PhotoVariant } from "@/lib/policy";

/**
 * Layout on disk: `uploads/<eventId>/<photoId>.<variant>.<ext>`.
 * The folder lives outside `public/`, so no file is ever served without going
 * through the access check in `/api/media`.
 */

const EXT: Record<PhotoVariant, string> = { original: "jpg", display: "webp", thumb: "webp" };
export const MIME: Record<PhotoVariant, string> = { original: "image/jpeg", display: "image/webp", thumb: "image/webp" };

// Ids are UUIDs we generate; the check is defence in depth against path traversal.
const SAFE_ID = /^[0-9a-f-]{36}$/;

export function photoPath(eventId: string, photoId: string, variant: PhotoVariant): string {
  if (!SAFE_ID.test(eventId) || !SAFE_ID.test(photoId)) throw new Error("Invalid storage id");
  return path.join(/*turbopackIgnore: true*/ config.uploadsDir, eventId, `${photoId}.${variant}.${EXT[variant]}`);
}

export function logoPath(eventId: string): string {
  if (!SAFE_ID.test(eventId)) throw new Error("Invalid storage id");
  return path.join(/*turbopackIgnore: true*/ config.uploadsDir, eventId, "logo.png");
}

export async function writeLogo(eventId: string, png: Buffer): Promise<void> {
  await fsp.mkdir(path.dirname(logoPath(eventId)), { recursive: true });
  await fsp.writeFile(logoPath(eventId), png, { mode: 0o640 });
}

export async function readLogo(eventId: string): Promise<Buffer | null> {
  return fsp.readFile(/*turbopackIgnore: true*/ logoPath(eventId)).catch(() => null);
}

export async function deleteLogo(eventId: string): Promise<void> {
  await fsp.rm(logoPath(eventId), { force: true });
}

export async function writePhotoFiles(eventId: string, photoId: string, files: Record<PhotoVariant, Buffer>): Promise<void> {
  await fsp.mkdir(path.join(config.uploadsDir, eventId), { recursive: true });
  await Promise.all(
    (Object.keys(files) as PhotoVariant[]).map((variant) =>
      fsp.writeFile(photoPath(eventId, photoId, variant), files[variant], { mode: 0o640 }),
    ),
  );
}

export async function deletePhotoFiles(eventId: string, photoId: string): Promise<void> {
  await Promise.all(
    (["original", "display", "thumb"] as const).map((variant) =>
      fsp.rm(photoPath(eventId, photoId, variant), { force: true }),
    ),
  );
}

export async function deleteEventFiles(eventId: string): Promise<void> {
  if (!SAFE_ID.test(eventId)) throw new Error("Invalid storage id");
  await fsp.rm(path.join(config.uploadsDir, eventId), { recursive: true, force: true });
}

export function openPhotoStream(eventId: string, photoId: string, variant: PhotoVariant) {
  const file = photoPath(eventId, photoId, variant);
  const stat = fs.statSync(/*turbopackIgnore: true*/ file, { throwIfNoEntry: false });
  if (!stat) return null;
  return { stream: fs.createReadStream(/*turbopackIgnore: true*/ file), size: stat.size, file };
}
