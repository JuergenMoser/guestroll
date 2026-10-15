import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };

const fontsDir = path.join(/*turbopackIgnore: true*/ process.cwd(), "assets", "fonts");

let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 600; style: "normal" }[]> | undefined;

/** Loaded once per process: next/og needs the raw font files on every render. */
export function ogFonts() {
  fonts ??= Promise.all([
    fs.readFile(path.join(fontsDir, "InstrumentSerif-Regular.woff")).then((data) => ({ name: "Instrument Serif", data, weight: 400 as const, style: "normal" as const })),
    fs.readFile(path.join(fontsDir, "Geist-Regular.woff")).then((data) => ({ name: "Geist", data, weight: 400 as const, style: "normal" as const })),
    fs.readFile(path.join(fontsDir, "Geist-SemiBold.woff")).then((data) => ({ name: "Geist", data, weight: 600 as const, style: "normal" as const })),
  ]);
  return fonts;
}

/** The shutter logo, drawn inline so the image needs no other asset. */
export function OgLogo({ size, accent = "#f59e0b" }: { size: number; accent?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512">
      <circle cx="256" cy="256" r="150" fill="none" stroke={accent} strokeWidth="36" />
      <circle cx="256" cy="256" r="98" fill="#f4efe7" />
      <circle cx="404" cy="108" r="22" fill={accent} />
    </svg>
  );
}
