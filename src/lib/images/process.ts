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
// Its size is read from the header and checked before decoding: the decoder
// allocates width × height × 4 bytes up front, so a few hundred KB of identical
// tiles declaring 16k × 16k would take a gigabyte before sharp's limit applied.
async function decodeHeic(input: Buffer): Promise<ReturnType<typeof sharp>> {
  const { all } = await import("heic-decode");
  let images: Awaited<ReturnType<typeof all>>;
  try {
    images = await all({ buffer: input });
  } catch {
    throw new InvalidImageError("Unreadable image");
  }
  try {
    const first = images[0];
    if (!first?.width || !first.height || first.width * first.height > config.maxImagePixels) throw new InvalidImageError("Image too large");
    const { width, height, data } = await first.decode();
    return sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), { raw: { width, height, channels: 4 } });
  } finally {
    images.dispose();
  }
}

// Decoding and re-encoding take a few hundred MB for the largest photos: past a
// handful at once, a burst of uploads would exhaust the server's memory.
const MAX_CONCURRENT = 3;
let running = 0;
const waiting: (() => void)[] = [];

async function withSlot<T>(work: () => Promise<T>): Promise<T> {
  if (running >= MAX_CONCURRENT) await new Promise<void>((resolve) => waiting.push(resolve));
  running++;
  try {
    return await work();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

async function open(input: Buffer): Promise<ReturnType<typeof sharp>> {
  const type = await fileTypeFromBuffer(input);
  if (!type || !ACCEPTED.has(type.mime)) throw new InvalidImageError("Unsupported file type");
  if (type.mime === "image/heic" || type.mime === "image/heif") return decodeHeic(input);
  return sharp(input, { limitInputPixels: config.maxImagePixels, animated: false });
}

/**
 * Trusts the bytes, never the client's filename or Content-Type. Every variant
 * is re-encoded, which drops EXIF — GPS position and device serials included —
 * and neutralises anything smuggled after the image data.
 */
export function processPhoto(input: Buffer): Promise<ProcessedPhoto> {
  return withSlot(async () => {
    let base: ReturnType<typeof sharp>;
    try {
      base = (await open(input)).rotate();
      const meta = await base.metadata();
      if (!meta.width || !meta.height) throw new Error("no dimensions");
    } catch (err) {
      if (err instanceof InvalidImageError) throw err;
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
  });
}

/**
 * Event logos: any raster image, trimmed of empty borders and fitted into a
 * transparent 512 px square. SVG is refused on purpose: it can carry scripts
 * and external references, and the logo ends up inside downloadable files.
 */
export function processLogo(input: Buffer): Promise<Buffer> {
  return withSlot(async () => {
    try {
      return await (await open(input))
        .rotate()
        .trim()
        .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
    } catch (err) {
      if (err instanceof InvalidImageError) throw err;
      throw new InvalidImageError("Unreadable image");
    }
  });
}
