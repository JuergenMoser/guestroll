"use client";

import { ImagePlus } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { ShutterButton } from "./ShutterButton";
import type { CaptureProps } from "./types";
import { useFileInput } from "./useFileInput";

export function CameraAndPickerCapture({ onFiles, disabled }: CaptureProps) {
  const t = useT();
  const camera = useFileInput(onFiles, { camera: true, multiple: false });
  const picker = useFileInput(onFiles, { camera: false, multiple: true });
  return (
    <div className="flex flex-col items-center gap-3">
      {camera.input}
      {picker.input}
      <ShutterButton onClick={camera.open} disabled={disabled} label={t("guest.takePhoto")} />
      <span className="text-base font-semibold text-accent-ink">{t("guest.takePhoto")}</span>
      <button
        type="button"
        onClick={picker.open}
        disabled={disabled}
        className="mt-2 inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-medium text-accent-ink underline decoration-accent-ink/40 underline-offset-4 hover:decoration-accent-ink disabled:opacity-35"
      >
        <ImagePlus className="size-4" aria-hidden />
        {t("guest.pickPhotos")}
      </button>
    </div>
  );
}
