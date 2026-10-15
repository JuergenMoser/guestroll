/** How an event's QR code looks. Stored as JSON on the event, rendered by `render.ts`. */
export interface QrStyle {
  foreground: string;
  background: string;
  transparent: boolean;
  modules: "square" | "rounded" | "dots";
  eyes: "square" | "rounded" | "circle";
  eyeColor: string;
  /** Quiet zone, in modules. Scanners want at least 2; 4 is the spec. */
  margin: number;
  logo: boolean;
  /** Logo width as a share of the code's width. */
  logoScale: number;
  /** Optional caption printed under the code, inside the frame. */
  label: string;
}

export const MODULE_SHAPES = ["square", "rounded", "dots"] as const;
export const EYE_SHAPES = ["square", "rounded", "circle"] as const;

export const DEFAULT_QR_STYLE: QrStyle = {
  foreground: "#0c0a09",
  background: "#ffffff",
  transparent: false,
  modules: "square",
  eyes: "square",
  eyeColor: "#0c0a09",
  margin: 2,
  logo: false,
  logoScale: 0.22,
  label: "",
};

export const QR_PRESETS: { id: string; style: Partial<QrStyle> }[] = [
  { id: "classic", style: {} },
  { id: "soft", style: { modules: "dots", eyes: "rounded" } },
  // Dark on light on purpose: plenty of Android scanners can't read inverted codes.
  { id: "ember", style: { foreground: "#1c1917", background: "#fef3c7", eyeColor: "#b45309", modules: "rounded", eyes: "rounded" } },
  { id: "accent", style: { modules: "rounded", eyes: "circle" } },
];

const COLOR = /^#[0-9a-f]{6}$/i;

/**
 * Accepts anything (stored JSON, a request body) and returns a complete, safe
 * style: unknown keys are dropped and invalid values fall back to the default.
 * Colors are strictly `#rrggbb` because they are written into SVG markup.
 */
export function parseQrStyle(input: unknown): QrStyle {
  const src = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const color = (v: unknown, fallback: string) => (typeof v === "string" && COLOR.test(v) ? v.toLowerCase() : fallback);
  const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T) =>
    allowed.includes(v as T) ? (v as T) : fallback;
  const number = (v: unknown, min: number, max: number, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.min(Math.max(v, min), max) : fallback;
  const d = DEFAULT_QR_STYLE;

  return {
    foreground: color(src.foreground, d.foreground),
    background: color(src.background, d.background),
    transparent: typeof src.transparent === "boolean" ? src.transparent : d.transparent,
    modules: pick(src.modules, MODULE_SHAPES, d.modules),
    eyes: pick(src.eyes, EYE_SHAPES, d.eyes),
    eyeColor: color(src.eyeColor, d.eyeColor),
    margin: Math.round(number(src.margin, 0, 8, d.margin)),
    logo: typeof src.logo === "boolean" ? src.logo : d.logo,
    logoScale: number(src.logoScale, 0.12, 0.3, d.logoScale),
    label: typeof src.label === "string" ? src.label.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 40) : d.label,
  };
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG-style relative luminance contrast: below ~3 most phone scanners struggle. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Light code on a darker background: iOS copes, many Android scanners don't. */
export function isInverted(style: Pick<QrStyle, "foreground" | "background" | "transparent">): boolean {
  return !style.transparent && luminance(style.foreground) > luminance(style.background);
}
