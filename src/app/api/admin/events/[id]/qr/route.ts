import QRCode from "qrcode";
import { getEventById } from "@/lib/events";
import { apiError, requireAdmin } from "@/lib/http";
import { slugify } from "@/lib/security/ids";
import { eventUrl } from "@/lib/urls";

/** `?format=svg` for print shops, PNG otherwise. High error correction survives a logo or a coffee stain. */
export async function GET(request: Request, { params }: RouteContext<"/api/admin/events/[id]/qr">) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const event = getEventById((await params).id);
  if (!event) return apiError("not_found");

  const url = await eventUrl(event.slug);
  const format = new URL(request.url).searchParams.get("format") === "svg" ? "svg" : "png";
  const filename = `qr-${slugify(event.name) || "event"}.${format}`;
  const headers = { "Content-Disposition": `inline; filename="${filename}"`, "Cache-Control": "private, no-store" };

  if (format === "svg") {
    const svg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "H", margin: 2 });
    return new Response(svg, { headers: { ...headers, "Content-Type": "image/svg+xml" } });
  }
  const png = await QRCode.toBuffer(url, { errorCorrectionLevel: "H", margin: 2, width: 1024 });
  return new Response(new Uint8Array(png), { headers: { ...headers, "Content-Type": "image/png" } });
}
