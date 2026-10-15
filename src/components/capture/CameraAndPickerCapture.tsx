"use client";

import { ImagePlus } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { Button } from "@/components/ui";
import { ShutterButton } from "./ShutterButton";
import type { CaptureProps } from "./types";
import { useFileInput } from "./useFileInput";

export function CameraAndPickerCapture({ onFiles, disabled }: CaptureProps) {
  const t = useT();
  const camera = useFileInput(onFiles, { camera: true, multiple: false });
  const picker = useFileInput(onFiles, { camera: false, multiple: true });
  return (
    <div className="flex flex-col items-center gap-5">
      {camera.input}
      {picker.input}
      <ShutterButton onClick={camera.open} disabled={disabled} label={t("guest.takePhoto")} />
      <Button variant="secondary" onClick={picker.open} disabled={disabled}>
        <ImagePlus className="size-4" aria-hidden />
        {t("guest.pickPhotos")}
      </Button>
    </div>
  );
}
