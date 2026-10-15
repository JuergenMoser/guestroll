"use client";

import { ImagePlus } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { Button } from "@/components/ui";
import type { CaptureProps } from "./types";
import { useFileInput } from "./useFileInput";

/** Library only: for events where guests share photos after the fact. */
export function PickerCapture({ onFiles, disabled }: CaptureProps) {
  const t = useT();
  const picker = useFileInput(onFiles, { camera: false, multiple: true });
  return (
    <div className="flex flex-col items-center">
      {picker.input}
      <Button size="lg" onClick={picker.open} disabled={disabled}>
        <ImagePlus className="size-5" aria-hidden />
        {t("guest.pickPhotos")}
      </Button>
    </div>
  );
}
