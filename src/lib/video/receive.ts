import "server-only";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "@/lib/config";
import { BodyTooLargeError, ServerBusyError } from "@/lib/security/request";

/**
 * A video upload is not multipart: `formData()` would hold the whole body in
 * memory, and a minute of video is 100 MB or more. The body is the poster frame
 * (a JPEG the phone drew, `X-Poster-Bytes` long) followed by the video, which
 * goes straight to a file on disk as it arrives.
 */
export const VIDEO_UPLOAD_TYPE = "application/vnd.guestroll.video";

export const isVideoUpload = (request: Request) => (request.headers.get("content-type") ?? "").split(";")[0].trim() === VIDEO_UPLOAD_TYPE;

export class BadVideoUploadError extends Error {}

const MAX_POSTER_BYTES = 4 * 1024 * 1024;
// Long enough for a weak 4G that pauses, short enough that a phone gone dark
// doesn't keep a file open and a slot taken.
const IDLE_MS = 30_000;
// The idle timer alone restarts at every byte: one byte every 29 seconds would
// hold a slot for ever, and four such scripts would close videos to everyone.
// So a slow upload must also keep an average pace once past its first minute
// (32 KB/s, a tenth of a poor 4G uplink), and none lasts beyond 30 minutes.
const GRACE_MS = 60_000;
const MIN_BYTES_PER_S = 32 * 1024;
const MAX_MS = 30 * 60_000;
// Each one writes to disk at network speed: few at once keeps the disk for the photos.
const MAX_AT_ONCE = 4;
const STALE_MS = 3600_000;

const incoming = () => path.join(/*turbopackIgnore: true*/ config.dataDir, "incoming");
// On globalThis, like the upload memory budget: a module evaluated twice (dev
// reloads, a second bundle importing it) would otherwise count apart, and the
// cap would hold per copy instead of per server.
const slots = ((globalThis as unknown as { guestrollVideoSlots?: { receiving: number } }).guestrollVideoSlots ??= { receiving: 0 });

export const videosReceiving = () => slots.receiving;

/** Null when too many videos are arriving already: the guest's queue waits its turn. */
export function videoSlot(): { release: () => void } | null {
  if (slots.receiving >= MAX_AT_ONCE) return null;
  slots.receiving++;
  let released = false;
  return {
    release: () => {
      if (!released) slots.receiving--;
      released = true;
    },
  };
}

/** Whether an upload that sent `bytes` in `elapsedMs` should be cut off. */
export function tooSlow(bytes: number, elapsedMs: number): boolean {
  if (elapsedMs > MAX_MS) return true;
  return elapsedMs > GRACE_MS && bytes / (elapsedMs / 1000) < MIN_BYTES_PER_S;
}

/** What a crash or a restart mid-upload left behind. */
async function sweep(dir: string) {
  const now = Date.now();
  for (const name of await fsp.readdir(/*turbopackIgnore: true*/ dir).catch(() => [] as string[])) {
    const file = path.join(dir, name);
    const stat = await fsp.stat(/*turbopackIgnore: true*/ file).catch(() => null);
    if (stat && now - stat.mtimeMs > STALE_MS) await fsp.rm(file, { force: true });
  }
}

function drained(out: fs.WriteStream): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = (error?: Error) => {
      out.off("drain", done).off("error", done);
      if (error) reject(error);
      else resolve();
    };
    out.once("drain", done).once("error", done);
  });
}

/** The caller deletes `path` once it has stored or refused the video. */
export async function readVideoUpload(request: Request): Promise<{ poster: Buffer; path: string; bytes: number }> {
  const posterBytes = Number(request.headers.get("x-poster-bytes"));
  if (!Number.isInteger(posterBytes) || posterBytes <= 0 || posterBytes > MAX_POSTER_BYTES) throw new BadVideoUploadError();
  const max = posterBytes + config.maxVideoBytes;
  if (Number(request.headers.get("content-length") ?? 0) > max) throw new BodyTooLargeError();
  if (!request.body) throw new BadVideoUploadError();

  const dir = incoming();
  await fsp.mkdir(dir, { recursive: true });
  void sweep(dir);
  const file = path.join(dir, `${randomUUID()}.part`);
  const out = fs.createWriteStream(/*turbopackIgnore: true*/ file, { mode: 0o640 });
  const reader = request.body.getReader();
  const poster: Uint8Array[] = [];
  let posterHave = 0;
  let total = 0;
  const started = Date.now();
  try {
    for (;;) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const idle = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new ServerBusyError("Upload stalled")), IDLE_MS);
      });
      const { done, value } = await Promise.race([reader.read(), idle]).finally(() => clearTimeout(timer));
      if (done) break;
      total += value.byteLength;
      if (tooSlow(total, Date.now() - started)) throw new ServerBusyError("Upload too slow");
      if (total > max) throw new BodyTooLargeError();
      let chunk = value;
      if (posterHave < posterBytes) {
        const take = Math.min(posterBytes - posterHave, chunk.byteLength);
        poster.push(chunk.subarray(0, take));
        posterHave += take;
        chunk = chunk.subarray(take);
      }
      // Back-pressure: a fast network never fills the memory faster than the disk empties it.
      if (chunk.byteLength && !out.write(chunk)) await drained(out);
    }
    await new Promise<void>((resolve, reject) => out.end((error?: Error | null) => (error ? reject(error) : resolve())));
    if (posterHave < posterBytes || total === posterBytes) throw new BadVideoUploadError();
    return { poster: Buffer.concat(poster), path: file, bytes: total - posterBytes };
  } catch (error) {
    await reader.cancel().catch(() => {});
    out.destroy();
    await fsp.rm(file, { force: true });
    throw error;
  }
}
