"use client";

import { applyFilter, frameLayout, type Filter, type Frame } from "@/lib/effects";
import type { PublicEvent } from "@/lib/events";

const MAX_DIMENSION = 3200;

let logoCache: { url: string; image: Promise<ImageBitmap | null> } | null = null;
function loadLogo(url: string): Promise<ImageBitmap | null> {
  if (logoCache?.url !== url) {
    logoCache = { url, image: fetch(url).then((r) => (r.ok ? r.blob() : null)).then((b) => (b ? createImageBitmap(b) : null)).catch(() => null) };
  }
  return logoCache.image;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number, weight: number, family: string) {
  let px = size;
  ctx.font = `${weight} ${px}px ${family}`;
  while (px > 10 && ctx.measureText(text).width > maxWidth) {
    px = Math.floor(px * 0.92);
    ctx.font = `${weight} ${px}px ${family}`;
  }
  return px;
}

/**
 * Draws the filter and the frame into a JPEG. Returns the file untouched when
 * there's nothing to apply, or when the browser can't decode it (HEIC on
 * desktop Chrome…): a plain photo beats no photo.
 */
export async function applyEffects(file: File, effects: { filter: Filter; frame: Frame; event: PublicEvent }): Promise<File> {
  const { filter, frame, event } = effects;
  if (filter === "none" && frame === "none") return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const layout = frameLayout(frame, w, h);
  const canvas = document.createElement("canvas");
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  const accent = event.accentColor;
  ctx.fillStyle = frame === "border" ? accent : "#ffffff";
  ctx.fillRect(0, 0, layout.width, layout.height);
  ctx.drawImage(bitmap, layout.x, layout.y, w, h);
  bitmap.close();

  if (filter !== "none") {
    const pixels = ctx.getImageData(layout.x, layout.y, w, h);
    applyFilter(pixels.data, filter);
    ctx.putImageData(pixels, layout.x, layout.y);
  }

  const family = getComputedStyle(document.body).fontFamily || "sans-serif";
  if (frame === "print" || frame === "border") {
    const area = layout.captionHeight;
    const top = layout.y + h;
    // The page's language: the date reads as the guest reads dates.
    const date = event.eventDate
      ? new Intl.DateTimeFormat(document.documentElement.lang || undefined, { dateStyle: "long" }).format(new Date(`${event.eventDate}T12:00:00`))
      : "";
    // On the event color, the text takes the same ink as the buttons do.
    ctx.fillStyle = frame === "print" ? "#1a1b1d" : getComputedStyle(document.documentElement).getPropertyValue("--color-accent-ink").trim() || "#1a1b1d";
    ctx.textBaseline = "middle";
    const maxWidth = layout.width - layout.x * 2 - (event.logoVersion ? area : 0) * 1.2;
    if (frame === "print") {
      ctx.textAlign = "center";
      fitText(ctx, event.name, maxWidth, Math.round(area * 0.28), 700, family);
      ctx.fillText(event.name, layout.width / 2, top + area * (date ? 0.4 : 0.5));
      if (date) {
        ctx.globalAlpha = 0.6;
        fitText(ctx, date, maxWidth, Math.round(area * 0.15), 500, family);
        ctx.fillText(date, layout.width / 2, top + area * 0.72);
        ctx.globalAlpha = 1;
      }
    } else {
      ctx.textAlign = "left";
      const caption = date ? `${event.name}, ${date}` : event.name;
      fitText(ctx, caption, maxWidth, Math.round(area * 0.42), 700, family);
      ctx.fillText(caption, layout.x, top + area / 2);
    }
  }

  if (frame === "stamp" || ((frame === "print" || frame === "border") && event.logoVersion)) {
    const logo = event.logoVersion ? await loadLogo(`/api/e/${event.slug}/logo?v=${event.logoVersion}`) : null;
    if (logo) {
      // In a frame the logo sits in the caption band, so it can't be taller than the band.
      const size = Math.round(frame === "stamp" ? Math.min(w, h) * 0.16 : Math.min(Math.min(w, h) * 0.1, layout.captionHeight * 0.8));
      const margin = Math.round(size * 0.25);
      const x = layout.x + w - size - margin;
      const y = frame === "stamp" ? layout.y + h - size - margin : layout.y + h + (layout.captionHeight - size) / 2;
      ctx.drawImage(logo, frame === "stamp" ? x : layout.width - layout.x - size, y, size, size);
    }
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
}
