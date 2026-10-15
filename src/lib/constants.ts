// Shared by server and browser code: no env reads, no Node imports here.
export const LOCALES = ["en", "fr", "it", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const CAPTURE_MODES = ["camera", "picker", "both"] as const;
export type CaptureMode = (typeof CAPTURE_MODES)[number];
