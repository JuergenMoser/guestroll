import type { ComponentType } from "react";
import type { CaptureMode } from "@/lib/constants";
import { CameraAndPickerCapture } from "./CameraAndPickerCapture";
import { CameraCapture } from "./CameraCapture";
import { PickerCapture } from "./PickerCapture";
import type { CaptureProps } from "./types";

/**
 * Which component renders each capture mode. This is the one line to change to
 * ship your own capture UI: point a mode at your component and every event using
 * that mode picks it up, upload included. See docs/customization.md.
 */
export const captureComponents: Record<CaptureMode, ComponentType<CaptureProps>> = {
  camera: CameraCapture,
  picker: PickerCapture,
  both: CameraAndPickerCapture,
};
