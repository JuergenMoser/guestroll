import "server-only";
import sharp from "sharp";
import type { EventRow } from "@/lib/db/schema";
import { eventQrStyle } from "@/lib/events";
import { readLogo } from "@/lib/storage/files";
import { eventUrl } from "@/lib/urls";
import { qrMatrix, renderQrSvg } from "./render";

/** The event's QR code with its saved style, logo embedded so the file stands alone. */
export async function eventQrSvg(event: EventRow): Promise<string> {
  const style = eventQrStyle(event);
  const logo = style.logo && event.logoVersion ? await readLogo(event.id) : null;
  const matrix = qrMatrix(await eventUrl(event.slug), style);
  return renderQrSvg(matrix, { ...style, logo: Boolean(logo) }, {
    logoHref: logo ? `data:image/png;base64,${logo.toString("base64")}` : undefined,
    // The bundled font (see docker/fonts.conf): exports look the same on every server.
    fontFamily: "'Bricolage Grotesque', sans-serif",
  });
}

export async function eventQrPng(event: EventRow, width: number): Promise<Buffer> {
  const svg = await eventQrSvg(event);
  return sharp(Buffer.from(svg), { density: 300 }).resize({ width }).png().toBuffer();
}
