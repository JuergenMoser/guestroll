import sharp, { type Sharp } from "sharp";

/**
 * Blurry photos and near-duplicates, found on the server from the pixels alone:
 * no model, no third party. Both are hints for the hosts' moderation, never a
 * decision: nothing is hidden or deleted on their account.
 */

// Width the sharpness is measured at: a fixed size keeps scores comparable
// between a 12 MP phone photo and an imported 4 MP one.
const SHARPNESS_WIDTH = 512;

/**
 * Below this, a photo may be flagged as blurry. Measured on 512 px wide greyscale
 * copies: a sharp phone photo scores in the hundreds, the same one slightly
 * blurred under 200, badly blurred under 20.
 */
export const BLURRY_BELOW = 40;

/**
 * And only when it is also well under the event's median: a night of dim,
 * soft photos (or the demo's bokeh pictures) mustn't be flagged wholesale. A
 * missed blurry photo costs less than a false alarm on half the album.
 */
export const BLURRY_SHARE_OF_MEDIAN = 0.35;

/**
 * Bits (out of 64) two photos may differ by and still count as the same shot.
 * Measured: a resized or cropped, recompressed copy differs by 5 at most, nine
 * different photos out of ten by 18 or more.
 */
export const DUPLICATE_DISTANCE = 8;

/** The sharpness under which a photo of this event is flagged, from the scores of its analysed photos. */
export function blurryThreshold(scores: number[]): number {
  if (scores.length < 5) return BLURRY_BELOW;
  const sorted = [...scores].sort((a, b) => a - b);
  const median = sorted[sorted.length >> 1];
  return Math.min(BLURRY_BELOW, median * BLURRY_SHARE_OF_MEDIAN);
}

/** Variance of the Laplacian: edges make it high, blur flattens them. */
export function laplacianVariance(grey: Uint8Array, width: number, height: number): number {
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const v = grey[i - width] + grey[i + width] + grey[i - 1] + grey[i + 1] - 4 * grey[i];
      sum += v;
      sumSq += v * v;
      n++;
    }
  }
  if (n === 0) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

// A bit is set only on a real step down: in flat areas (a wall, the sky) two neighbours
// are nearly equal and compression noise flipped plain dHash bits. Measured on resized
// and recompressed copies: at most 5 bits apart with it, 7 without.
const HASH_TOLERANCE = 4;

/** dHash: each bit says whether a pixel is brighter than its right neighbour, on a 9×8 greyscale thumbnail. */
export function differenceHash(grey9x8: Uint8Array): string {
  let bits = 0n;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      bits = (bits << 1n) | (grey9x8[y * 9 + x] - grey9x8[y * 9 + x + 1] > HASH_TOLERANCE ? 1n : 0n);
    }
  }
  return bits.toString(16).padStart(16, "0");
}

export function hammingDistance(a: string, b: string): number {
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let n = 0;
  while (x) {
    n += Number(x & 1n);
    x >>= 1n;
  }
  return n;
}

export interface Analysis {
  sharpness: number;
  hash: string;
}

/** From an image already rotated upright (the processing pipeline's base), or any encoded image. */
export async function analyze(image: Sharp | Buffer): Promise<Analysis> {
  const base = Buffer.isBuffer(image) ? sharp(image).rotate() : image.clone();
  const [measured, tiny] = await Promise.all([
    base.clone().resize({ width: SHARPNESS_WIDTH, withoutEnlargement: true }).greyscale().raw().toBuffer({ resolveWithObject: true }),
    // Cubic, not the default Lanczos: its ringing made copies drift apart.
    base.clone().resize(9, 8, { fit: "fill", kernel: "cubic" }).greyscale().raw().toBuffer(),
  ]);
  return {
    sharpness: Math.round(laplacianVariance(measured.data, measured.info.width, measured.info.height)),
    hash: differenceHash(tiny),
  };
}

/** The earliest photo `hash` repeats, among `earlier` (oldest first), if any. */
export function findDuplicate(hash: string, earlier: { id: string; hash: string | null }[]): string | null {
  for (const photo of earlier) {
    if (photo.hash && hammingDistance(hash, photo.hash) <= DUPLICATE_DISTANCE) return photo.id;
  }
  return null;
}
