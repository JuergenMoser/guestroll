import "server-only";
import { config } from "@/lib/config";
import type { StorageDriver } from "./driver";
import { localDriver } from "./local";
import { s3Driver } from "./s3";

export type { StorageDriver } from "./driver";

const globalForStorage = globalThis as unknown as { guestrollStorage?: StorageDriver };

function create(): StorageDriver {
  if (config.storage.driver === "local") return localDriver(config.uploadsDir);
  const s3 = config.storage.s3;
  const missing = (["endpoint", "bucket", "accessKeyId", "secretAccessKey"] as const).filter((k) => !s3[k]);
  if (missing.length) {
    const names = { endpoint: "S3_ENDPOINT", bucket: "S3_BUCKET", accessKeyId: "S3_ACCESS_KEY_ID", secretAccessKey: "S3_SECRET_ACCESS_KEY" };
    throw new Error(`STORAGE_DRIVER=s3 needs ${missing.map((k) => names[k]).join(", ")}`);
  }
  return s3Driver(s3);
}

export function storage(): StorageDriver {
  globalForStorage.guestrollStorage ??= create();
  return globalForStorage.guestrollStorage;
}

// Room for what is being received and its variants, plus the database's own
// growth: a full disk would corrupt more than this album.
const MIN_FREE_BYTES = 512 * 1024 * 1024;

/**
 * Whether guest uploads should stop for lack of disk. Buckets report no capacity: never full.
 * `incoming`: what the upload may still write, for a video as large as allowed.
 */
export async function storageFull(incoming = 0): Promise<boolean> {
  const disk = await storage().capacity();
  return disk !== null && disk.free < MIN_FREE_BYTES + incoming;
}
