import "server-only";
import { Readable } from "node:stream";
import archiver from "archiver";
import type { EventRow, PhotoRow } from "@/lib/db/schema";
import { slugify } from "@/lib/security/ids";
import { openPhotoStream } from "@/lib/storage/files";

/**
 * Streams the ZIP as it is built: a 2 GB album never sits in memory, and the
 * download starts immediately. JPEGs are already compressed, so `store` skips
 * a pointless deflate pass.
 */
export function archiveResponse(event: EventRow, rows: PhotoRow[]): Response {
  const zip = archiver("zip", { store: true });
  zip.on("warning", (error: Error) => console.warn("[archive]", error));
  // Files are opened one after the other, as the ZIP consumes them: with S3,
  // opening them all at once would hold one HTTP connection per photo.
  void (async () => {
    for (const [i, photo] of rows.entries()) {
      const opened = await openPhotoStream(event.id, photo.id, "original").catch(() => null);
      if (!opened) continue;
      const author = slugify(photo.guestName ?? "") || "guest";
      zip.append(opened.stream, { name: `${String(i + 1).padStart(4, "0")}-${author}-${photo.id.slice(0, 8)}.jpg` });
      await new Promise<void>((resolve, reject) => {
        zip.once("entry", () => resolve());
        opened.stream.once("error", reject);
      });
    }
    await zip.finalize();
  })().catch((error) => {
    console.error("[archive]", error);
    zip.abort();
  });

  const filename = `${slugify(event.name) || "photos"}.zip`;
  return new Response(Readable.toWeb(zip) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
