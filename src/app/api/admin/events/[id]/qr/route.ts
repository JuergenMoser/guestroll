import { apiError, requireEventAdmin } from "@/lib/http";
import { eventQrPng, eventQrSvg } from "@/lib/qr/server";
import { slugify } from "@/lib/security/ids";
import { getSpot } from "@/lib/spots";

const SIZES = new Set([512, 1024, 2048, 4096]);

/** `?format=svg` for print shops; PNG otherwise, `?size=` 512 to 4096 px wide. */
export async function GET(request: Request, { params }: RouteContext<"/api/admin/events/[id]/qr">) {
  const { event, denied } = await requireEventAdmin(request, (await params).id);
  if (denied) return denied;

  const search = new URL(request.url).searchParams;
  const format = search.get("format") === "svg" ? "svg" : "png";
  const size = Number(search.get("size"));
  // `?spot=`: that table's code, named after it.
  const spot = search.has("spot") ? getSpot(event.id, search.get("spot")) : undefined;
  if (search.has("spot") && !spot) return apiError("not_found");
  const filename = `qr-${slugify(event.name) || "event"}${spot ? `-${slugify(spot.label) || spot.id}` : ""}.${format}`;
  const headers = {
    "Content-Disposition": `${search.get("download") === "1" ? "attachment" : "inline"}; filename="${filename}"`,
    "Cache-Control": "private, no-store",
  };

  if (format === "svg") {
    return new Response(await eventQrSvg(event, spot), {
      headers: { ...headers, "Content-Type": "image/svg+xml", "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'" },
    });
  }
  const png = await eventQrPng(event, SIZES.has(size) ? size : 1024, spot);
  return new Response(new Uint8Array(png), { headers: { ...headers, "Content-Type": "image/png" } });
}
