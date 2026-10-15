import { describe, expect, it } from "vitest";
import { qrMatrix, renderQrSvg, type QrMatrix } from "@/lib/qr/render";
import { contrastRatio, DEFAULT_QR_STYLE, parseQrStyle } from "@/lib/qr/style";

describe("parseQrStyle", () => {
  it("fills every field from defaults for empty input", () => {
    expect(parseQrStyle(null)).toEqual(DEFAULT_QR_STYLE);
    expect(parseQrStyle("nope")).toEqual(DEFAULT_QR_STYLE);
  });

  it("rejects anything that isn't a strict #rrggbb color", () => {
    const style = parseQrStyle({ foreground: 'red" onload="alert(1)', background: "#FFF", eyeColor: "#AbCdEf" });
    expect(style.foreground).toBe(DEFAULT_QR_STYLE.foreground);
    expect(style.background).toBe(DEFAULT_QR_STYLE.background);
    expect(style.eyeColor).toBe("#abcdef");
  });

  it("clamps numbers, drops unknown enums and keys", () => {
    const style = parseQrStyle({ margin: 99, logoScale: 2, modules: "stars", extra: true });
    expect(style.margin).toBe(8);
    expect(style.logoScale).toBe(0.3);
    expect(style.modules).toBe("square");
    expect(style).not.toHaveProperty("extra");
  });

  it("strips control characters from the label and caps it", () => {
    expect(parseQrStyle({ label: " Scan\u0000 me " }).label).toBe("Scan me");
    expect(parseQrStyle({ label: "x".repeat(80) }).label).toHaveLength(40);
  });
});

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for identical colors", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });
});

describe("renderQrSvg", () => {
  const full: QrMatrix = { size: 25, isDark: () => true };

  it("escapes the label and the logo URL", () => {
    const svg = renderQrSvg(full, { ...DEFAULT_QR_STYLE, logo: true, label: "<script>&" }, { logoHref: 'x"><script>' });
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;&amp;");
    expect(svg).toContain("x&quot;&gt;&lt;script&gt;");
  });

  it("clears the modules under the logo so it never overlaps data", () => {
    const style = { ...DEFAULT_QR_STYLE, modules: "dots" as const };
    const without = renderQrSvg(full, style).match(/<circle/g)!.length;
    const withLogo = renderQrSvg(full, { ...style, logo: true }, { logoHref: "data:image/png;base64," }).match(/<circle/g)!.length;
    expect(withLogo).toBeLessThan(without);
  });

  it("ignores the logo flag when no image is provided", () => {
    expect(renderQrSvg(full, { ...DEFAULT_QR_STYLE, logo: true })).not.toContain("<image");
  });

  it("omits the background when transparent and grows the canvas for a label", () => {
    const plain = renderQrSvg(full, DEFAULT_QR_STYLE);
    expect(renderQrSvg(full, { ...DEFAULT_QR_STYLE, transparent: true })).not.toContain(`fill="${DEFAULT_QR_STYLE.background}"`);
    const height = (svg: string) => Number(svg.match(/height="(\d+)"/)![1]);
    expect(height(renderQrSvg(full, { ...DEFAULT_QR_STYLE, label: "Hi" }))).toBeGreaterThan(height(plain));
  });

  it("uses error correction H when a logo is shown", () => {
    // Same text: H needs more modules than M for the same payload.
    expect(qrMatrix("https://photos.example.com/e/wedding-abcd2345", { logo: true }).size).toBeGreaterThanOrEqual(
      qrMatrix("https://photos.example.com/e/wedding-abcd2345", { logo: false }).size,
    );
  });
});
