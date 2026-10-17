"use client";

import { ImagePlus } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import type { CaptureProps } from "./types";
import { useFileInput } from "./useFileInput";

/** Library only: for events where guests share photos after the fact. */
export function PickerCapture({ onFiles, disabled, event }: CaptureProps) {
  const t = useT();
  const picker = useFileInput(onFiles, { camera: false, multiple: true, video: Boolean(event.videos) });
  return (
    <div className="flex flex-col items-center">
      {picker.input}
      <button
        type="button"
        onClick={picker.open}
        disabled={disabled}
        className="inline-flex h-16 items-center gap-3 rounded-2xl border-[3px] border-accent-ink px-7 text-lg font-semibold text-accent-ink transition hover:bg-accent-ink/10 disabled:opacity-35"
      >
        <ImagePlus className="size-6" aria-hidden />
        {t(event.videos ? "guest.pickMedia" : "guest.pickPhotos")}
      </button>
    </div>
  );
}
