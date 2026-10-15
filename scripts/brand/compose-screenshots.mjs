// Frames raw screenshots for the README: a phone, a laptop window, and the
// hero that puts them side by side. Usage:
//   node scripts/brand/compose-screenshots.mjs <raw-dir> <out-dir>
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [raw, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const PAPER = "#e9ebe6";

const roundedMask = (w, h, r) => Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" ry="${r}"/></svg>`);

async function rounded(input, width, radius) {
  const img = sharp(input).resize({ width });
  const { height } = await img.clone().metadata().then(async () => (await img.clone().toBuffer({ resolveWithObject: true })).info);
  return { buffer: await img.composite([{ input: roundedMask(width, height, radius), blend: "dest-in" }]).png().toBuffer(), width, height };
}

/** A phone: dark bezel, rounded screen. */
async function phone(file, screenWidth) {
  const screen = await rounded(path.join(raw, file), screenWidth, Math.round(screenWidth * 0.11));
  const bezel = Math.round(screenWidth * 0.035);
  const w = screen.width + bezel * 2;
  const h = screen.height + bezel * 2;
  const body = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${Math.round(w * 0.14)}" fill="#151618"/></svg>`);
  return { buffer: await sharp(body).composite([{ input: screen.buffer, left: bezel, top: bezel }]).png().toBuffer(), width: w, height: h };
}

/** A laptop window: thin title bar, rounded corners. */
async function windowFrame(file, width) {
  const bar = Math.round(width * 0.028);
  const shot = await sharp(path.join(raw, file)).resize({ width }).toBuffer({ resolveWithObject: true });
  const h = shot.info.height + bar;
  const dots = [0, 1, 2].map((i) => `<circle cx="${bar * (0.9 + i * 0.7)}" cy="${bar / 2}" r="${bar * 0.18}" fill="#c2c6bd"/>`).join("");
  const frame = Buffer.from(`<svg width="${width}" height="${h}"><rect width="${width}" height="${h}" fill="#ffffff"/><rect width="${width}" height="${bar}" fill="#f7f8f5"/>${dots}</svg>`);
  const composed = await sharp(frame).composite([{ input: shot.data, left: 0, top: bar }]).png().toBuffer();
  return { buffer: await sharp(composed).composite([{ input: roundedMask(width, h, Math.round(width * 0.012)), blend: "dest-in" }]).png().toBuffer(), width, height: h };
}

const shadow = (w, h, r, blur) =>
  sharp(Buffer.from(`<svg width="${w + blur * 4}" height="${h + blur * 4}"><rect x="${blur * 2}" y="${blur * 2.6}" width="${w}" height="${h}" rx="${r}" fill="rgba(20,22,24,0.28)"/></svg>`)).blur(blur).png().toBuffer();

async function onPaper(items, width, height, file) {
  const layers = [];
  for (const it of items) {
    layers.push({ input: await shadow(it.width, it.height, Math.round(it.width * 0.05), 18), left: it.left - 36, top: it.top - 36 });
    layers.push({ input: it.buffer, left: it.left, top: it.top });
  }
  await sharp({ create: { width, height, channels: 3, background: PAPER } }).composite(layers).png({ compressionLevel: 9 }).toFile(path.join(out, file));
}

const guest = await phone("guest.png", 520);
const dash = await windowFrame("dashboard.png", 1560);
await onPaper(
  [
    { ...dash, left: 520, top: 90 },
    { ...guest, left: 120, top: 200 },
  ],
  2200,
  Math.max(dash.height + 180, guest.height + 260),
  "hero.png",
);

// The phone alone on a transparent background, for pages with their own theme.
const bare = await phone("guest.png", 600);
await sharp(bare.buffer).png({ compressionLevel: 9 }).toFile(path.join(out, "guest-phone.png"));

const g1 = await phone("guest.png", 600);
await onPaper([{ ...g1, left: 120, top: 100 }], g1.width + 240, g1.height + 220, "guest.png");
const gd = await phone("guest-dark.png", 600);
await onPaper([{ ...gd, left: 120, top: 100 }], gd.width + 240, gd.height + 220, "guest-dark.png");

for (const name of ["moderation", "share", "settings", "dashboard-dark", "wall"]) {
  const win = await windowFrame(`${name}.png`, 1600);
  await onPaper([{ ...win, left: 100, top: 90 }], win.width + 200, win.height + 200, `${name}.png`);
}
console.log("composed");
