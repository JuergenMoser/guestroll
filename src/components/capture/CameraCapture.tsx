"use client";

import { useT } from "@/components/I18nProvider";
import { ShutterButton } from "./ShutterButton";
import type { CaptureProps } from "./types";
import { useFileInput } from "./useFileInput";

/** Default: one shutter button that opens the phone's camera. */
export function CameraCapture({ onFiles, disabled, event }: CaptureProps) {
  const t = useT();
  const camera = useFileInput(onFiles, { camera: true, multiple: false, video: Boolean(event.videos) });
  return (
    <div className="flex flex-col items-center gap-3">
      {camera.input}
      <ShutterButton onClick={camera.open} disabled={disabled} label={t(event.videos ? "guest.takeMedia" : "guest.takePhoto")} />
      <span className="text-base font-semibold text-accent-ink">{t(event.videos ? "guest.takeMedia" : "guest.takePhoto")}</span>
    </div>
  );
}
