import "server-only";
import { FilePathSource, Input, MP4, QTFF, WEBM } from "mediabunny";
import type { MediaType } from "@/lib/storage/files";

export class InvalidVideoError extends Error {}

export interface ProbedVideo {
  mediaType: NonNullable<MediaType>;
  durationMs: number;
}

/**
 * Reads a received video's container and length, from its metadata only: no
 * frame is decoded, so a minute of 4K costs a few reads. What doesn't parse as
 * MP4, MOV or WebM with a video track is refused, whatever its name claimed.
 */
export async function probeVideo(path: string): Promise<ProbedVideo> {
  const input = new Input({ source: new FilePathSource(path), formats: [MP4, QTFF, WEBM] });
  try {
    const format = await input.getFormat().catch(() => null);
    const mediaType = format === MP4 ? "video/mp4" : format === QTFF ? "video/quicktime" : format === WEBM ? "video/webm" : null;
    if (!mediaType || !(await input.getPrimaryVideoTrack().catch(() => null))) throw new InvalidVideoError();
    // Phones write the length in the header; a file without one is read to its end.
    const seconds = (await input.getDurationFromMetadata().catch(() => null)) ?? (await input.computeDuration().catch(() => NaN));
    if (!Number.isFinite(seconds) || seconds <= 0) throw new InvalidVideoError();
    return { mediaType, durationMs: Math.round(seconds * 1000) };
  } finally {
    input.dispose();
  }
}
