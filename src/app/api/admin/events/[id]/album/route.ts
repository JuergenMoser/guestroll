import { Readable } from "node:stream";
import { ALBUM_LAYOUTS, albumPdf, type AlbumLayout } from "@/lib/album/pdf";
import { apiError, rateLimited, requireEventAdmin } from "@/lib/http";
import { getLocale, getT } from "@/lib/i18n/server";
import { listForArchive } from "@/lib/photos";
import { slugify } from "@/lib/security/ids";

const globalForAlbum = globalThis as unknown as { guestrollAlbumBusy?: boolean };
// Enough for a thousand photos on a slow server; a stalled download is cut off past it.
const ALBUM_DEADLINE_MS = 10 * 60_000;

/**
 * `?layout=1|2|4&scope=visible|favorites`: the printable album, streamed. One at
 * a time per server: each converts every photo it holds.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/admin/events/[id]/album">) {
  const { event, denied } = await requireEventAdmin(request, (await params).id);
  if (denied) return denied;
  const search = new URL(request.url).searchParams;
  const layout = (ALBUM_LAYOUTS as readonly number[]).includes(Number(search.get("layout"))) ? (Number(search.get("layout")) as AlbumLayout) : 2;
  const photos = listForArchive(event.id, search.get("scope") === "favorites" ? "favorites" : "visible");
  if (photos.length === 0) return apiError("not_found");
  if (globalForAlbum.guestrollAlbumBusy) return rateLimited(10_000);
  globalForAlbum.guestrollAlbumBusy = true;

  const [t, locale] = [await getT(), await getLocale()];
  const date = event.eventDate ? new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${event.eventDate}T00:00:00Z`)) : null;
  const stream = albumPdf(event, photos, layout, { count: t("admin.album.count", { n: photos.length }), credit: t("admin.album.credit", { name: "{name}" }), date });
  // A client that stops reading would hold the lock as long as it likes (the stream
  // waits for it): past the deadline, or as soon as it disconnects, the album is
  // abandoned and the next one can start.
  const deadline = setTimeout(() => stream.destroy(new Error("Album took too long")), ALBUM_DEADLINE_MS);
  const release = () => {
    clearTimeout(deadline);
    globalForAlbum.guestrollAlbumBusy = false;
  };
  stream.once("end", release);
  stream.once("close", release);
  stream.once("error", release);
  request.signal.addEventListener("abort", () => stream.destroy(), { once: true });

  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="album-${slugify(event.name) || "event"}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
