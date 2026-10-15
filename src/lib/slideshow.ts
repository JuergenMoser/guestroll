/**
 * Timing of the slideshow video, pure so it is tested apart from the encoder.
 * The video is a title card, then each photo for `perPhoto` seconds, each one
 * fading into the next over `fade` seconds, then the title again.
 */

export const FPS = 25;
export const TITLE_SECONDS = 3;
export const FADE_SECONDS = 0.6;
export const MAX_PHOTOS = 300;

export interface Timeline {
  photos: number;
  perPhoto: number;
  duration: number;
}

export function timeline(photos: number, perPhoto: number): Timeline {
  const n = Math.min(photos, MAX_PHOTOS);
  return { photos: n, perPhoto, duration: TITLE_SECONDS * 2 + n * perPhoto };
}

export type Shot =
  | { kind: "title"; opacity: number }
  | { kind: "photo"; index: number; progress: number; next?: { index: number; mix: number } };

/** What to draw at time `t`: the title, or a photo (with its Ken Burns progress) possibly fading into the next. */
export function shotAt(t: number, tl: Timeline): Shot {
  const photosEnd = TITLE_SECONDS + tl.photos * tl.perPhoto;
  if (t < TITLE_SECONDS || tl.photos === 0) return { kind: "title", opacity: Math.min(1, t / 0.8) };
  if (t >= photosEnd) return { kind: "title", opacity: Math.min(1, (t - photosEnd) / 0.8) };
  const local = t - TITLE_SECONDS;
  const index = Math.min(Math.floor(local / tl.perPhoto), tl.photos - 1);
  const within = local - index * tl.perPhoto;
  const shot: Shot = { kind: "photo", index, progress: within / tl.perPhoto };
  const fadeStart = tl.perPhoto - FADE_SECONDS;
  if (within > fadeStart && index + 1 < tl.photos) shot.next = { index: index + 1, mix: (within - fadeStart) / FADE_SECONDS };
  return shot;
}

/** Rectangle covering the frame, slowly zooming in (Ken Burns), alternating direction per photo. */
export function coverRect(imageW: number, imageH: number, frameW: number, frameH: number, progress: number, index: number) {
  const zoom = 1.04 + 0.08 * (index % 2 === 0 ? progress : 1 - progress);
  const scale = Math.max(frameW / imageW, frameH / imageH) * zoom;
  const w = imageW * scale;
  const h = imageH * scale;
  const driftX = (index % 3) - 1;
  return { x: (frameW - w) / 2 + driftX * (w - frameW) * 0.25 * (progress - 0.5), y: (frameH - h) / 2, w, h };
}

/**
 * A photo whose shape is far from the frame's (portrait in a landscape video)
 * would lose half of itself to cropping: it is shown whole instead, on a
 * blurred copy of itself.
 */
export function fitsByCover(imageW: number, imageH: number, frameW: number, frameH: number): boolean {
  return Math.abs(Math.log(imageW / imageH / (frameW / frameH))) < 0.35;
}

/** The whole photo, centred, zooming in a little. */
export function containRect(imageW: number, imageH: number, frameW: number, frameH: number, progress: number) {
  const scale = Math.min(frameW / imageW, frameH / imageH) * (0.94 + 0.05 * progress);
  const w = imageW * scale;
  const h = imageH * scale;
  return { x: (frameW - w) / 2, y: (frameH - h) / 2, w, h };
}
