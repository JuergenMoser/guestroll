/**
 * Photo filters and frames, applied in the guest's browser before the upload
 * (see components/upload/applyEffects.ts). The pixel math lives here, pure, so
 * it is tested without a browser and identical everywhere: canvas `filter` is
 * missing on older Safari.
 */

export const FILTERS = ["none", "bw", "warm", "vintage", "vivid"] as const;
export type Filter = (typeof FILTERS)[number];

export const FRAMES = ["none", "print", "border", "stamp"] as const;
export type Frame = (typeof FRAMES)[number];

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Rewrites RGBA pixels in place. */
export function applyFilter(data: Uint8ClampedArray, filter: Filter): void {
  if (filter === "none") return;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Rec. 709 luma.
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    switch (filter) {
      case "bw": {
        // A touch of contrast: flat greys look washed out on a phone.
        const v = clamp((y - 128) * 1.12 + 128);
        data[i] = data[i + 1] = data[i + 2] = v;
        break;
      }
      case "warm":
        data[i] = clamp(r * 1.08 + 6);
        data[i + 1] = clamp(g * 1.02 + 2);
        data[i + 2] = clamp(b * 0.88);
        break;
      case "vintage": {
        // Sepia mixed with the original, lifted blacks, softened whites.
        const sr = 0.393 * r + 0.769 * g + 0.189 * b;
        const sg = 0.349 * r + 0.686 * g + 0.168 * b;
        const sb = 0.272 * r + 0.534 * g + 0.131 * b;
        data[i] = clamp(0.55 * sr + 0.45 * r) * 0.86 + 24;
        data[i + 1] = clamp(0.55 * sg + 0.45 * g) * 0.86 + 20;
        data[i + 2] = clamp(0.55 * sb + 0.45 * b) * 0.86 + 18;
        break;
      }
      case "vivid": {
        const s = 1.32;
        data[i] = clamp(((y + (r - y) * s - 128) * 1.08 + 128));
        data[i + 1] = clamp(((y + (g - y) * s - 128) * 1.08 + 128));
        data[i + 2] = clamp(((y + (b - y) * s - 128) * 1.08 + 128));
        break;
      }
    }
  }
}

/** Where the photo sits inside the framed canvas, and how big the canvas is. */
export function frameLayout(frame: Frame, width: number, height: number) {
  const short = Math.min(width, height);
  switch (frame) {
    case "print": {
      // Instant-print proportions: equal thin sides, a deep bottom for the caption.
      const side = Math.round(short * 0.055);
      const bottom = Math.round(short * 0.2);
      return { width: width + side * 2, height: height + side + bottom, x: side, y: side, captionHeight: bottom };
    }
    case "border": {
      const side = Math.round(short * 0.035);
      const bottom = Math.round(short * 0.09);
      return { width: width + side * 2, height: height + side + bottom, x: side, y: side, captionHeight: bottom };
    }
    default:
      return { width, height, x: 0, y: 0, captionHeight: 0 };
  }
}
