import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { ADMIN_PASSWORD, admin, client, createEvent, joinAndUpload } from "../helpers";

test.describe("admin API", () => {
  test("every admin route refuses an anonymous visitor", async ({ baseURL }) => {
    const anon = await client(baseURL!);
    for (const path of ["/api/admin/events", "/api/admin/stats"]) expect((await anon.get(path)).status()).toBe(401);
    expect((await anon.post("/api/admin/events", { data: { name: "x" } })).status()).toBe(401);
    expect((await anon.post("/api/admin/password", { data: {} })).status()).toBe(401);
  });

  test("login checks the password and logout ends the session", async ({ baseURL }) => {
    const api = await client(baseURL!);
    expect((await api.post("/api/admin/login", { data: { password: "wrong" } })).status()).toBe(401);
    expect((await api.post("/api/admin/login", { data: { password: ADMIN_PASSWORD } })).status()).toBe(200);
    expect((await api.get("/api/admin/events")).status()).toBe(200);
    await api.post("/api/admin/logout");
    expect((await api.get("/api/admin/events")).status()).toBe(401);
  });

  test("the password is managed by ADMIN_PASSWORD here, so it can't be changed", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const res = await host.post("/api/admin/password", { data: { current: ADMIN_PASSWORD, next: "another-long-password" } });
    expect(res.status()).toBe(403);
  });

  test("events are validated, created, updated and deleted", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const bad = await host.post("/api/admin/events", { data: { name: "x", accentColor: "red", accessCode: "123" } });
    expect(bad.status()).toBe(400);
    expect(Object.keys((await bad.json()).details).sort()).toEqual(["accentColor", "accessCode", "name"]);

    const event = await createEvent(host, { name: "Summer party", defaultLocale: "it" });
    const patched = await host.patch(`/api/admin/events/${event.id}`, { data: { description: "Ciao", maxPhotosPerGuest: 5 } });
    expect((await patched.json()).event).toMatchObject({ description: "Ciao", maxPhotosPerGuest: 5, defaultLocale: "it" });

    const list = (await (await host.get("/api/admin/events")).json()).events;
    expect(list.some((e: { id: string }) => e.id === event.id)).toBe(true);

    expect((await host.delete(`/api/admin/events/${event.id}`)).status()).toBe(200);
    expect((await host.get(`/api/admin/events/${event.id}`)).status()).toBe(404);
  });

  test("a new link makes the old QR code useless", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host);
    const rotated = (await (await host.post(`/api/admin/events/${event.id}/rotate`)).json()).event;
    expect(rotated.slug).not.toBe(event.slug);
    const guest = await client(baseURL!);
    expect((await guest.post(`/api/e/${event.slug}/join`)).status()).toBe(404);
    expect((await guest.post(`/api/e/${rotated.slug}/join`)).status()).toBe(200);
  });

  test("QR codes export as PNG at the asked size and as SVG", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host);
    const png = await host.get(`/api/admin/events/${event.id}/qr?size=512`);
    expect(png.headers()["content-type"]).toBe("image/png");
    expect((await sharp(await png.body()).metadata()).width).toBe(512);
    const svg = await host.get(`/api/admin/events/${event.id}/qr?format=svg&download=1`);
    expect(svg.headers()["content-type"]).toBe("image/svg+xml");
    expect(svg.headers()["content-disposition"]).toContain("attachment");
    expect(await svg.text()).toMatch(/^<svg /);
  });

  test("a logo must be a raster image, and is then public with the slug", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host);
    const svg = await host.post(`/api/admin/events/${event.id}/logo`, {
      multipart: { logo: { name: "x.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>') } },
    });
    expect(svg.status()).toBe(415);
    const png = await sharp({ create: { width: 200, height: 200, channels: 4, background: "#ffc72c" } }).png().toBuffer();
    const ok = await host.post(`/api/admin/events/${event.id}/logo`, { multipart: { logo: { name: "l.png", mimeType: "image/png", buffer: png } } });
    const version = (await ok.json()).event.logoVersion;
    expect(version).toBeGreaterThan(0);
    const anon = await client(baseURL!);
    const logo = await anon.get(`/api/e/${event.slug}/logo?v=${version}`);
    expect(logo.status()).toBe(200);
    expect(logo.headers()["content-type"]).toBe("image/png");
    expect((await host.delete(`/api/admin/events/${event.id}/logo`)).ok()).toBe(true);
    expect((await anon.get(`/api/e/${event.slug}/logo?v=${version}`)).status()).toBe(404);
  });

  test("the ZIP holds the visible photos, or all of them with ?all=1", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host);
    const guest = await client(baseURL!);
    const ids = await joinAndUpload(guest, event.slug, 3);
    await host.post(`/api/admin/events/${event.id}/photos`, { data: { action: "hide", ids: [ids[0]] } });
    const count = (zip: Buffer) => {
      let n = 0;
      for (let i = 0; i < zip.length - 4; i++) if (zip.readUInt32LE(i) === 0x02014b50) n++;
      return n;
    };
    const visible = await host.get(`/api/admin/events/${event.id}/archive`);
    expect(visible.headers()["content-type"]).toBe("application/zip");
    expect(count(await visible.body())).toBe(2);
    expect(count(await (await host.get(`/api/admin/events/${event.id}/archive?all=1`)).body())).toBe(3);
    expect((await guest.get(`/api/admin/events/${event.id}/archive`)).status()).toBe(401);
  });

  test("bulk delete removes photos for good", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host);
    const guest = await client(baseURL!);
    const ids = await joinAndUpload(guest, event.slug, 2);
    const res = await host.post(`/api/admin/events/${event.id}/photos`, { data: { action: "delete", ids } });
    expect((await res.json()).changed).toBe(2);
    expect((await host.get(`/api/media/${ids[0]}?v=original`)).status()).toBe(404);
    expect((await host.post(`/api/admin/events/${event.id}/photos`, { data: { action: "explode", ids } })).status()).toBe(400);
  });

  test("stats count uploads, guests and views", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host);
    await joinAndUpload(await client(baseURL!), event.slug, 2);
    await joinAndUpload(await client(baseURL!), event.slug, 1);
    const stats = await (await host.get(`/api/admin/stats?eventId=${event.id}`)).json();
    expect(stats.totals).toMatchObject({ photos: 3, guests: 2 });
    expect((await host.get(`/api/admin/stats?eventId=00000000-0000-0000-0000-000000000000`)).status()).toBe(404);
  });
});
