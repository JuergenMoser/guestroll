import { BinaryBitmap, HybridBinarizer, QRCodeReader, RGBLuminanceSource } from "@zxing/library";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { qrMatrix, renderQrSvg } from "@/lib/qr/render";
import { DEFAULT_QR_STYLE, EYE_SHAPES, isInverted, MODULE_SHAPES, parseQrStyle, QR_PRESETS, type QrStyle } from "@/lib/qr/style";

/**
 * A pretty QR code that phones can't read would ruin an event. Every preset and
 * shape is rasterised at two sizes and decoded with ZXing, the engine behind
 * many Android scanners, including with the largest logo allowed.
 */
const URL = "https://photos.example.com/e/julie-thomas-jw5d8ykt";
const WIDTHS = [400, 900];

const LOGO = sharp(
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><circle cx="128" cy="128" r="120" fill="#f59e0b"/><rect x="70" y="100" width="116" height="56" fill="#0c0a09"/></svg>',
  ),
)
  .png()
  .toBuffer()
  .then((png) => `data:image/png;base64,${png.toString("base64")}`);

async function decode(style: QrStyle, width: number): Promise<string | null> {
  const svg = renderQrSvg(qrMatrix(URL, style), style, { logoHref: style.logo ? await LOGO : undefined });
  // Scanners see a flattened image: transparent codes are tested on white, like paper.
  const { data, info } = await sharp(Buffer.from(svg), { density: 150 })
    .flatten({ background: "#ffffff" })
    .resize({ width })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  try {
    const source = new RGBLuminanceSource(new Uint8ClampedArray(data), info.width, info.height);
    return new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(source))).getText();
  } catch {
    return null;
  }
}

describe("styled QR codes stay scannable", () => {
  for (const { id, style } of QR_PRESETS) {
    for (const logo of [false, true]) {
      it(`preset ${id}${logo ? " with the largest logo" : ""}`, async () => {
        for (const width of WIDTHS) {
          expect(await decode(parseQrStyle({ ...style, logo, logoScale: 0.3 }), width), `${width}px`).toBe(URL);
        }
      });
    }
  }

  for (const modules of MODULE_SHAPES) {
    for (const eyes of EYE_SHAPES) {
      it(`${modules} modules, ${eyes} eyes, with a caption`, async () => {
        for (const width of WIDTHS) {
          expect(await decode({ ...DEFAULT_QR_STYLE, modules, eyes, label: "Scan me" }, width), `${width}px`).toBe(URL);
        }
      });
    }
  }

  it("no preset is inverted (many Android scanners can't read light-on-dark)", () => {
    for (const { id, style } of QR_PRESETS) expect(isInverted(parseQrStyle(style)), id).toBe(false);
    expect(isInverted({ ...DEFAULT_QR_STYLE, foreground: "#ffffff", background: "#000000" })).toBe(true);
    expect(isInverted({ ...DEFAULT_QR_STYLE, foreground: "#ffffff", transparent: true })).toBe(false);
  });
});
