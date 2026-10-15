import "server-only";
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";
import { config } from "@/lib/config";
import type { PhotoVariant } from "@/lib/policy";

const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/avif", "image/gif"]);

export class InvalidImageError extends Error {}

export interface ProcessedPhoto {
  files: Record<PhotoVariant, Buffer>;
  width: number;
  height: number;
}

// The prebuilt sharp binaries can't decode HEVC-based HEIC (patent licensing),
// so iPhone photos that reach the server untouched go through a WASM decoder first.
async function heicToJpeg(input: Buffer): Promise<Buffer> {
  const { default: convert } = await import("heic-convert");
  const output = await convert({ buffer: input, format: "JPEG", quality: 0.92 });
  return Buffer.from(output);
}

/**
 * Trusts the bytes, never the client's filename or Content-Type. Every variant
 * is re-encoded, which drops EXIF — GPS position and device serials included —
 * and neutralises anything smuggled after the image data.
 */
export async function processPhoto(input: Buffer): Promise<ProcessedPhoto> {
  const type = await fileTypeFromBuffer(input);
  if (!type || !ACCEPTED.has(type.mime)) throw new InvalidImageError("Unsupported file type");

  const source = type.mime === "image/heic" || type.mime === "image/heif" ? await heicToJpeg(input) : input;

  let base: ReturnType<typeof sharp>;
  try {
    base = sharp(source, { limitInputPixels: config.maxImagePixels, animated: false }).rotate();
    const meta = await base.metadata();
    if (!meta.width || !meta.height) throw new Error("no dimensions");
  } catch {
    throw new InvalidImageError("Unreadable image");
  }

  const original = await base.clone().jpeg({ quality: 92, mozjpeg: true }).toBuffer({ resolveWithObject: true });
  const [display, thumb] = await Promise.all([
    base.clone().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(),
    base.clone().resize({ width: 480, height: 480, fit: "cover", position: "attention" }).webp({ quality: 72 }).toBuffer(),
  ]);

  return {
    files: { original: original.data, display, thumb },
    width: original.info.width,
    height: original.info.height,
  };
}

/**
 * Event logos: any raster image, trimmed of empty borders and fitted into a
 * transparent 512 px square. SVG is refused on purpose: it can carry scripts
 * and external references, and the logo ends up inside downloadable files.
 */
export async function processLogo(input: Buffer): Promise<Buffer> {
  const type = await fileTypeFromBuffer(input);
  if (!type || !ACCEPTED.has(type.mime)) throw new InvalidImageError("Unsupported file type");
  const source = type.mime === "image/heic" || type.mime === "image/heif" ? await heicToJpeg(input) : input;
  try {
    return await sharp(source, { limitInputPixels: config.maxImagePixels, animated: false })
      .rotate()
      .trim()
      .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  } catch {
    throw new InvalidImageError("Unreadable image");
  }
}
