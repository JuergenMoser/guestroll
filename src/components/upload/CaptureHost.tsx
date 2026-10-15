"use client";

import { captureComponents } from "@/components/capture/registry";
import { useT } from "@/components/I18nProvider";
import type { PublicEvent } from "@/lib/events";
import type { PhotoDto } from "@/lib/photos";
import { useState } from "react";
import { ChallengePicker } from "./ChallengePicker";
import { ExposureCounter } from "./ExposureCounter";
import { UploadTray } from "./UploadTray";
import { useUploadQueue } from "./useUploadQueue";

interface CaptureHostProps {
  event: PublicEvent;
  /** Challenges this guest already answered, from their own photos. */
  doneChallenges: ReadonlySet<string>;
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
export function CaptureHost({ event, doneChallenges, closedReason, remaining, sent, onUploaded }: CaptureHostProps) {
  const t = useT();
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const challenge = event.challenges.find((c) => c.id === challengeId);
  const queue = useUploadQueue(`/api/e/${event.slug}/photos`, onUploaded);
  const Capture = captureComponents[event.captureMode];

  // Don't let a guest queue more files than their quota allows: the extra ones would only fail.
  const pending = queue.items.filter((i) => i.status !== "done" && i.status !== "error").length;
  const left = remaining === null ? null : Math.max(remaining - pending, 0);
  const disabled = closedReason !== null || left === 0;

  // The challenge is read when the files are queued, so switching it later doesn't retag photos still uploading.
  const onFiles = (files: File[]) => queue.add(left === null ? files : files.slice(0, left), challenge?.id ?? null);

  return (
    <div className="space-y-5">
      {event.challenges.length > 0 && !closedReason && (
        <ChallengePicker challenges={event.challenges} value={challengeId} onChange={setChallengeId} done={doneChallenges} />
      )}
      <section className="relative rounded-camera bg-accent px-5 pt-5 pb-7 text-accent-ink shadow-[inset_0_-6px_0_rgb(0_0_0/0.08)]">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 pt-1 text-[15px] font-semibold text-pretty">{challenge ? t("guest.challengeActive", { label: challenge.label }) : null}</p>
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
