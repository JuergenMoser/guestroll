import "server-only";
import { Readable } from "node:stream";
import archiver from "archiver";
import type { EventRow, PhotoRow } from "@/lib/db/schema";
import { slugify } from "@/lib/security/ids";
import { photoPath } from "@/lib/storage/files";

/**
 * Streams the ZIP as it is built: a 2 GB album never sits in memory, and the
 * download starts immediately. JPEGs are already compressed, so `store` skips
 * a pointless deflate pass.
 */
export function archiveResponse(event: EventRow, rows: PhotoRow[]): Response {
  const zip = archiver("zip", { store: true });
  rows.forEach((photo, i) => {
    const author = slugify(photo.guestName ?? "") || "guest";
    const name = `${String(i + 1).padStart(4, "0")}-${author}-${photo.id.slice(0, 8)}.jpg`;
    zip.file(photoPath(event.id, photo.id, "original"), { name });
  });
  zip.on("warning", (error: Error) => console.warn("[archive]", error));
  void zip.finalize();

  const filename = `${slugify(event.name) || "photos"}.zip`;
  return new Response(Readable.toWeb(zip) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
