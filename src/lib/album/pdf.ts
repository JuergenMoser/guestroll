import "server-only";
import path from "node:path";
import { PassThrough } from "node:stream";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import type { EventRow, PhotoRow } from "@/lib/db/schema";
import { readLogo } from "@/lib/storage/files";
import { storage } from "@/lib/storage";
import { photoKey } from "@/lib/storage/files";

export const ALBUM_LAYOUTS = [1, 2, 4] as const;
export type AlbumLayout = (typeof ALBUM_LAYOUTS)[number];

export interface AlbumText {
  /** "{n} photos", already filled. */
  count: string;
  /** "Photo: {name}", with `{name}` left in for each photo. */
  credit: string;
  /** Formatted event date, or null. */
  date: string | null;
}

const fontsDir = path.join(/*turbopackIgnore: true*/ process.cwd(), "assets", "fonts");
// A4 in points; a margin printers don't crop.
const PAGE = { width: 595.28, height: 841.89, margin: 40 };
const CAPTION = 16;

/**
 * One photo per page is for printing: it comes from the original, 2400 px on its
 * long side (A4 at 250 dpi or so). Two or four per page use the display copy,
 * 1600 px, plenty at that size and four times lighter.
 */
async function photoJpeg(eventId: string, photo: PhotoRow, layout: AlbumLayout): Promise<{ data: Buffer; width: number; height: number } | null> {
  // A video's original is the video: its poster frame is all a page can hold.
  const variant = layout === 1 && !photo.mediaType ? "original" : "display";
  const file = await storage().read(photoKey(eventId, photo.id, variant)).catch(() => null);
  if (!file) return null;
  // pdfkit reads JPEG and PNG only; the display copy is WebP.
  const { data, info } = await sharp(file).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function boxes(layout: AlbumLayout): { x: number; y: number; w: number; h: number }[] {
  const { width, height, margin } = PAGE;
  const innerW = width - 2 * margin;
  const innerH = height - 2 * margin - 20; // room for the page number
  const gap = 18;
  if (layout === 1) return [{ x: margin, y: margin, w: innerW, h: innerH - CAPTION }];
  if (layout === 2) {
    const h = (innerH - gap) / 2 - CAPTION;
    return [0, 1].map((i) => ({ x: margin, y: margin + i * (h + CAPTION + gap), w: innerW, h }));
  }
  const w = (innerW - gap) / 2;
  const h = (innerH - gap) / 2 - CAPTION;
  return [0, 1, 2, 3].map((i) => ({ x: margin + (i % 2) * (w + gap), y: margin + Math.floor(i / 2) * (h + CAPTION + gap), w, h }));
}

/**
 * Streams the album: a cover, then the photos in the order they were taken, a
 * credit under each and page numbers. Photos are read and converted one at a
 * time, so a 500-photo album never sits in memory.
 */
export function albumPdf(event: EventRow, photos: PhotoRow[], layout: AlbumLayout, text: AlbumText): PassThrough {
  const out = new PassThrough();
  // No pdfkit margin: everything is placed by hand, and text below its margin (the
  // page numbers) made it add a blank page after each one.
  const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: false, info: { Title: event.name, Creator: "Guestroll" } });
  doc.pipe(out);
  // The event's own font: names and accents print as on screen, in every language.
  doc.registerFont("body", path.join(fontsDir, "BricolageGrotesque-400.woff"));
  doc.registerFont("bold", path.join(fontsDir, "BricolageGrotesque-800.woff"));

  (async () => {
    // Cover.
    doc.addPage();
    const accent = /^#[0-9a-f]{6}$/i.test(event.accentColor) ? event.accentColor : "#ffc72c";
    doc.rect(0, 0, PAGE.width, 14).fill(accent);
    let y = 250;
    const logo = event.logoVersion ? await readLogo(event.id).catch(() => null) : null;
    if (logo) {
      doc.image(logo, PAGE.width / 2 - 60, 120, { fit: [120, 120], align: "center" });
      y = 280;
    }
    doc.fillColor("#1a1b1d").font("bold").fontSize(36).text(event.name, PAGE.margin, y, { width: PAGE.width - 2 * PAGE.margin, align: "center" });
    if (text.date) doc.moveDown(0.4).font("body").fontSize(16).fillColor("#63676b").text(text.date, { align: "center" });
    doc.moveDown(0.4).font("body").fontSize(13).fillColor("#63676b").text(text.count, { align: "center" });

    let page = 0;
    const slots = boxes(layout);
    for (let i = 0; i < photos.length; i++) {
      // Abandoned (client gone, deadline passed): stop converting photos nobody will get.
      if (out.destroyed) return;
      const slot = slots[i % layout];
      if (i % layout === 0) {
        doc.addPage();
        page++;
        doc.font("body").fontSize(9).fillColor("#9a9ea2").text(String(page), PAGE.margin, PAGE.height - PAGE.margin, { width: PAGE.width - 2 * PAGE.margin, align: "center", lineBreak: false });
      }
      const jpeg = await photoJpeg(event.id, photos[i], layout).catch(() => null);
      if (!jpeg) continue;
      // Fitted and centred in its slot by hand, so the credit can sit right under the photo itself.
      const scale = Math.min(slot.w / jpeg.width, slot.h / jpeg.height);
      const [w, h] = [jpeg.width * scale, jpeg.height * scale];
      const [x, y] = [slot.x + (slot.w - w) / 2, slot.y + (slot.h - h) / 2];
      doc.image(jpeg.data, x, y, { width: w, height: h });
      const name = photos[i].guestName;
      if (name) {
        doc.font("body").fontSize(9).fillColor("#63676b").text(text.credit.replace("{name}", name), slot.x, y + h + 4, { width: slot.w, align: "center", lineBreak: false, ellipsis: true });
      }
    }
    doc.end();
  })().catch((error) => {
    console.error("[album]", error);
    out.destroy(error as Error);
  });
  return out;
}
