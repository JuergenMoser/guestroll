// Fills a running instance with demo events and photos, through the public API
// only, so it exercises exactly what guests and admins do.
// Usage: BASE_URL=http://localhost:3000 ADMIN_PASSWORD=… node scripts/seed-demo.mjs
import sharp from "sharp";

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

const PALETTES = [
  ["#f59e0b", "#7c2d12"], ["#fb7185", "#4c0519"], ["#38bdf8", "#172554"], ["#a3e635", "#14532d"],
  ["#fbbf24", "#451a03"], ["#c084fc", "#2e1065"], ["#f97316", "#1c1917"], ["#2dd4bf", "#042f2e"],
];

function photo(i) {
  const [a, b] = PALETTES[i % PALETTES.length];
  const portrait = i % 3 === 1;
  const [w, h] = portrait ? [1200, 1600] : [1600, 1200];
  const bokeh = Array.from({ length: 14 }, (_, k) => {
    const x = (k * 397 + i * 131) % w;
    const y = (k * 211 + i * 89) % h;
    const r = 30 + ((k * 53 + i * 17) % 110);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="white" opacity="${0.05 + (k % 5) * 0.03}"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><radialGradient id="g" cx="${25 + (i * 17) % 50}%" cy="${30 + (i * 23) % 40}%" r="80%">
      <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>${bokeh}</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
}

const admin = new Client();
await admin.json("/api/admin/login", { password });

const events = [
  { name: "Julie & Thomas", description: "Share your favourite moments of the night!", eventDate: "2026-10-17", captureMode: "both", accentColor: "#f59e0b", guests: ["Camille", "Hugo", "Léa", "Marco", "Sofia", null], perGuest: 4 },
  { name: "Acme summer party", description: "Snap it, send it, see it on the big screen.", eventDate: "2026-07-03", captureMode: "camera", accentColor: "#38bdf8", moderation: "pre", accessCode: "SUMMER26", guests: ["Nina", "Paul"], perGuest: 3 },
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
