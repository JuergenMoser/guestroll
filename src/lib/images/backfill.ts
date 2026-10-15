import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { photos } from "@/lib/db/schema";
import { analysedPhotos } from "@/lib/photos";
import { storage } from "@/lib/storage";
import { photoKey } from "@/lib/storage/files";
import { analyze, findDuplicate } from "./analysis";

/**
 * Analyses photos sent before the analysis existed, a few per scheduler tick,
 * oldest first so a duplicate always points at the earlier shot. Reads the
 * display copy: 1600 px is plenty for a 512 px measure and a 9×8 hash.
 */
export async function analysePending(limit = 20): Promise<number> {
  const pending = getDb()
    .select({ id: photos.id, eventId: photos.eventId, createdAt: photos.createdAt })
    .from(photos)
    .where(isNull(photos.hash))
    .orderBy(asc(photos.createdAt), asc(photos.id))
    .limit(limit)
    .all();
  for (const photo of pending) {
    const file = await storage().read(photoKey(photo.eventId, photo.id, "display")).catch(() => null);
    // An unreadable file gets an empty hash: never compared, never tried again.
    const analysis = file ? await analyze(file).catch(() => null) : null;
    getDb()
      .update(photos)
      .set(
        analysis
          ? { sharpness: analysis.sharpness, hash: analysis.hash, duplicateOf: findDuplicate(analysis.hash, analysedPhotos(photo.eventId, photo.createdAt)) }
          : { hash: "" },
      )
      .where(and(eq(photos.id, photo.id), isNull(photos.hash)))
      .run();
  }
  return pending.length;
}
