import "server-only";
import { Readable } from "node:stream";
import archiver from "archiver";
import type { EventRow, MessageRow, PhotoRow } from "@/lib/db/schema";
import { audioKey } from "@/lib/messages";
import { storage } from "@/lib/storage";
import { slugify } from "@/lib/security/ids";
import { fileExt, openPhotoStream } from "@/lib/storage/files";

/** `0001-camille-1a2b3c4d.jpg` (or `.mp4`): sorts in the order photos were taken, says who took them. Shared by the ZIP and the cloud export. */
export function photoFileName(index: number, photo: Pick<PhotoRow, "id" | "guestName" | "mediaType">): string {
  const author = slugify(photo.guestName ?? "") || "guest";
  return `${String(index + 1).padStart(4, "0")}-${author}-${photo.id.slice(0, 8)}.${fileExt("original", photo.mediaType)}`;
}

/**
 * Streams the ZIP as it is built: a 2 GB album never sits in memory, and the
 * download starts immediately. JPEGs and videos are already compressed, so `store` skips
 * a pointless deflate pass.
 */
export function archiveResponse(event: EventRow, rows: PhotoRow[], suffix?: string): Response {
  const zip = archiver("zip", { store: true });
  zip.on("warning", (error: Error) => console.warn("[archive]", error));
  // Files are opened one after the other, as the ZIP consumes them: with S3,
  // opening them all at once would hold one HTTP connection per photo.
  void (async () => {
    for (const [i, photo] of rows.entries()) {
      const opened = await openPhotoStream(event.id, photo.id, "original", photo.mediaType).catch(() => null);
      if (!opened) continue;
      zip.append(opened.stream, { name: photoFileName(i, photo) });
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

  const filename = `${slugify(event.name) || "photos"}${suffix ? `-${suffix}` : ""}.zip`;
  return new Response(Readable.toWeb(zip) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

/**
 * `guestbook.txt` (UTF-8, one block per message, oldest first) and the voice
 * notes, named so they sort with their text: `003-camille.webm` is message 3.
 */
export function guestbookArchiveResponse(event: EventRow, rows: MessageRow[]): Response {
  const zip = archiver("zip", { zlib: { level: 6 } });
  zip.on("warning", (error: Error) => console.warn("[archive]", error));
  const names = rows.map((m, i) => `${String(i + 1).padStart(3, "0")}-${slugify(m.guestName ?? "") || "guest"}`);
  const text = rows
    .map((m, i) => {
      const when = new Date(m.createdAt).toISOString().replace("T", " ").slice(0, 16);
      const audio = m.audioExt ? `\n[voice note: ${names[i]}.${m.audioExt}]` : "";
      return `#${i + 1}  ${m.guestName ?? "—"}  ${when} UTC\n${m.text}${audio}`.trim();
    })
    .join("\n\n----\n\n");
  zip.append(`${event.name}\n\n${text}\n`, { name: "guestbook.txt" });

  void (async () => {
    for (const [i, m] of rows.entries()) {
      if (!m.audioExt) continue;
      const opened = await storage().open(audioKey(m)).catch(() => null);
      if (!opened) continue;
      zip.append(opened.stream, { name: `${names[i]}.${m.audioExt}`, store: true });
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

  return new Response(Readable.toWeb(zip) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${slugify(event.name) || "event"}-guestbook.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
