import "server-only";
import sharp from "sharp";
import type { EventRow, SpotRow } from "@/lib/db/schema";
import { eventQrStyle } from "@/lib/events";
import { readLogo } from "@/lib/storage/files";
import { eventUrl } from "@/lib/urls";
import { qrMatrix, renderQrSvg } from "./render";

/**
 * The event's QR code with its saved style, logo embedded so the file stands alone.
 * For a spot, the code carries its id and its name replaces the caption.
 */
export async function eventQrSvg(event: EventRow, spot?: Pick<SpotRow, "id" | "label">): Promise<string> {
  const saved = eventQrStyle(event);
  const style = spot ? { ...saved, label: spot.label } : saved;
  const logo = style.logo && event.logoVersion ? await readLogo(event.id) : null;
  const url = await eventUrl(event.slug);
  const matrix = qrMatrix(spot ? `${url}?at=${spot.id}` : url, style);
  return renderQrSvg(matrix, { ...style, logo: Boolean(logo) }, {
    logoHref: logo ? `data:image/png;base64,${logo.toString("base64")}` : undefined,
    // The bundled font (see docker/fonts.conf): exports look the same on every server.
    fontFamily: "'Bricolage Grotesque', sans-serif",
  });
}

export async function eventQrPng(event: EventRow, width: number, spot?: Pick<SpotRow, "id" | "label">): Promise<Buffer> {
  const svg = await eventQrSvg(event, spot);
  return sharp(Buffer.from(svg), { density: 300 }).resize({ width }).png().toBuffer();
}
