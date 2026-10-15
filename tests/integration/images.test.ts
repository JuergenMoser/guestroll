import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { config } from "@/lib/config";
import { InvalidImageError, processLogo, processPhoto } from "@/lib/images/process";
import { jpeg, png } from "../helpers/images";

describe("processPhoto", () => {
  it("produces the three variants at the expected sizes", async () => {
    const out = await processPhoto(await jpeg({ width: 3000, height: 2000 }));
    expect(out.width).toBe(3000);
    expect(out.height).toBe(2000);
    const display = await sharp(out.files.display).metadata();
    const thumb = await sharp(out.files.thumb).metadata();
    expect(Math.max(display.width!, display.height!)).toBe(1600);
    expect(display.format).toBe("webp");
    expect([thumb.width, thumb.height]).toEqual([480, 480]);
    expect((await sharp(out.files.original).metadata()).format).toBe("jpeg");
  });

  it("strips EXIF metadata, GPS included, from every variant", async () => {
    const input = await jpeg({ gps: true });
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const out = await processPhoto(input);
    for (const variant of Object.values(out.files)) {
      const meta = await sharp(variant).metadata();
      expect(meta.exif).toBeUndefined();
    }
  });

  it("accepts PNG and never upscales small images", async () => {
    const out = await processPhoto(await png(400, 300));
    const display = await sharp(out.files.display).metadata();
    expect([display.width, display.height]).toEqual([400, 300]);
  });

  it("decodes HEIC from an iPhone that skipped the conversion", async () => {
    const out = await processPhoto(await readFile("tests/fixtures/sample.heic"));
    expect([out.width, out.height]).toEqual([320, 240]);
    expect((await sharp(out.files.original).metadata()).format).toBe("jpeg");
  });

  it("refuses a HEIC over the pixel limit before decoding it", async () => {
    const limits = config as { maxImagePixels: number };
    const saved = limits.maxImagePixels;
    limits.maxImagePixels = 320 * 240 - 1;
    try {
      await expect(processPhoto(await readFile("tests/fixtures/sample.heic"))).rejects.toThrow("Image too large");
    } finally {
      limits.maxImagePixels = saved;
    }
  });

  it("processes a burst of uploads a few at a time, and every one completes", async () => {
    const inputs = await Promise.all(Array.from({ length: 8 }, () => png(200, 150)));
    const outs = await Promise.all(inputs.map((i) => processPhoto(i)));
    expect(outs.every((o) => o.width === 200)).toBe(true);
  });

  it("rejects files that aren't images, whatever they claim to be", async () => {
    await expect(processPhoto(Buffer.from("<?php echo 'hi'; ?>"))).rejects.toBeInstanceOf(InvalidImageError);
    await expect(processPhoto(Buffer.from("%PDF-1.7\n%âãÏÓ"))).rejects.toBeInstanceOf(InvalidImageError);
    await expect(processPhoto(Buffer.alloc(0))).rejects.toBeInstanceOf(InvalidImageError);
  });

  it("rejects a truncated image instead of crashing", async () => {
    const full = await jpeg();
    await expect(processPhoto(full.subarray(0, 200))).rejects.toBeInstanceOf(InvalidImageError);
  });

  it("drops anything appended after the image data", async () => {
    const payload = Buffer.from("<script>alert(1)</script>");
    const out = await processPhoto(Buffer.concat([await jpeg(), payload]));
    for (const variant of Object.values(out.files)) expect(variant.includes(payload)).toBe(false);
  });
});

describe("processLogo", () => {
  it("fits the logo in a transparent 512 px square", async () => {
    const meta = await sharp(await processLogo(await png(800, 200))).metadata();
    expect([meta.width, meta.height, meta.format, meta.hasAlpha]).toEqual([512, 512, "png", true]);
  });

  it("refuses SVG, which could carry scripts into downloadable files", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    await expect(processLogo(svg)).rejects.toBeInstanceOf(InvalidImageError);
  });
});
