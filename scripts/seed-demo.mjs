// Fills a running instance with demo events and photos, through the public API
// only, so it exercises exactly what guests and admins do.
// Usage: BASE_URL=http://localhost:3000 ADMIN_PASSWORD=… node scripts/seed-demo.mjs
import { demoPhoto as photo } from "./demo-photos.mjs";

const base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const password = process.env.ADMIN_PASSWORD;
if (!password) throw new Error("ADMIN_PASSWORD is required");

class Client {
  cookies = new Map();
  async request(path, init = {}) {
    const res = await fetch(base + path, {
      ...init,
      headers: { Origin: base, Cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "), ...init.headers },
    });
    for (const header of res.headers.getSetCookie()) {
      const [pair] = header.split(";");
      const i = pair.indexOf("=");
      this.cookies.set(pair.slice(0, i), pair.slice(i + 1));
    }
    if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} → ${res.status} ${await res.text()}`);
    return res.headers.get("content-type")?.includes("json") ? res.json() : res;
  }
  json(path, body, method = "POST") {
    return this.request(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  }
}

const admin = new Client();
await admin.json("/api/admin/login", { password });

const events = [
  { name: "Julie & Thomas", description: "Share your favourite moments of the night!", eventDate: "2026-10-17", captureMode: "both", accentColor: "#ffc72c", guests: ["Camille", "Hugo", "Léa", "Marco", "Sofia", null], perGuest: 4 },
  { name: "Festa di Marco", description: "Scatta, invia, guardala sul maxischermo.", eventDate: "2026-07-03", captureMode: "camera", accentColor: "#1d4ed8", defaultLocale: "it", maxPhotosPerGuest: 10, moderation: "pre", accessCode: "SUMMER26", guests: ["Nina", "Paul"], perGuest: 3 },
];

let n = 0;
for (const { guests, perGuest, accessCode, ...input } of events) {
  const { event } = await admin.json("/api/admin/events", { ...input, accessCode });
  for (const name of guests) {
    const guest = new Client();
    if (accessCode) await guest.json(`/api/e/${event.slug}/unlock`, { code: accessCode });
    else await guest.request(`/api/e/${event.slug}/join`, { method: "POST" });
    if (name) await guest.json(`/api/e/${event.slug}/guest`, { name });
    for (let k = 0; k < perGuest; k++) {
      const form = new FormData();
      form.append("photo", new Blob([await photo(n++)], { type: "image/jpeg" }), "photo.jpg");
      await guest.request(`/api/e/${event.slug}/photos`, { method: "POST", body: form });
    }
  }
  console.log(`${event.name}: ${base}/e/${event.slug}  (${guests.length * perGuest} photos)`);
}
