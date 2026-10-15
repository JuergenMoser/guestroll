"use client";

import { captureComponents } from "@/components/capture/registry";
import { useT } from "@/components/I18nProvider";
import type { PublicEvent } from "@/lib/events";
import type { PhotoDto } from "@/lib/photos";
import { UploadTray } from "./UploadTray";
import { useUploadQueue } from "./useUploadQueue";

interface CaptureHostProps {
  event: PublicEvent;
  closedReason: "closed" | "quota" | null;
  remaining: number | null;
  onUploaded: (photo: PhotoDto) => void;
}

/**
 * Glue between whichever capture component the event uses and the upload queue.
 * Swapping the capture component (see `capture/registry.ts`) never changes this.
 */
export function CaptureHost({ event, closedReason, remaining, onUploaded }: CaptureHostProps) {
  const t = useT();
  const queue = useUploadQueue(`/api/e/${event.slug}/photos`, onUploaded);
  const Capture = captureComponents[event.captureMode];

  // Don't let a guest queue more files than their quota allows: the extra ones would only fail.
  const pending = queue.items.filter((i) => i.status !== "done" && i.status !== "error").length;
  const left = remaining === null ? null : Math.max(remaining - pending, 0);
  const disabled = closedReason !== null || left === 0;

  const onFiles = (files: File[]) => queue.add(left === null ? files : files.slice(0, left));

  return (
    <div className="space-y-6">
      <Capture event={event} onFiles={onFiles} disabled={disabled} remaining={left} />
      {closedReason ? (
        <p className="text-center text-sm text-ink-300">{t(closedReason === "quota" ? "guest.quota" : "guest.closed")}</p>
      ) : (
        left !== null && <p className="text-center text-xs text-ink-400">{t("guest.remaining", { n: left })}</p>
      )}
      <UploadTray items={queue.items} onRetry={queue.retry} onDismiss={queue.dismiss} />
    </div>
  );
}
