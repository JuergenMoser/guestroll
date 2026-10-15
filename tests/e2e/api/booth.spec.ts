import { expect, test } from "@playwright/test";
import { admin, client, createEvent, photo } from "../helpers";

const upload = async (api: Awaited<ReturnType<typeof client>>, slug: string) =>
  (await api.post(`/api/e/${slug}/photos`, { multipart: { photo: { name: "p.jpg", mimeType: "image/jpeg", buffer: await photo() } } })).status();

test.describe("photo booth", () => {
  test("only its current link sets a device up, and the booth has no per-guest limit", async ({ baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host, { maxPhotosPerGuest: 1, accessCode: "secret-code-1" });
    const booth = await client(baseURL!);
    // Off: no key works.
    expect((await booth.post(`/api/e/${event.slug}/booth`, { data: { key: "x".repeat(24) } })).status()).toBe(403);

    const { boothKey } = await (await host.post(`/api/admin/events/${event.id}/booth`)).json();
    expect(boothKey).toMatch(/^[a-z0-9]{24}$/);
    expect((await booth.post(`/api/e/${event.slug}/booth`, { data: { key: boothKey.slice(0, -1) + "x" } })).status()).toBe(403);
    // The booth link opens a locked event without its access code.
    expect((await booth.post(`/api/e/${event.slug}/booth`, { data: { key: boothKey } })).status()).toBe(200);
    for (let i = 0; i < 3; i++) expect(await upload(booth, event.slug)).toBe(201);

    // A new link: the old booth is a plain guest again, quota included.
    const renewed = (await (await host.post(`/api/admin/events/${event.id}/booth`)).json()).boothKey;
    expect(renewed).not.toBe(boothKey);
    expect(await upload(booth, event.slug)).toBe(403);
    expect((await booth.get(`/e/${event.slug}/booth?key=${boothKey}`)).status()).toBe(200);
    expect(await (await booth.get(`/e/${event.slug}/booth?key=${boothKey}`)).text()).toContain("turned off or was replaced");

    // Off again, and a duplicated event never inherits the key.
    const copy = (await (await host.post(`/api/admin/events/${event.id}/duplicate`, { data: { name: "Copy" } })).json()).event;
    expect(copy.boothKey).toBeNull();
    expect((await host.delete(`/api/admin/events/${event.id}/booth`)).status()).toBe(200);
    expect((await booth.post(`/api/e/${event.slug}/booth`, { data: { key: renewed } })).status()).toBe(403);
  });
});
