import { BinaryBitmap, HybridBinarizer, QRCodeReader, RGBLuminanceSource } from "@zxing/library";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshEnv } from "../helpers/env";
import { png } from "../helpers/images";

let env: Awaited<ReturnType<typeof freshEnv>>;
beforeEach(async () => {
  env = await freshEnv({ PUBLIC_URL: "https://photos.example.com" });
});
afterEach(() => env.cleanup());

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

async function decode(buffer: Buffer): Promise<string> {
  const { data, info } = await sharp(buffer).flatten({ background: "#fff" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const source = new RGBLuminanceSource(new Uint8ClampedArray(data), info.width, info.height);
  return new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(source))).getText();
}

describe("event QR export", () => {
  it("encodes PUBLIC_URL + the slug, logo and caption included, at the asked size", async () => {
    const events = await import("@/lib/events");
    const { writeLogo } = await import("@/lib/storage/files");
    const { processLogo } = await import("@/lib/images/process");
    const { eventQrPng, eventQrSvg } = await import("@/lib/qr/server");

    let event = events.createEvent({ name: "Party" });
    await writeLogo(event.id, await processLogo(await png(300, 300)));
    event = events.setLogoVersion(event.id, Date.now())!;
    event = events.updateEvent(event.id, { qrStyle: JSON.stringify({ modules: "dots", eyes: "rounded", logo: true, label: "Scan me" }) })!;

    const svg = await eventQrSvg(event);
    expect(svg).toContain("data:image/png;base64,");
    expect(svg).toContain("Scan me");

    const image = await eventQrPng(event, 1024);
    expect((await sharp(image).metadata()).width).toBe(1024);
    expect(await decode(image)).toBe(`https://photos.example.com/e/${event.slug}`);
  });
});
