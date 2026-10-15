"use client";

import { useT } from "@/components/I18nProvider";
import { ShutterButton } from "./ShutterButton";
import type { CaptureProps } from "./types";
import { useFileInput } from "./useFileInput";

/** Default: one shutter button that opens the phone's camera. */
export function CameraCapture({ onFiles, disabled }: CaptureProps) {
  const t = useT();
  const camera = useFileInput(onFiles, { camera: true, multiple: false });
  return (
    <div className="flex flex-col items-center gap-3">
      {camera.input}
      <ShutterButton onClick={camera.open} disabled={disabled} label={t("guest.takePhoto")} />
      <span className="text-sm font-medium text-ink-300">{t("guest.takePhoto")}</span>
    </div>
  );
}
