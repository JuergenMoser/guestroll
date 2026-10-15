// Captures the website's images from a running, seeded instance, in light and
// dark: real UI at 2-3x, cropped to the part that matters, phones framed on a
// transparent background, all exported as WebP.
//   node scripts/brand/capture-site.mjs <base> <admin-password> <photos-dir> <logo.png> <out-dir>
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import sharp from "sharp";

const [base, password, photosDir, logoFile, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const photos = fs.readdirSync(photosDir).filter((f) => f.endsWith(".jpg")).sort().map((f) => fs.readFileSync(path.join(photosDir, f)).toString("base64"));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb"] });

async function page({ theme, width, height, scale, mobile = false, admin = false, lang = "en" }) {
  const ctx = await browser.createBrowserContext();
  const p = await ctx.newPage();
  await p.setExtraHTTPHeaders({ "Accept-Language": lang });
  await p.setViewport({ width, height, deviceScaleFactor: scale, isMobile: mobile, hasTouch: mobile });
  await p.emulateMediaFeatures([{ name: "prefers-color-scheme", value: theme }]);
  await p.goto(base + "/api/health");
  await ctx.setCookie({ name: "gr_theme", value: theme, domain: new URL(base).hostname, path: "/" });
  if (admin) await p.evaluate((pw) => fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) }), password);
  return p;
}

const api = (p, url, body, method = "POST") =>
  p.evaluate(
    async (url, body, method) => {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      return res.json();
    },
    url,
    body,
    method,
  );

async function webp(buffer, name) {
  await sharp(buffer).webp({ quality: 88, effort: 6 }).toFile(path.join(out, `${name}.webp`));
  console.log("wrote", name);
}

/** The phone: dark bezel, rounded screen, transparent around it. */
async function framePhone(shot) {
  const screen = sharp(shot);
  const { width, height } = await screen.metadata();
  const radius = Math.round(width * 0.12);
  const mask = Buffer.from(`<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}"/></svg>`);
  const rounded = await screen.composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  const bezel = Math.round(width * 0.035);
  const w = width + bezel * 2;
  const h = height + bezel * 2;
  const body = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${radius + bezel}" fill="#151618"/><rect x="1.5" y="1.5" width="${w - 3}" height="${h - 3}" rx="${radius + bezel - 1}" fill="none" stroke="#3a3d42" stroke-width="3"/></svg>`);
  return sharp(body).composite([{ input: rounded, left: bezel, top: bezel }]).png().toBuffer();
}

async function clip(p, selector, { pad = 0, maxHeight } = {}) {
  const box = await p.$eval(selector, (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x + window.scrollX, y: r.y + window.scrollY, width: r.width, height: r.height };
  });
  return p.screenshot({ clip: { x: box.x - pad, y: box.y - pad, width: box.width + pad * 2, height: Math.min(box.height, maxHeight ?? Infinity) + pad * 2 }, captureBeyondViewport: true });
}

// ---- Set the scene: logo and QR style on the wedding, ids for later ----
const setup = await page({ theme: "light", width: 1200, height: 800, scale: 1, admin: true });
const { events } = await api(setup, "/api/admin/events", undefined, "GET");
const wedding = events.find((e) => e.name.startsWith("Julie"));
const festa = events.find((e) => e.name.startsWith("Festa"));
await setup.evaluate(async (id, b64) => {
  const form = new FormData();
  form.append("logo", new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: "image/png" }), "logo.png");
  await fetch(`/api/admin/events/${id}/logo`, { method: "POST", body: form });
}, wedding.id, fs.readFileSync(logoFile).toString("base64"));
await api(setup, `/api/admin/events/${wedding.id}`, { qrStyle: { modules: "rounded", eyes: "rounded", eyeColor: "#1a1b1d", logo: true, logoScale: 0.24, label: "Scan me, take a photo" } }, "PATCH");

for (const theme of ["light", "dark"]) {
  // Guest phone, with four prints sent.
  const guest = await page({ theme, width: 390, height: 844, scale: 3, mobile: true });
  await guest.goto(`${base}/e/${wedding.slug}`, { waitUntil: "networkidle0" });
  await sleep(500);
  await guest.evaluate(async (slug, photos) => {
    await fetch(`/api/e/${slug}/guest`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Nora" }) });
    for (const b64 of photos) {
      const form = new FormData();
      form.append("photo", new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: "image/jpeg" }), "p.jpg");
      await fetch(`/api/e/${slug}/photos`, { method: "POST", body: form });
    }
  }, wedding.slug, photos.slice(theme === "light" ? 0 : 4, theme === "light" ? 4 : 8));
  await guest.goto(`${base}/e/${wedding.slug}`, { waitUntil: "networkidle0" });
  await sleep(800);
  await webp(await framePhone(await guest.screenshot()), `guest-${theme}`);

  // Access-code screen, in the album's language (Italian).
  const coded = await page({ theme, width: 390, height: 844, scale: 3, mobile: true, lang: "en" });
  await coded.goto(`${base}/e/${festa.slug}`, { waitUntil: "networkidle0" });
  await sleep(600);
  await webp(await framePhone(await coded.screenshot()), `code-${theme}`);

  // Admin views on a laptop.
  const desk = await page({ theme, width: 1280, height: 860, scale: 2, admin: true });
  await desk.goto(`${base}/admin/events/${festa.id}`, { waitUntil: "networkidle0" });
  await sleep(800);
  const tiles = await desk.$$("ul[role=list] li button");
  for (const t of tiles.slice(0, 3)) await t.click();
  await sleep(500);
  await webp(await clip(desk, "main", { pad: 0, maxHeight: 520 }), `moderation-${theme}`);

  await desk.goto(`${base}/admin/events/${wedding.id}?tab=share`, { waitUntil: "networkidle0" });
  await sleep(1200);
  const designer = await desk.evaluateHandle(() => [...document.querySelectorAll("main div")].find((d) => d.className.includes("grid gap-8") && d.textContent.includes("QR code design")));
  await desk.evaluate((el) => el.setAttribute("data-shot", "qr"), designer);
  await webp(await clip(desk, "[data-shot=qr]"), `qr-${theme}`);

  await desk.goto(`${base}/admin`, { waitUntil: "networkidle0" });
  await sleep(1000);
  await webp(await clip(desk, "main", { maxHeight: 640 }), `dashboard-${theme}`);
}

// The live wall is black in both themes.
const wall = await page({ theme: "dark", width: 1600, height: 900, scale: 1.5, admin: true });
await wall.goto(`${base}/admin/events/${wedding.id}/wall`, { waitUntil: "networkidle0" });
await sleep(3500);
await webp(await wall.screenshot(), "wall");

await browser.close();
