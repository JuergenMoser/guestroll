import { expect, test } from "@playwright/test";
import { admin, client, createEvent, joinAndUpload, photo } from "../helpers";

test.describe("guest API", () => {
  test("health check answers", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  test("an unknown event is a 404, page and API alike", async ({ baseURL }) => {
    const api = await client(baseURL!);
    expect((await api.get("/e/nope-12345678")).status()).toBe(404);
    expect((await api.post("/api/e/nope-12345678/join")).status()).toBe(404);
  });

  test("a guest uploads and sees only their own photos", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host);
    const alice = await client(baseURL!);
    const bob = await client(baseURL!);
    const [alicePhoto] = await joinAndUpload(alice, event.slug, 1);
    await joinAndUpload(bob, event.slug, 2);

    const aliceList = (await (await alice.get(`/api/e/${event.slug}/photos`)).json()).photos;
    expect(aliceList.map((p: { id: string }) => p.id)).toEqual([alicePhoto]);
    expect(aliceList[0]).toMatchObject({ mine: true, status: "visible" });
    expect(aliceList[0]).not.toHaveProperty("guestId");

    const bobList = (await (await bob.get(`/api/e/${event.slug}/photos`)).json()).photos;
    expect(bobList).toHaveLength(2);
  });

  test("media is served to its owner and the admin only", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host);
    const alice = await client(baseURL!);
    const bob = await client(baseURL!);
    const stranger = await client(baseURL!);
    const [id] = await joinAndUpload(alice, event.slug, 1);
    await bob.post(`/api/e/${event.slug}/join`);

    const own = await alice.get(`/api/media/${id}?v=thumb`);
    expect(own.status()).toBe(200);
    expect(own.headers()["content-type"]).toBe("image/webp");
    expect(own.headers()["cache-control"]).toContain("private");

    for (const variant of ["thumb", "display", "original"]) {
      expect((await bob.get(`/api/media/${id}?v=${variant}`)).status()).toBe(404);
      expect((await stranger.get(`/api/media/${id}?v=${variant}`)).status()).toBe(404);
    }
    expect((await host.get(`/api/media/${id}?v=original`)).status()).toBe(200);
    expect((await alice.get(`/api/media/${id}?v=../../etc/passwd`)).status()).toBe(400);
    expect((await alice.get(`/api/media/not-a-uuid?v=thumb`)).status()).toBe(404);
  });

  test("a download is an attachment and is counted", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host);
    const alice = await client(baseURL!);
    const [id] = await joinAndUpload(alice, event.slug, 1);
    const res = await alice.get(`/api/media/${id}?v=original&download=1`);
    expect(res.headers()["content-disposition"]).toContain("attachment");
    expect(res.headers()["cache-control"]).toContain("no-store");
    const list = (await (await host.get(`/api/admin/events/${event.id}/photos`)).json()).photos;
    expect(list[0].downloads).toBe(1);
  });

  test("cross-site requests are refused", async ({ baseURL, playwright }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host);
    const noOrigin = await playwright.request.newContext({ baseURL });
    expect((await noOrigin.post(`/api/e/${event.slug}/join`)).status()).toBe(403);
    const evil = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: "https://evil.example" } });
    expect((await evil.post(`/api/e/${event.slug}/join`)).status()).toBe(403);
    expect((await evil.post("/api/admin/login", { data: { password: "x" } })).status()).toBe(403);
  });

  test("an access code is required before anything, and checked", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host, { accessCode: "letmein-2026" });
    const guest = await client(baseURL!);
    expect((await guest.post(`/api/e/${event.slug}/join`)).status()).toBe(403);
    const early = await guest.post(`/api/e/${event.slug}/photos`, { multipart: { photo: { name: "p.jpg", mimeType: "image/jpeg", buffer: await photo() } } });
    expect(early.status()).toBe(403);
    expect((await guest.post(`/api/e/${event.slug}/unlock`, { data: { code: "wrong-code" } })).status()).toBe(401);
    expect((await guest.post(`/api/e/${event.slug}/unlock`, { data: { code: "letmein-2026" } })).status()).toBe(200);
    const late = await guest.post(`/api/e/${event.slug}/photos`, { multipart: { photo: { name: "p.jpg", mimeType: "image/jpeg", buffer: await photo() } } });
    expect(late.status()).toBe(201);
  });

  test("the per-guest quota is enforced", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host, { maxPhotosPerGuest: 2 });
    const guest = await client(baseURL!);
    await joinAndUpload(guest, event.slug, 2);
    const third = await guest.post(`/api/e/${event.slug}/photos`, { multipart: { photo: { name: "p.jpg", mimeType: "image/jpeg", buffer: await photo() } } });
    expect(third.status()).toBe(403);
    expect((await third.json()).error).toBe("quota_reached");
  });

  test("closed uploads, by hand or by schedule, are refused", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const closed = await createEvent(host, { uploadsOpen: false });
    const expired = await createEvent(host, { uploadsCloseAt: Date.now() - 60_000 });
    const guest = await client(baseURL!);
    for (const event of [closed, expired]) {
      await guest.post(`/api/e/${event.slug}/join`);
      const res = await guest.post(`/api/e/${event.slug}/photos`, { multipart: { photo: { name: "p.jpg", mimeType: "image/jpeg", buffer: await photo() } } });
      expect(res.status()).toBe(403);
      expect((await res.json()).error).toBe("uploads_closed");
    }
  });

  test("non-images and oversized files are refused", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host);
    const guest = await client(baseURL!);
    await guest.post(`/api/e/${event.slug}/join`);
    const fake = await guest.post(`/api/e/${event.slug}/photos`, { multipart: { photo: { name: "shell.jpg", mimeType: "image/jpeg", buffer: Buffer.from("<?php system($_GET['c']); ?>") } } });
    expect(fake.status()).toBe(415);
    const big = await guest.post(`/api/e/${event.slug}/photos`, { multipart: { photo: { name: "big.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(3 * 1024 * 1024, 1) } } });
    expect(big.status()).toBe(413);
    const empty = await guest.post(`/api/e/${event.slug}/photos`, { multipart: { other: "x" } });
    expect(empty.status()).toBe(400);
  });

  test("with pre-moderation, guests keep seeing their pending photo until it's hidden", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host, { moderation: "pre" });
    const guest = await client(baseURL!);
    const [id] = await joinAndUpload(guest, event.slug, 1);
    let list = (await (await guest.get(`/api/e/${event.slug}/photos`)).json()).photos;
    expect(list[0].status).toBe("pending");

    expect((await host.post(`/api/admin/events/${event.id}/photos`, { data: { action: "approve", ids: [id] } })).ok()).toBe(true);
    list = (await (await guest.get(`/api/e/${event.slug}/photos`)).json()).photos;
    expect(list[0].status).toBe("visible");

    await host.post(`/api/admin/events/${event.id}/photos`, { data: { action: "hide", ids: [id] } });
    expect((await (await guest.get(`/api/e/${event.slug}/photos`)).json()).photos).toEqual([]);
    expect((await guest.get(`/api/media/${id}?v=thumb`)).status()).toBe(404);
  });

  test("the guest's name is attached to their photos", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host);
    const guest = await client(baseURL!);
    await guest.post(`/api/e/${event.slug}/join`);
    expect((await guest.post(`/api/e/${event.slug}/guest`, { data: { name: "  Léa\n " } })).ok()).toBe(true);
    await joinAndUpload(guest, event.slug, 1);
    const list = (await (await host.get(`/api/admin/events/${event.id}/photos`)).json()).photos;
    expect(list[0].guestName).toBe("Léa");
    expect((await guest.post(`/api/e/${event.slug}/guest`, { data: { name: "" } })).status()).toBe(400);
  });
});

test.describe("taking a photo back", () => {
  test("a guest deletes their own photos, never anyone else's, and gets the slot back", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host, { maxPhotosPerGuest: 1 });
    const alice = await client(baseURL!);
    const bob = await client(baseURL!);
    const [mine] = await joinAndUpload(alice, event.slug, 1);
    await bob.post(`/api/e/${event.slug}/join`);

    expect((await bob.delete(`/api/e/${event.slug}/photos/${mine}`)).status()).toBe(404);
    expect((await client(baseURL!).then((c) => c.delete(`/api/e/${event.slug}/photos/${mine}`))).status()).toBe(404);
    const crossSite = await alice.delete(`/api/e/${event.slug}/photos/${mine}`, { headers: { Origin: "https://evil.example" } });
    expect(crossSite.status()).toBe(403);

    expect((await alice.delete(`/api/e/${event.slug}/photos/${mine}`)).status()).toBe(200);
    expect((await host.get(`/api/media/${mine}?v=original`)).status()).toBe(404);
    expect((await (await host.get(`/api/admin/events/${event.id}/photos`)).json()).photos).toHaveLength(0);
    // The quota of one counts what's kept: Alice can send another.
    await joinAndUpload(alice, event.slug, 1);
  });
});
