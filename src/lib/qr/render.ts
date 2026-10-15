import QRCode from "qrcode";
import type { QrStyle } from "./style";

/**
 * Pure SVG renderer shared by the admin's live preview (browser) and the
 * downloads and poster (server), so what you design is exactly what you print.
 */

const UNIT = 10;
const FINDER = 7;

export interface QrMatrix {
  size: number;
  isDark: (row: number, col: number) => boolean;
  /** Function patterns (timing, alignment, format info): drawn square whatever the style. */
  isStructural?: (row: number, col: number) => boolean;
}

export function qrMatrix(text: string, style: Pick<QrStyle, "logo">): QrMatrix {
  // A logo hides the centre of the code: H recovers up to 30% of damaged modules.
  const qr = QRCode.create(text, { errorCorrectionLevel: style.logo ? "H" : "M" });
  const { size, data, reservedBit } = qr.modules as typeof qr.modules & { reservedBit: Uint8Array };
  return {
    size,
    isDark: (row, col) => data[row * size + col] === 1,
    isStructural: (row, col) => reservedBit[row * size + col] === 1,
  };
}

const escapeXml = (s: string) =>
  s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);

function inFinder(row: number, col: number, size: number): boolean {
  const near = (v: number, start: number) => v >= start && v < start + FINDER;
  return (near(row, 0) && near(col, 0)) || (near(row, 0) && near(col, size - FINDER)) || (near(row, size - FINDER) && near(col, 0));
}

function eye(x: number, y: number, shape: QrStyle["eyes"], color: string): string {
  const outer = FINDER * UNIT;
  const inner = 3 * UNIT;
  const innerOffset = 2 * UNIT;
  if (shape === "circle") {
    const c = outer / 2;
    return (
      `<circle cx="${x + c}" cy="${y + c}" r="${c - UNIT / 2}" fill="none" stroke="${color}" stroke-width="${UNIT}"/>` +
      `<circle cx="${x + c}" cy="${y + c}" r="${inner / 2}" fill="${color}"/>`
    );
  }
  // Gentle radii: rounder corners break the 1:1:3:1:1 ratio scanners look for.
  const r = shape === "rounded" ? UNIT * 1.5 : 0;
  const ri = shape === "rounded" ? UNIT : 0;
  // Ring = outer square minus inner hole, drawn with even-odd so one path does it.
  const ring =
    `<path fill="${color}" fill-rule="evenodd" d="` +
    roundedRect(x, y, outer, outer, r) +
    roundedRect(x + UNIT, y + UNIT, outer - 2 * UNIT, outer - 2 * UNIT, Math.max(r - UNIT, 0)) +
    `"/>`;
  return ring + `<rect x="${x + innerOffset}" y="${y + innerOffset}" width="${inner}" height="${inner}" rx="${ri}" fill="${color}"/>`;
}

function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
  if (r === 0) return `M${x} ${y}h${w}v${h}h${-w}z`;
  return (
    `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}` +
    `h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`
  );
}

export interface RenderOptions {
  /** Image to place in the centre (data URI or URL). Ignored unless `style.logo`. */
  logoHref?: string;
  /** Font for the caption. The server falls back to whatever sans-serif is installed. */
  fontFamily?: string;
}

export function renderQrSvg(matrix: QrMatrix, style: QrStyle, options: RenderOptions = {}): string {
  const { size } = matrix;
  const margin = style.margin * UNIT;
  const codeSize = size * UNIT;
  const width = codeSize + 2 * margin;
  const labelHeight = style.label ? Math.max(margin, UNIT * 2) + UNIT * 4 : 0;
  const height = width + labelHeight;

  const withLogo = style.logo && Boolean(options.logoHref);
  // Odd module count keeps the logo centred on the grid.
  let logoModules = Math.round(size * style.logoScale);
  if (logoModules % 2 === 0) logoModules += 1;
  const logoStart = Math.floor((size - logoModules) / 2);
  // Only the logo's own square is cleared: every module removed eats into the
  // 30% that error correction H can recover.
  const excavated = (row: number, col: number) =>
    withLogo && row >= logoStart && row < logoStart + logoModules && col >= logoStart && col < logoStart + logoModules;

  const background = style.transparent
    ? ""
    : `<rect width="${width}" height="${height}" rx="${style.label ? UNIT * 2 : 0}" fill="${style.background}"/>`;

  const shapes: string[] = [];
  let squares = "";
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!matrix.isDark(row, col) || inFinder(row, col, size) || excavated(row, col)) continue;
      const x = margin + col * UNIT;
      const y = margin + row * UNIT;
      // Scanners locate and sample the grid from the timing and alignment patterns:
      // keeping those square is what lets dots and rounded styles still decode.
      if (style.modules === "square" || matrix.isStructural?.(row, col)) squares += `M${x} ${y}h${UNIT}v${UNIT}h${-UNIT}z`;
      else if (style.modules === "dots") shapes.push(`<circle cx="${x + UNIT / 2}" cy="${y + UNIT / 2}" r="${UNIT * 0.5}"/>`);
      else if (style.modules === "rounded") shapes.push(`<rect x="${x + 0.5}" y="${y + 0.5}" width="${UNIT - 1}" height="${UNIT - 1}" rx="${UNIT * 0.32}"/>`);
    }
  }
  const moduleGroup = `<g fill="${style.foreground}">${squares ? `<path d="${squares}"/>` : ""}${shapes.join("")}</g>`;

  const eyes = [
    [0, 0],
    [size - FINDER, 0],
    [0, size - FINDER],
  ]
    .map(([col, row]) => eye(margin + col * UNIT, margin + row * UNIT, style.eyes, style.eyeColor))
    .join("");

  let logo = "";
  if (withLogo) {
    const box = logoModules * UNIT;
    const x = margin + logoStart * UNIT;
    const plate = style.transparent ? "" : `<rect x="${x - UNIT / 2}" y="${x - UNIT / 2}" width="${box + UNIT}" height="${box + UNIT}" rx="${UNIT * 1.5}" fill="${style.background}"/>`;
    logo = `${plate}<image href="${escapeXml(options.logoHref!)}" x="${x}" y="${x}" width="${box}" height="${box}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  let label = "";
  if (style.label) {
    const font = options.fontFamily ?? "Geist, Inter, 'DejaVu Sans', system-ui, sans-serif";
    label = `<text x="${width / 2}" y="${width + labelHeight / 2}" text-anchor="middle" dominant-baseline="central" font-family="${escapeXml(font)}" font-size="${UNIT * 2.6}" font-weight="600" letter-spacing="1" fill="${style.foreground}">${escapeXml(style.label)}</text>`;
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" shape-rendering="${style.modules === "square" ? "crispEdges" : "geometricPrecision"}">` +
    background +
    moduleGroup +
    eyes +
    logo +
    label +
    `</svg>`
  );
}
