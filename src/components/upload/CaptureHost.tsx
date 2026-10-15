"use client";

import { captureComponents } from "@/components/capture/registry";
import { useT } from "@/components/I18nProvider";
import type { PublicEvent } from "@/lib/events";
import type { PhotoDto } from "@/lib/photos";
import { ExposureCounter } from "./ExposureCounter";
import { UploadTray } from "./UploadTray";
import { useUploadQueue } from "./useUploadQueue";

interface CaptureHostProps {
  event: PublicEvent;
  closedReason: "closed" | "quota" | null;
  remaining: number | null;
  sent: number;
  onUploaded: (photo: PhotoDto) => void;
}

/**
 * The camera body: the event's color, the exposure counter, and whichever
 * capture component the event uses (see `capture/registry.ts`). Swapping the
 * capture component never touches the upload queue wired here.
 */
export function CaptureHost({ event, closedReason, remaining, sent, onUploaded }: CaptureHostProps) {
  const t = useT();
  const queue = useUploadQueue(`/api/e/${event.slug}/photos`, onUploaded);
  const Capture = captureComponents[event.captureMode];

  // Don't let a guest queue more files than their quota allows: the extra ones would only fail.
  const pending = queue.items.filter((i) => i.status !== "done" && i.status !== "error").length;
  const left = remaining === null ? null : Math.max(remaining - pending, 0);
  const disabled = closedReason !== null || left === 0;

  const onFiles = (files: File[]) => queue.add(left === null ? files : files.slice(0, left));

  return (
    <div className="space-y-5">
      <section className="relative rounded-camera bg-accent px-5 pt-5 pb-7 text-accent-ink shadow-[inset_0_-6px_0_rgb(0_0_0/0.08)]">
        <div className="flex justify-end">
          <ExposureCounter remaining={left} sent={sent} />
        </div>
        <div className="-mt-4">
          <Capture event={event} onFiles={onFiles} disabled={disabled} remaining={left} />
        </div>
        {closedReason && (
          <p className="mt-5 text-center text-[15px] font-medium text-pretty">{t(closedReason === "quota" ? "guest.quota" : "guest.closed")}</p>
        )}
      </section>
      <UploadTray items={queue.items} onRetry={queue.retry} onDismiss={queue.dismiss} />
    </div>
  );
}
