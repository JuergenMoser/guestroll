import type { PublicEvent } from "@/lib/events";

/**
 * The contract every capture component implements. A capture component only
 * decides HOW guests pick or shoot photos; it hands the files to `onFiles` and
 * the host takes care of compression, upload, retries and progress. That is why
 * a custom component can't break the upload: it never touches it.
 */
export interface CaptureProps {
  /** Queue files for upload. Call it as many times as you like. */
  onFiles: (files: File[]) => void;
  /** True while uploads are closed or the guest reached their quota. */
  disabled: boolean;
  /** Photos this guest may still send, or `null` when unlimited. */
  remaining: number | null;
  event: PublicEvent;
}
