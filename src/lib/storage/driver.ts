import type { Readable } from "node:stream";

/**
 * What the app needs from a place to keep files. Keys are relative paths like
 * `<eventId>/<photoId>.thumb.webp`, always built by `keys.ts` from ids we
 * generated: drivers never see user input.
 */
export interface StorageDriver {
  readonly name: "local" | "s3";
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** Null when the file doesn't exist. */
  read(key: string): Promise<Buffer | null>;
  open(key: string): Promise<{ stream: Readable; size: number } | null>;
  delete(key: string): Promise<void>;
  /** Removes everything under `prefix/`, e.g. a deleted event's folder. */
  deletePrefix(prefix: string): Promise<void>;
  /** Every file under `prefix` (all files when empty), for backups. */
  list(prefix?: string): AsyncIterable<{ key: string; size: number }>;
  /** Bytes used and available, when the backend can tell (a disk can, a bucket can't). */
  capacity(): Promise<{ total: number; free: number } | null>;
}
