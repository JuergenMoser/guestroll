// Captures the raw README screenshots from a running, seeded instance (see docs/development.md).
// Usage: CHROME_PATH=/usr/bin/google-chrome node scripts/brand/capture-screenshots.mjs <base> <password> <slug> <eventId> <out> <photos-dir>
import fs from "node:fs";
import puppeteer from "puppeteer-core";
const [base, password, slug, eventId, out, imgDir] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox", "--hide-scrollbars"] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function context(theme) {
  const c = await browser.createBrowserContext();
  const page = await c.newPage();
  await page.setExtraHTTPHeaders({ "Accept-Language": "en" });
  await page.goto(base + "/api/health");
  await c.setCookie({ name: "gr_theme", value: theme, domain: "localhost", path: "/" });
  return page;
}

// Guest: join, sign, send five photos, then shoot the page on a phone.
const guest = await context("light");
await guest.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await guest.goto(`${base}/e/${slug}`, { waitUntil: "networkidle0" });
await sleep(800);
const photos = fs.readdirSync(imgDir).filter((f) => f.endsWith(".jpg")).slice(0, 5).map((f) => fs.readFileSync(`${imgDir}/${f}`).toString("base64"));
await guest.evaluate(async (slug, photos) => {
  await fetch(`/api/e/${slug}/guest`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Nora" }) });
  for (const b64 of photos) {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const form = new FormData();
    form.append("photo", new Blob([bytes], { type: "image/jpeg" }), "photo.jpg");
    await fetch(`/api/e/${slug}/photos`, { method: "POST", body: form });
  }
}, slug, photos);
await guest.goto(`${base}/e/${slug}`, { waitUntil: "networkidle0" });
await sleep(1200);
await guest.screenshot({ path: `${out}/guest.png` });
await guest.screenshot({ path: `${out}/guest-full.png`, fullPage: true });

const guestDark = await context("dark");
await guestDark.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await guestDark.goto(`${base}/e/${slug}`, { waitUntil: "networkidle0" });
await guestDark.evaluate((slug) => localStorage.setItem(`guestroll:skip-name:${slug}`, "1"), slug);
await guestDark.goto(`${base}/e/${slug}`, { waitUntil: "networkidle0" });
await sleep(800);
await guestDark.screenshot({ path: `${out}/guest-dark.png` });

// Admin screens on a laptop.
const admin = await context("light");
await admin.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await admin.evaluate((pw) => fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) }), password);
for (const [name, path] of [["dashboard", "/admin"], ["moderation", `/admin/events/${eventId}?tab=photos`], ["share", `/admin/events/${eventId}?tab=share`], ["settings", `/admin/events/${eventId}?tab=settings`]]) {
  await admin.goto(base + path, { waitUntil: "networkidle0" });
  await sleep(1000);
  if (name === "moderation") {
    const tiles = await admin.$$("ul[role=list] li button");
    for (const tile of tiles.slice(1, 4)) await tile.click();
    await sleep(400);
  }
  await admin.screenshot({ path: `${out}/${name}.png` });
}
const adminDark = await context("dark");
await adminDark.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await adminDark.evaluate((pw) => fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) }), password);
await adminDark.goto(`${base}/admin`, { waitUntil: "networkidle0" });
await sleep(800);
await adminDark.screenshot({ path: `${out}/dashboard-dark.png` });

await admin.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1.5 });
await admin.goto(`${base}/admin/events/${eventId}/wall`, { waitUntil: "networkidle0" });
await sleep(3000);
await admin.screenshot({ path: `${out}/wall.png` });

await browser.close();
console.log("done");
